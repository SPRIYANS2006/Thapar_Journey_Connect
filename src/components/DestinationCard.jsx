import React from 'react';
import { ArrowRight, Users, Clock, MapPin } from 'lucide-react';

export default function DestinationCard({ destination, onSelect }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
      <div>
        {/* Icon & Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
            <span>{destination.icon}</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-900 flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Active rides</span>
          </span>
        </div>

        {/* Destination Name & Description */}
        <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {destination.name}
        </h3>
        <p className="text-slate-600 dark:text-slate-300 text-xs mt-1.5 leading-relaxed">
          {destination.description}
        </p>

        {/* Details Pills */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>{destination.distance}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>{destination.popularTime}</span>
          </div>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={() => onSelect(destination)}
        className="mt-5 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
      >
        <span>Find rides</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
