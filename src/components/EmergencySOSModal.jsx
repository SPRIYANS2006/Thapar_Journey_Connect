import { useModalFocus } from '../hooks/useModalFocus';
import React from 'react';
import { X, ShieldAlert, PhoneCall, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function EmergencySOSModal({ onClose }) {
  const dialogRef = useModalFocus(true, onClose);
  const emergencyContacts = []; // Campus numbers require direct institutional verification before publication.

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-red-200 dark:border-red-900/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="bg-red-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Campus safety & SOS</h3>
              <p className="text-xs text-red-100">TIET emergency contacts and guidelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
              If you feel unsafe at any point during your commute, use your phone to contact local emergency services or campus security using a contact you have independently verified. This app does not monitor emergencies.
            </p>
          </div>

          <div className="space-y-2.5">
            {emergencyContacts.map((c, i) => (
              <a
                key={i}
                href={c.action}
                className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all group"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {c.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{c.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {c.number}
                  </span>
                  <div className="p-2 bg-red-600 text-white rounded-lg shadow-xs group-hover:scale-105 transition-transform">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Travel Safety Checklist */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Safe Travel Protocol for TIET Students:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <li>Always meet matched group members at the designated campus gate first.</li>
              <li>Verify the cab license plate and driver against the booking you arranged directly.</li>
              <li>Share your route and expected arrival time with a hostel roommate or local guardian.</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer active:scale-98"
          >
            Close Emergency SOS
          </button>

        </div>

      </div>
    </div>
  );
}
