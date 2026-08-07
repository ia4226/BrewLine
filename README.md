# BrewLine Digital Twin ☕

A Discrete Event Simulation (DES) digital twin built with **Python (SimPy + FastAPI)** and **React (Vite + Tailwind CSS + Recharts)** modeling an $M/M/c$ queue system for coffee shop operations.

---

## 🌟 Key Features
- **SimPy DES Engine:** Stochastic discrete-event modeling with Poisson arrivals ($\lambda$) and Exponential service times ($\mu$).
- **Live Re-Simulation API:** FastAPI backend executing 10 independent replications in real time upon knob adjustment.
- **Animated Digital Twin Canvas:** Real-time visual floor plan showing live customer queues and active barista service counters.
- **Speed-Controlled Playback Engine:** Time-stepping simulation animation ($1\times, 5\times, 10\times, 25\times, 50\times$).
- **Traffic Intensity ($\rho$) Monitor:** Real-time stability indicator detecting overloaded queues ($\rho \ge 100\%$).

---

## 📐 Queueing Theory Foundations ($M/M/c$)
Traffic intensity ($\rho$) governs queue growth:

$$\rho = \frac{\lambda}{c \cdot \mu}$$

- **$\rho < 85\%$:** Stable operational state with low customer wait times.
- **$85\% \le \rho < 100\%$:** Congested queue state with elevated wait times.
- **$\rho \ge 100\%$:** Unstable state where arrivals outpace capacity, causing infinite queue growth.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn server:app --reload --port 8000