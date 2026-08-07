import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Play, Pause, RotateCcw, Coffee, Users, Clock, Activity, AlertCircle, Layers, Hourglass, Settings, Sliders, Eye } from 'lucide-react';
import DigitalTwinModal from './components/DigitalTwinModal';

export default function App() {
  const [simData, setSimData] = useState(null);
  const [knobs, setKnobs] = useState({ arrival_rate: 1.5, num_baristas: 2, mean_service_time: 1.0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isTwinOpen, setIsTwinOpen] = useState(false);

  useEffect(() => {
    fetch('/sim_results.json')
      .then((res) => res.json())
      .then((data) => {
        setSimData(data);
        if (data.params) setKnobs(data.params);
      })
      .catch((err) => console.error("Could not load sim_results.json:", err));
  }, []);

  const runBackendSim = async (updatedKnobs) => {
    try {
      const res = await fetch('http://localhost:8000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedKnobs)
      });
      if (res.ok) {
        const data = await res.json();
        setSimData(data);
        setCurrentStep(0);
      }
    } catch (err) {
      console.warn("Backend offline, keeping current view:", err);
    }
  };

  const handleKnobChange = (key, value) => {
    const updated = { ...knobs, [key]: value };
    setKnobs(updated);
    runBackendSim(updated);
  };

  useEffect(() => {
    let timer;
    if (isPlaying && simData && simData.sample_time_series) {
      const intervalMs = Math.max(10, 150 / speedMultiplier);
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= simData.sample_time_series.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, simData, speedMultiplier]);

  if (!simData) {
    return (
      <div className="p-8 text-amber-100 bg-[#120a06] min-h-screen font-sans flex flex-col items-center justify-center">
        <Coffee className="animate-bounce text-amber-500 mb-4" size={48} />
        <p className="text-lg font-medium">Loading simulation workspace...</p>
      </div>
    );
  }

  const serviceRate = knobs.mean_service_time > 0 ? 1 / knobs.mean_service_time : 0;
  const capacity = knobs.num_baristas * serviceRate;
  const rho = capacity > 0 ? (knobs.arrival_rate / capacity) : 0;

  let healthStatus = { label: "Stable System", color: "bg-emerald-950/90 text-emerald-300 border-emerald-700" };
  if (rho >= 1.0) {
    healthStatus = { label: "Overloaded (Unstable)", color: "bg-rose-950/90 text-rose-300 border-rose-700" };
  } else if (rho >= 0.85) {
    healthStatus = { label: "Congested Delay", color: "bg-amber-950/90 text-amber-300 border-amber-700" };
  }

  const currentSeries = simData.sample_time_series ? simData.sample_time_series.slice(0, currentStep + 1) : [];

  return (
    <div className="bg-[#120a06] text-amber-50 min-h-screen p-6 font-sans flex flex-col gap-6">
      
      {/* Top Navigation Header */}
      <header className="bg-[#1e110b] border border-[#3b2317] rounded-2xl p-4 px-6 flex justify-between items-center shadow-md flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-600/20 p-2.5 rounded-xl border border-amber-500/30">
            <Coffee className="text-amber-400" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-300 tracking-wide">BrewLine Digital Twin</h1>
            <p className="text-xs text-amber-200/60">Discrete Event Simulation (DES) Analysis Dashboard</p>
          </div>
        </div>

        {/* Action Controls & Digital Twin Modal Trigger */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsTwinOpen(true)}
            className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Eye size={16} /> OPEN DIGITAL TWIN
          </button>

          {/* Playback Controls */}
          <div className="flex items-center gap-4 bg-[#120a06] px-4 py-2 rounded-xl border border-[#3b2317]">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition shadow"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'PAUSE' : 'PLAY SIMULATION'}
            </button>

            <button 
              onClick={() => { setIsPlaying(false); setCurrentStep(0); }}
              className="p-2 text-amber-200/60 hover:text-white transition rounded-lg hover:bg-[#1e110b]"
              title="Reset Simulation"
            >
              <RotateCcw size={16} />
            </button>

            <div className="h-4 w-px bg-[#3b2317]" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200/60 font-medium">Speed:</span>
              <select 
                value={speedMultiplier} 
                onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                className="bg-[#1e110b] text-amber-200 border border-[#3b2317] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value={1}>1x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
                <option value={25}>25x</option>
                <option value={50}>50x</option>
              </select>
            </div>

            <div className="h-4 w-px bg-[#3b2317]" />

            <span className="text-xs font-mono text-amber-400 font-bold bg-[#1e110b] px-3 py-1.5 rounded-lg border border-[#3b2317]">
              Clock: {simData.sample_time_series?.[currentStep]?.time || 0}m
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout (Sidebar + Grid Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Control Panel (1/4 Width) */}
        <aside className="bg-[#1e110b] border border-[#3b2317] rounded-2xl p-5 flex flex-col gap-5 shadow-md">
          <div className="flex items-center gap-2 pb-3 border-b border-[#3b2317]">
            <Sliders size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold text-amber-200 uppercase tracking-wider">Simulation Knobs</h2>
          </div>

          {/* Health Badge */}
          <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-sm ${healthStatus.color}`}>
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {healthStatus.label}
            </div>
            <span className="font-mono text-sm">{(rho * 100).toFixed(0)}%</span>
          </div>

          {/* Knobs */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-amber-200/70 mb-1.5 block">
                Arrival Rate (λ customers/min)
              </label>
              <input 
                type="number" step="0.1" value={knobs.arrival_rate} 
                onChange={(e) => handleKnobChange('arrival_rate', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#120a06] border border-[#4d3021] rounded-xl p-3 text-amber-100 font-mono text-base font-bold focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-amber-200/70 mb-1.5 block">
                Baristas (# Servers)
              </label>
              <input 
                type="number" value={knobs.num_baristas} 
                onChange={(e) => handleKnobChange('num_baristas', parseInt(e.target.value) || 1)}
                className="w-full bg-[#120a06] border border-[#4d3021] rounded-xl p-3 text-amber-100 font-mono text-base font-bold focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-amber-200/70 mb-1.5 block">
                Mean Service Time (μ min/customer)
              </label>
              <input 
                type="number" step="0.1" value={knobs.mean_service_time} 
                onChange={(e) => handleKnobChange('mean_service_time', parseFloat(e.target.value) || 0.1)}
                className="w-full bg-[#120a06] border border-[#4d3021] rounded-xl p-3 text-amber-100 font-mono text-base font-bold focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>
        </aside>

        {/* Right Dashboard Area (3/4 Width) */}
        <main className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Prominent KPI Cards (4 Column Grid) */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1e110b] p-4 rounded-2xl border border-[#3b2317] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200/70 mb-2">
                <Activity size={16} className="text-amber-400" /> Utilization
              </div>
              <div className="text-2xl font-black text-white">{simData.kpis?.utilization}%</div>
            </div>

            <div className="bg-[#1e110b] p-4 rounded-2xl border border-[#3b2317] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200/70 mb-2">
                <Users size={16} className="text-emerald-400" /> Throughput
              </div>
              <div className="text-2xl font-black text-white">{simData.kpis?.throughput} <span className="text-xs font-normal text-amber-200/50">/min</span></div>
            </div>

            <div className="bg-[#1e110b] p-4 rounded-2xl border border-[#3b2317] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200/70 mb-2">
                <Hourglass size={16} className="text-amber-300" /> Avg Wait Time
              </div>
              <div className="text-2xl font-black text-white">{simData.kpis?.avg_wait} <span className="text-xs font-normal text-amber-200/50">min</span></div>
            </div>

            <div className="bg-[#1e110b] p-4 rounded-2xl border border-[#3b2317] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200/70 mb-2">
                <Hourglass size={16} className="text-rose-400" /> Max Wait Time
              </div>
              <div className="text-2xl font-black text-white">{simData.kpis?.max_wait} <span className="text-xs font-normal text-amber-200/50">min</span></div>
            </div>

            <div className="bg-[#1e110b] p-4 rounded-2xl border border-[#3b2317] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200/70 mb-2">
                <Layers size={16} className="text-orange-400" /> Avg Queue Length
              </div>
              <div className="text-2xl font-black text-white">{simData.kpis?.avg_queue_length}</div>
            </div>

            <div className="bg-[#1e110b] p-4 rounded-2xl border border-[#3b2317] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200/70 mb-2">
                <Coffee size={16} className="text-purple-400" /> Avg WIP
              </div>
              <div className="text-2xl font-black text-white">{simData.kpis?.avg_wip}</div>
            </div>

            <div className="bg-[#1e110b] p-4 rounded-2xl border border-[#3b2317] shadow-sm md:col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200/70 mb-2">
                <Clock size={16} className="text-cyan-400" /> Cmax (Total Simulation Horizon)
              </div>
              <div className="text-2xl font-black text-white">{simData.kpis?.c_max} <span className="text-xs font-normal text-amber-200/50">minutes</span></div>
            </div>
          </section>

          {/* Large Tall Charts */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1e110b] p-5 rounded-2xl border border-[#3b2317] shadow-sm">
              <h3 className="text-xs font-bold mb-4 text-amber-300 uppercase tracking-wider">Queue Length Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2b1a11" />
                    <XAxis dataKey="time" stroke="#a38575" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#a38575" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#120a06', borderColor: '#3b2317', color: '#fef3c7', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="queue_length" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#1e110b] p-5 rounded-2xl border border-[#3b2317] shadow-sm">
              <h3 className="text-xs font-bold mb-4 text-amber-300 uppercase tracking-wider">Work In Progress (WIP) Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2b1a11" />
                    <XAxis dataKey="time" stroke="#a38575" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#a38575" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#120a06', borderColor: '#3b2317', color: '#fef3c7', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="wip" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

        </main>
      </div>

      {/* Dedicated Visual Digital Twin Canvas Overlay */}
      <DigitalTwinModal 
        isOpen={isTwinOpen} 
        onClose={() => setIsTwinOpen(false)} 
        currentStepData={simData.sample_time_series?.[currentStep]} 
        numBaristas={knobs.num_baristas} 
      />
    </div>
  );
}