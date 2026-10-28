import React from 'react';
import { ArrowRight, Users, Clock, MapPin } from 'lucide-react';

export default function DestinationCard({ destination, onSelect }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      {/* Accent gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Icon & Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl shadow-xs group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300">
            <span>{destination.icon}</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200 flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-600" />
            <span>Active Matches</span>
          </span>
        </div>

        {/* Destination Name & Description */}
        <h3 className="font-bold text-xl text-slate-900 group-hover:text-blue-600 transition-colors">
          {destination.name}
        </h3>
        <p className="text-slate-600 text-sm mt-2 leading-relaxed">
          {destination.description}
        </p>

        {/* Details Pills */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{destination.distance}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{destination.popularTime}</span>
          </div>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={() => onSelect(destination)}
        className="mt-6 w-full py-3 px-4 bg-slate-900 text-white hover:bg-blue-600 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all group-hover:shadow-md"
      >
        <span>Find Travel Partners</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
