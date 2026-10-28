import React from 'react';
import { X, ShieldAlert, PhoneCall, AlertTriangle, ShieldCheck, MapPin, HeartHandshake } from 'lucide-react';

export default function EmergencySOSModal({ user, onClose }) {
  const emergencyContacts = [
    {
      title: 'TIET Campus Security Control Room',
      number: '0175-2393333',
      desc: '24x7 Main Control Room & Quick Response Team',
      action: 'tel:01752393333',
      priority: 'high'
    },
    {
      title: 'TIET Executive Mess Gate / Guard Post',
      number: '0175-2393111',
      desc: 'Security point for airport & highway cab pickups',
      action: 'tel:01752393111',
      priority: 'normal'
    },
    {
      title: 'Women Safety Helpline (Punjab / TIET)',
      number: '1091',
      desc: 'Direct helpline for female students travelling at night',
      action: 'tel:1091',
      priority: 'high'
    },
    {
      title: 'Police Emergency Central',
      number: '112',
      desc: 'All-India unified emergency assistance',
      action: 'tel:112',
      priority: 'normal'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-red-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl animate-pulse">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Campus Safety & SOS</h3>
              <p className="text-xs text-red-100">Official TIET Emergency Contacts & Guidelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 leading-relaxed">
              If you feel unsafe at any point during your commute, contact the campus security desk immediately or tap any number below.
            </p>
          </div>

          <div className="space-y-2.5">
            {emergencyContacts.map((c, i) => (
              <a
                key={i}
                href={c.action}
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-all group"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-red-600 transition-colors">
                    {c.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                    {c.number}
                  </span>
                  <div className="p-2 bg-red-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Travel Safety Checklist */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Safe Travel Protocol for TIET Students:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
              <li>Always meet matched group members at the designated campus gate first.</li>
              <li>Verify the cab license plate matches the app booking before boarding.</li>
              <li>Share live trip status with a hostel roommate or local guardian.</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Close Emergency SOS
          </button>

        </div>

      </div>
    </div>
  );
}
