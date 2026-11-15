import React from 'react';
import { DESTINATIONS } from '../data/mockData';
import { getFareEstimate } from '../utils/fareEstimate';

export default function FareEstimate({ group }) {
  const fare = getFareEstimate(group, DESTINATIONS);
  return <section aria-label="Estimated fare" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
    <h2 className="font-bold text-sm">Estimated fare</h2>
    {fare ? <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
      <p>Group total <strong>₹{fare.total.toLocaleString('en-IN')}</strong></p>
      <p>Per person <strong>₹{fare.perPerson.toLocaleString('en-IN')}</strong> <span className="text-xs text-slate-500">({fare.riders} {fare.riders === 1 ? 'rider' : 'riders'})</span></p>
    </div> : <p className="text-sm text-slate-500">Estimate unavailable. Agree the fare with your co-riders and driver.</p>}
    {fare && <p className="text-xs text-slate-500">Estimate only; the share changes with rider count. Agree the actual fare before travelling.</p>}
  </section>;
}
