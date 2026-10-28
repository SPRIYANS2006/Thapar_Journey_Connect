import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-md mb-8 border border-indigo-700/50">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300 shrink-0 mt-0.5 md:mt-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-blue-200 tracking-wide uppercase text-xs px-2 py-0.5 bg-blue-500/30 rounded-md border border-blue-400/30">
                Official TIET Student Coordination
              </span>
            </div>
            <h3 className="font-semibold text-lg text-white mt-1">
              Student Journey-Matching & Group Coordination Platform
            </h3>
            <p className="text-slate-300 text-sm mt-0.5">
              Thapar Journey Connect helps verified TIET students find travel partners for shared transit to airports, railway stations, and bus stands. <strong className="text-blue-200">We do NOT operate or book cabs/taxis.</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 shrink-0 w-full md:w-auto justify-center">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Max 4 Students per Group</span>
        </div>
      </div>
    </div>
  );
}
