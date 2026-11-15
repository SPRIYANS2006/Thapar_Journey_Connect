import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-[#10264E] dark:bg-[#0c1e3d] text-white px-5 py-4 rounded-2xl shadow-xs border border-blue-900/40 transition-colors">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                Made for TIET students
              </span>
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white mt-0.5">
              Coordinate your shared ride
            </h3>
            <p className="text-slate-300 text-xs mt-0.5 font-normal">
              Choose a slot and coordinate with co-riders. You arrange the vehicle directly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl border border-white/15 text-xs text-slate-100 shrink-0 w-full md:w-auto justify-center font-medium">
          <Info className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          <span>Up to 4 per cab</span>
        </div>
      </div>
    </div>
  );
}
