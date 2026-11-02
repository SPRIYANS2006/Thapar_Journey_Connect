import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-5 py-4 rounded-3xl shadow-sm border border-slate-800">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-400/20 text-blue-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md">
                Made for TIET students
              </span>
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white mt-0.5">
              Share a cab, save up to 75%
            </h3>
            <p className="text-slate-300 text-xs mt-0.5">
              Verified Thapar students only. We don't run or book cabs. You coordinate directly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-2xl border border-white/10 text-xs text-slate-200 shrink-0 w-full md:w-auto justify-center">
          <Info className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          <span className="font-semibold">Up to 4 per cab</span>
        </div>
      </div>
    </div>
  );
}
