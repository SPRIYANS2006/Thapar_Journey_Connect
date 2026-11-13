import React, { useState } from 'react';
import { X, Calculator, Check, Copy, Sparkles } from 'lucide-react';

export default function FareSplitModal({ group, onClose, onShareToChat }) {
  const [totalFare, setTotalFare] = useState(
    group?.destinationId === 'chd_airport' ? 1400 :
    group?.destinationId === 'del_airport' ? 5000 :
    group?.destinationId === 'bus_stand' ? 140 : 180
  );
  const [driverTip, setDriverTip] = useState(0);
  const [copied, setCopied] = useState(false);

  const numMembers = Math.max(1, group?.members?.length || 1);
  const grandTotal = Number(totalFare) + Number(driverTip);
  const perPerson = Math.ceil(grandTotal / numMembers);
  const soloCost = grandTotal;
  const savings = Math.max(0, soloCost - perPerson);
  const savingsPercent = Math.round((savings / soloCost) * 100);

  const handleCopy = () => {
    const text = `🚕 Fare Split for Group #${group.id} (${group.destinationName}):\n` +
      `• Total Fare: ₹${grandTotal} (split among ${numMembers} students)\n` +
      `• Your Share: ₹${perPerson} each\n` +
      `• Saved ₹${savings} (${savingsPercent}%) by sharing!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onShareToChat) {
      onShareToChat(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="bg-[#10264E] dark:bg-[#0c1e3d] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Cab fare splitter</h3>
              <p className="text-xs text-blue-200">Group #{group?.id} • {group?.destinationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Input Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Total cab fare (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={totalFare}
                  onChange={(e) => setTotalFare(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Toll or tip (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={driverTip}
                  onChange={(e) => setDriverTip(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-semibold">Presets:</span>
            {[
              { label: 'Station Auto (₹160)', val: 160 },
              { label: 'Chd Airport (₹1,400)', val: 1400 },
              { label: 'Delhi Cab (₹5,000)', val: 5000 }
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setTotalFare(p.val)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calculation Result Cards */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Cost per student</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                  ₹{perPerson}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> / student</span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="w-3.5 h-3.5" />
                  Save {savingsPercent}%
                </span>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  You save <strong>₹{savings}</strong> vs solo cab
                </div>
              </div>
            </div>

            {/* Members split breakdown */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Student breakdown:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {group?.members?.map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-white dark:bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-750">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{m.name.split(' ')[0]}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">₹{perPerson}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied & shared to chat' : 'Copy & share to chat'}</span>
            </button>
            <button
              onClick={onClose}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
