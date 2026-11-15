import React, { useState } from 'react';
import { api } from '../services/api';

export default function FareEstimate({ group, currentUser, onSaved }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (group.transport !== 'Shared Cab' && group.mode !== 'Cab') return null;
  const admin = (group.adminId || group.creatorId) === currentUser?.id;
  const fare = group.adminFare;
  if (!admin && !(fare > 0)) return null;
  return <section aria-label="Cab fare" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
    <h2 className="font-bold text-sm">Cab fare</h2>
    {fare > 0 && <p className="text-sm">Group total ₹{fare} · Per person ₹{Math.ceil(fare / Math.max(1, group.members?.length || 0))}</p>}
    {admin && <form className="flex flex-wrap gap-2" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      try {
        const response = await api.setCabFare(group.id, Number(value));
        await onSaved?.(response.group);
        setValue('');
      } catch (failure) { setError(failure.message); } finally { setBusy(false); }
    }}>
      <label>Total cab fare (₹)<input aria-label="Total cab fare" className="border rounded p-2 dark:bg-slate-800" type="number" required min="0.01" max="100000" step="0.01" value={value} onChange={event => setValue(event.target.value)} /></label>
      <button disabled={busy} className="rounded bg-blue-600 text-white px-4 py-2">{busy ? 'Saving…' : 'Set fare'}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}
