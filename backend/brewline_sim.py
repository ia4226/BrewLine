import os
import json
import random
import statistics
import simpy

class BrewLineSim:
    def __init__(self, env, num_baristas, arrival_rate, mean_service_time):
        self.env = env
        self.baristas = simpy.Resource(env, capacity=num_baristas)
        self.arrival_rate = arrival_rate
        self.mean_service_time = mean_service_time
        
        self.wait_times = []
        self.system_times = []
        self.time_series = []
        self.busy_time = 0.0
        self.completed_customers = 0

    def track_state(self):
        wip = len(self.baristas.queue) + self.baristas.count
        self.time_series.append({
            "time": round(self.env.now, 2),
            "queue_length": len(self.baristas.queue),
            "wip": wip,
            "active_baristas": self.baristas.count
        })

    def customer(self, name):
        arrival_time = self.env.now
        self.track_state()
        
        with self.baristas.request() as req:
            yield req
            wait_time = self.env.now - arrival_time
            self.wait_times.append(wait_time)
            
            service_duration = random.expovariate(1.0 / self.mean_service_time)
            self.busy_time += service_duration
            self.track_state()
            
            yield self.env.timeout(service_duration)
            
            self.completed_customers += 1
            self.system_times.append(self.env.now - arrival_time)
            self.track_state()

    def run_arrivals(self, sim_duration):
        i = 0
        while self.env.now < sim_duration:
            interarrival = random.expovariate(self.arrival_rate)
            yield self.env.timeout(interarrival)
            i += 1
            self.env.process(self.customer(f"Customer_{i}"))

def run_replication(num_baristas, arrival_rate, mean_service_time, sim_duration):
    env = simpy.Environment()
    sim = BrewLineSim(env, num_baristas, arrival_rate, mean_service_time)
    env.process(sim.run_arrivals(sim_duration))
    env.run(until=sim_duration)
    
    c_max = env.now
    utilization = min(1.0, sim.busy_time / (num_baristas * c_max)) if c_max > 0 else 0
    throughput = sim.completed_customers / c_max if c_max > 0 else 0
    avg_wait = statistics.mean(sim.wait_times) if sim.wait_times else 0
    max_wait = max(sim.wait_times) if sim.wait_times else 0
    avg_queue = statistics.mean([t["queue_length"] for t in sim.time_series]) if sim.time_series else 0
    avg_wip = statistics.mean([t["wip"] for t in sim.time_series]) if sim.time_series else 0

    return {
        "kpis": {
            "utilization": round(utilization * 100, 2),
            "throughput": round(throughput, 3),
            "c_max": round(c_max, 2),
            "avg_wait": round(avg_wait, 2),
            "max_wait": round(max_wait, 2),
            "avg_queue_length": round(avg_queue, 2),
            "avg_wip": round(avg_wip, 2)
        },
        "time_series": sim.time_series
    }

def run_simulation(num_baristas=2, arrival_rate=1.5, mean_service_time=1.0, sim_duration=480, replications=10):
    results = [run_replication(num_baristas, arrival_rate, mean_service_time, sim_duration) for _ in range(replications)]
    
    aggregated_kpis = {
        key: round(statistics.mean([r["kpis"][key] for r in results]), 2)
        for key in results[0]["kpis"]
    }

    output = {
        "params": {
            "num_baristas": num_baristas,
            "arrival_rate": arrival_rate,
            "mean_service_time": mean_service_time,
            "sim_duration": sim_duration,
            "replications": replications
        },
        "kpis": aggregated_kpis,
        "sample_time_series": results[0]["time_series"]
    }

    output_path = "../frontend/public/sim_results.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Clean write to avoid broken/partial files
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    
    print("Simulation complete! Clean JSON generated in frontend/public/sim_results.json")

if __name__ == "__main__":
    run_simulation()