import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';

export default function SafetyInformationModal({ onClose }) {
  const dialogRef = useModalFocus(true, onClose);
  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="safety-information-title" tabIndex={-1} className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      <div className="bg-[#10264E] text-white p-5 flex items-center justify-between gap-3">
        <h2 id="safety-information-title" className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5" />Safety information</h2>
        <button onClick={onClose} aria-label="Close safety information" className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 space-y-4 text-sm">
        <p>This app helps students coordinate travel. It does not monitor emergencies, verify drivers, or dispatch help.</p>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300">
          <li>Agree the pickup point, stops and actual fare with your group before travelling.</li>
          <li>Check the driver and vehicle details against the booking you arranged directly.</li>
          <li>Share your route and expected arrival with someone you trust.</li>
          <li>If you are in immediate danger, contact emergency services directly using a verified contact.</li>
        </ul>
        <p>Use <strong>Safety & privacy</strong> in the navigation to report a concern or request a rating review. Reports are not monitored for emergencies.</p>
        <button onClick={onClose} className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-semibold">Close</button>
      </div>
    </div>
  </div>;
}
