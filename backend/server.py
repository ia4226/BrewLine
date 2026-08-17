import os
import json
import statistics
import logging
import numpy as np
import faiss
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from openai import AzureOpenAI
from fastembed import TextEmbedding
from brewline_sim import run_replication

# 1. Initialize Logging & Azure Application Insights (MUST run before FastAPI instance creation)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("brewline-server")

app_insights_conn = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
if app_insights_conn:
    try:
        from azure.monitor.opentelemetry import configure_azure_monitor
        configure_azure_monitor(connection_string=app_insights_conn)
        logger.info("Azure Application Insights telemetry enabled successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Application Insights: {e}")
else:
    logger.info("APPLICATIONINSIGHTS_CONNECTION_STRING not set. Running with local logging.")

# 2. Initialize Single FastAPI App Instance
app = FastAPI(title="BrewLine Digital Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Initialize Azure OpenAI Client
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_key = os.getenv("AZURE_OPENAI_KEY")
deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1-mini")

client = None
if endpoint and api_key:
    client = AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version="2024-08-01-preview"
    )

# 4. Local RAG Setup (Knowledge Base + FastEmbed + FAISS)
KNOWLEDGE_BASE = [
    "Standard operating procedure: Target customer wait time must remain under 3.0 minutes.",
    "Staffing policy: If barista utilization exceeds 80%, add 1 barista to shift roster.",
    "Efficiency metric: Ideal barista utilization target is between 65% and 75%.",
    "Customer service standard: If queue wait time exceeds 5 minutes, open an auxiliary espresso machine."
]

embedder = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
doc_embeddings = np.array(list(embedder.embed(KNOWLEDGE_BASE)), dtype="float32")

dimension = doc_embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(doc_embeddings)

def retrieve_policy_context(query: str, top_k: int = 2) -> str:
    query_vector = np.array(list(embedder.embed([query])), dtype="float32")
    _, indices = index.search(query_vector, top_k)
    retrieved_docs = [KNOWLEDGE_BASE[i] for i in indices[0] if i < len(KNOWLEDGE_BASE)]
    return "\n".join(retrieved_docs)

# 5. Request Schemas
class SimRequest(BaseModel):
    num_baristas: int
    arrival_rate: float
    mean_service_time: float
    sim_duration: float = 480.0
    replications: int = 10

class InsightRequest(BaseModel):
    kpis: dict
    params: dict

# 6. Route Handlers
@app.post("/api/simulate")
def simulate(req: SimRequest):
    logger.info(f"Running simulation with params: {req.dict()}")
    # Run simulation replications
    results = [
        run_replication(req.num_baristas, req.arrival_rate, req.mean_service_time, req.sim_duration)
        for _ in range(req.replications)
    ]
    
    # Helper function to safely extract and average nested KPI keys across replications
    def get_avg_kpi(key_names, default=0.0):
        if not isinstance(key_names, list):
            key_names = [key_names]
        
        extracted_vals = []
        for r in results:
            kpis = r.get("kpis", {})
            for key in key_names:
                if key in kpis:
                    extracted_vals.append(kpis[key])
                    break
        
        if not extracted_vals:
            return default
        return statistics.mean(extracted_vals)

    # Compute raw KPI values
    raw_utilization = get_avg_kpi(["utilization", "barista_utilization"])
    utilization_pct = raw_utilization * 100 if raw_utilization <= 1.0 else raw_utilization

    # Map keys directly to what App.jsx renders in the frontend
    aggregated_kpis = {
        "utilization": round(utilization_pct, 2),
        "throughput": round(get_avg_kpi(["throughput", "system_throughput"]), 2),
        "avg_wait": round(get_avg_kpi(["avg_wait", "avg_wait_time", "mean_wait_time"]), 2),
        "max_wait": round(get_avg_kpi(["max_wait", "max_wait_time"]), 2),
        "avg_queue_length": round(get_avg_kpi(["avg_queue_length", "mean_queue_length", "queue_length"]), 2),
        "avg_wip": round(get_avg_kpi(["avg_wip", "wip", "mean_wip"]), 2),
        "c_max": round(req.sim_duration, 1)
    }

    output = {
        "params": req.dict(),
        "kpis": aggregated_kpis,
        "sample_time_series": results[0].get("time_series", [])
    }

    # Persist snapshot for static fallback
    for target_dir in ["frontend/dist", "frontend/public"]:
        try:
            os.makedirs(target_dir, exist_ok=True)
            with open(os.path.join(target_dir, "sim_results.json"), "w") as f:
                json.dump(output, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not persist snapshot to {target_dir}: {e}")

    return output

@app.post("/api/insights")
def generate_insights(req: InsightRequest):
    if not client:
        return {"insight": "Azure OpenAI client is not configured."}
    
    logger.info("Generating insights with Azure OpenAI and RAG context")
    search_query = f"utilization {req.kpis.get('utilization', '')} wait time {req.kpis.get('avg_wait_time', '')}"
    retrieved_context = retrieve_policy_context(search_query)

    prompt = f"""
    You are an operations consultant for Brewline Coffee Shop.
    
    Company SOP & Policy Context (Retrieved via RAG):
    {retrieved_context}

    Simulation Metrics:
    Parameters: {json.dumps(req.params)}
    KPIs: {json.dumps(req.kpis)}

    Provide a concise 3-bullet executive summary aligning the simulation performance with the retrieved company SOP rules.
    """
    
    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "You are a concise operational analytics consultant enforcing company SOPs."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )
        return {"insight": response.choices[0].message.content, "rag_context_used": retrieved_context}
    except Exception as e:
        logger.error(f"Error during OpenAI insights generation: {e}")
        return {"error": str(e)}

# 7. Static File Server
if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

    @app.get("/sim_results.json")
    def get_sim_results():
        json_path = "frontend/dist/sim_results.json"
        if os.path.exists(json_path):
            return FileResponse(json_path)
        default_req = SimRequest(num_baristas=2, arrival_rate=1.5, mean_service_time=3.0)
        return simulate(default_req)

    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        return FileResponse("frontend/dist/index.html")