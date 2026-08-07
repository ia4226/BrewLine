from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import statistics
import json
from brewline_sim import run_replication

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimRequest(BaseModel):
    num_baristas: int
    arrival_rate: float
    mean_service_time: float
    sim_duration: float = 480.0
    replications: int = 10

@app.post("/api/simulate")
def simulate(req: SimRequest):
    results = [
        run_replication(req.num_baristas, req.arrival_rate, req.mean_service_time, req.sim_duration)
        for _ in range(req.replications)
    ]
    
    aggregated_kpis = {
        key: round(statistics.mean([r["kpis"][key] for r in results]), 2)
        for key in results[0]["kpis"]
    }

    output = {
        "params": req.dict(),
        "kpis": aggregated_kpis,
        "sample_time_series": results[0]["time_series"]
    }

    try:
        with open("../frontend/public/sim_results.json", "w") as f:
            json.dump(output, f, indent=2)
    except Exception:
        pass

    return output