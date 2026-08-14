import os
import json
from pathlib import Path
from fastmcp import FastMCP

# Project root directory
BASE_DIR = Path(__file__).resolve().parent

mcp = FastMCP("azure-twinai")

def load_local_sim_results() -> dict:
    """Helper to locate sim_results.json reliably."""
    target_file = BASE_DIR / "frontend" / "public" / "sim_results.json"
    if target_file.exists():
        try:
            with open(target_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            return {"error": f"Failed to parse JSON: {str(e)}"}
    return {"error": f"File not found at {target_file}"}

# --- MCP TOOLS ---

@mcp.tool()
def get_simulation_kpis() -> dict:
    """Retrieve the current Discrete Event Simulation KPIs (Utilization, Wait Time, Throughput)."""
    data = load_local_sim_results()
    return data.get("kpis", data)

@mcp.tool()
def get_simulation_params() -> dict:
    """Retrieve the active simulation input knobs (Baristas, Arrival Rate, Service Time)."""
    data = load_local_sim_results()
    return data.get("params", data)

@mcp.tool()
def list_azure_blobs(container_name: str = "simulation-data") -> list[str]:
    """List available data blobs stored in Azure Blob Storage."""
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_str:
        return ["sim_results.json", "company_sop_policy.txt", "daily_operations_log.csv"]
    
    try:
        from azure.storage.blob import BlobServiceClient
        blob_service_client = BlobServiceClient.from_connection_string(conn_str)
        container_client = blob_service_client.get_container_client(container_name)
        return [blob.name for blob in container_client.list_blobs()]
    except Exception as e:
        return [f"Azure fallback list (Error: {str(e)})", "sim_results.json"]

if __name__ == "__main__":
    mcp.run()