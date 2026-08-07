import React from 'react';
import { Coffee, User, Users, X, Activity } from 'lucide-react';

export default function DigitalTwinModal({ isOpen, onClose, currentStepData, numBaristas }) {
  if (!isOpen || !currentStepData) return null;

  const queueLength = currentStepData.queue_length || 0;
  const activeBaristas = currentStepData.active_baristas || 0;
  const visibleQueue = Math.min(queueLength, 12);
  const overflowQueue = queueLength - visibleQueue;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-[#1e110b] border border-[#3b2317] w-full max-w-5xl rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#3b2317] pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600/20 p-2.5 rounded-xl border border-amber-500/30">
              <Activity className="text-amber-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-300">Live Visual Digital Twin</h2>
              <p className="text-xs text-amber-200/60">Real-Time Entity Flow & Floor Plan Animation</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-amber-200/60 hover:text-white bg-[#120a06] border border-[#3b2317] rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Visual Floor Plan Canvas */}
        <div className="bg-[#120a06] border border-[#3b2317] rounded-2xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Waiting Area */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 uppercase tracking-wider">
              <span className="flex items-center gap-2"><Users size={16} className="text-amber-400" /> Waiting Line</span>
              <span className="font-mono bg-[#1e110b] px-3 py-1 rounded-lg text-amber-400 border border-[#3b2317]">
                {queueLength} Waiting
              </span>
            </div>

            <div className="min-h-32 bg-[#1e110b] border border-[#3d271d] rounded-2xl p-4 flex flex-wrap items-center gap-2">
              {queueLength === 0 ? (
                <div className="w-full text-center text-xs text-amber-200/40 italic py-6">
                  No customers waiting in queue
                </div>
              ) : (
                <>
                  {Array.from({ length: visibleQueue }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-center w-10 h-10 bg-amber-600/30 border border-amber-500/50 rounded-xl text-amber-300 animate-pulse"
                    >
                      <User size={20} />
                    </div>
                  ))}
                  {overflowQueue > 0 && (
                    <div className="text-xs font-bold text-amber-400 bg-amber-950/90 px-3 py-2 rounded-xl border border-amber-800">
                      +{overflowQueue} more
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Barista Counter Stations */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 uppercase tracking-wider">
              <span className="flex items-center gap-2"><Coffee size={16} className="text-amber-400" /> Espresso Bar</span>
              <span className="font-mono bg-[#1e110b] px-3 py-1 rounded-lg text-amber-400 border border-[#3b2317]">
                {activeBaristas} / {numBaristas} Active
              </span>
            </div>

            <div className="min-h-32 bg-[#1e110b] border border-[#3d271d] rounded-2xl p-4 grid grid-cols-2 gap-3">
              {Array.from({ length: numBaristas }).map((_, i) => {
                const isBusy = i < activeBaristas;
                return (
                  <div 
                    key={i}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                      isBusy 
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
                        : 'bg-[#120a06] border-[#321e15] text-amber-200/30'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">Barista #{i + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <User size={18} className={isBusy ? 'text-emerald-400 animate-bounce' : 'opacity-20'} />
                      <Coffee size={18} className={isBusy ? 'text-amber-400' : 'opacity-20'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-xs text-amber-200/60 px-2">
          <span>Clock Time: <strong className="text-amber-400 font-mono">{currentStepData.time}m</strong></span>
          <span>Work In Progress (WIP): <strong className="text-amber-400 font-mono">{currentStepData.wip} customers</strong></span>
        </div>

      </div>
    </div>
  );
}