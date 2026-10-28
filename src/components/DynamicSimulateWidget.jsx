import React, { useState } from 'react';
import { Sparkles, UserPlus, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function DynamicSimulateWidget({ activeGroup, onSimulateJoin, onResetGroup }) {
  const [simulationStatus, setSimulationStatus] = useState(null);

  const handleSimulate = () => {
    if (!activeGroup) return;

    if (activeGroup.members.length >= activeGroup.maxMembers) {
      setSimulationStatus({
        type: 'full',
        message: `Group #${activeGroup.id} is full (4/4) — automatically creating new Group #105 for incoming student.`
      });
      return;
    }

    const newStudent = {
      id: 's4_simulated',
      name: 'Simran Kaur',
      avatar: 'SK',
      hostel: 'H4',
      departureTime: '17:20',
      role: 'Member',
      phone: '+91 97654 32109'
    };

    onSimulateJoin(activeGroup.id, newStudent);

    setSimulationStatus({
      type: 'success',
      message: `✨ New compatible student found (Simran Kaur, H4, 5:20 PM) — Added to Group #${activeGroup.id} (Now ${activeGroup.members.length + 1}/4)!`
    });
  };

  const isFull = activeGroup?.members?.length >= activeGroup?.maxMembers;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border border-indigo-200/80 rounded-2xl p-5 shadow-xs mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>Dynamic Matching Engine Simulator</span>
              <span className="text-[10px] uppercase font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                Interactive Demo
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Simulate a new student (Simran Kaur • H4 • 5:20 PM) requesting a trip to test how the system dynamically checks open group compatibility & max capacity (4/4 limit).
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleSimulate}
            disabled={isFull}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
              isFull
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Simulate Student Joining</span>
          </button>

          {isFull && (
            <button
              onClick={onResetGroup}
              className="px-3 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Reset Demo Group to 3/4 Members"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          )}
        </div>

      </div>

      {/* Dynamic Feedback Banner */}
      {simulationStatus && (
        <div className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 ${
          simulationStatus.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          {simulationStatus.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>{simulationStatus.message}</span>
        </div>
      )}
    </div>
  );
}
