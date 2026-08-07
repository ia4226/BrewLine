# SimPy Discrete Event Simulation Skill

This skill scaffolds Discrete Event Simulation (DES) models using SimPy for operational queuing systems and digital twin applications.

## Core Rules & Architecture

1. **System Resources:**
   - Model capacity using `simpy.Resource`, `simpy.Container`, or `simpy.Store`.
   - Maintain trackable queues for waiting entities.

2. **Stochastic Processes:**
   - Use `random.expovariate` for exponential interarrival rates ($\lambda$) and service times ($\mu$).

3. **Time-Series Tracking:**
   - Implement state recording (`track_state`) on every process arrival, service start, and service completion.
   - Always capture `time`, `queue_length`, active capacity, and Work In Progress (`WIP = queue_length + active_capacity`).

4. **Multi-Replication Averaging:**
   - Always execute $\ge 10$ replications per parameter set to average out random variance.
   - Compute aggregate operational KPIs:
     - **Utilization:** Percentage of server capacity utilized.
     - **Throughput:** Completed entities per unit time.
     - **$C_{\max}$:** Total simulation duration.
     - **Average & Max Wait Times:** Queuing delay per entity.
     - **Average Queue Length & Average WIP:** System congestion metrics.

5. **JSON Export Standard:**
   - Standardize output structure containing `params`, aggregated `kpis`, and `sample_time_series`.
   - Export directly to `../frontend/public/sim_results.json` for frontend dashboard rendering.'
   