import React, { useState } from 'react';
import { X, Train, Bus } from 'lucide-react';
import { api } from '../services/api';
import { useModalFocus } from '../hooks/useModalFocus';
import { istDate, tripInput, tripButton } from '../utils/tripUi';

export default function CreateTravelGroupModal({ isOpen, onClose, defaultType = 'Train', community, onSuccess, triggerToast }) {
  const isTrain = defaultType === 'Train';
  const [service, setService] = useState('');
  const [date, setDate] = useState(() => istDate(1));
  const [time, setTime] = useState('08:00');
  const [origin, setOrigin] = useState(isTrain ? 'Patiala Railway Station' : 'Patiala Bus Stand');
  const [destination, setDestination] = useState(community?.name || '');
  const [travelClass, setTravelClass] = useState('CC');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useModalFocus(isOpen, () => { if (!busy) onClose(); });
  const Icon = isTrain ? Train : Bus;
  if (!isOpen) return null;

  async function submit(event) {
    event.preventDefault(); if (busy) return;
    if (!community?.id) { setError('Choose a community before creating a group.'); return; }
    setBusy(true); setError('');
    try {
      const result = await api.createTravelGroup({ type: defaultType, communityId: community.id, title: `${service.trim()} to ${destination.trim()}`.slice(0, 120), date, departureTime: time, boardingPoint: origin.trim(), destination: destination.trim(), trainNumber: isTrain ? service.trim() : '', travelClass: isTrain ? travelClass : '', busOperator: isTrain ? '' : service.trim(), description: description.trim() });
      triggerToast?.({ id: `travel_created_${result.group.id}`, type: 'success', title: 'Group created', message: 'Your group is ready in My Journeys.' });
      await onSuccess?.(result.group); onClose();
    } catch (failure) { setError(failure.message || 'Could not create the group. Your details are saved here; please try again.'); }
    finally { setBusy(false); }
  }

  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="create-travel-title" tabIndex={-1} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="max-w-xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
      <header className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between gap-3"><div><h2 id="create-travel-title" className="text-lg font-bold flex items-center gap-2"><Icon className="w-5 h-5 text-blue-600" />Create {defaultType.toLowerCase()} group</h2><p className="text-sm text-slate-500 mt-1">Find co-travellers for your service to {community?.name}.</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close create group" className="self-start p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button></header>
      <form className="p-5 sm:p-6 space-y-4" onSubmit={submit}>
        {error && <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl p-3">{error}</p>}
        <label className="block text-sm font-semibold">{isTrain ? 'Train number / name' : 'Bus operator / service'}<input className={tripInput} required maxLength={100} value={service} onChange={e => setService(e.target.value)} placeholder={isTrain ? '12006 · Shatabdi Express' : 'PRTC AC · Delhi service'} /></label>
        <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold">Travel date<input className={tripInput} type="date" required min={istDate()} max={istDate(30)} value={date} onChange={e => setDate(e.target.value)} /></label><label className="text-sm font-semibold">Departure time<input className={tripInput} type="time" required value={time} onChange={e => setTime(e.target.value)} /></label></div>
        <label className="block text-sm font-semibold">{isTrain ? 'Boarding station' : 'Boarding point'}<input className={tripInput} required maxLength={150} value={origin} onChange={e => setOrigin(e.target.value)} /></label>
        <label className="block text-sm font-semibold">Destination<input className={tripInput} required maxLength={150} value={destination} onChange={e => setDestination(e.target.value)} /></label>
        {isTrain && <label className="block text-sm font-semibold">Travel class<select className={tripInput} value={travelClass} onChange={e => setTravelClass(e.target.value)}>{['CC', 'EC', '3A', '2A', '1A', 'SL', '2S'].map(value => <option key={value}>{value}</option>)}</select></label>}
        <label className="block text-sm font-semibold">Notes (optional)<textarea className={tripInput} maxLength={500} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Where to meet or anything co-travellers should know" /></label>
        <p className="text-xs text-slate-500">This creates a coordination group, not a ticket reservation. Buy your ticket separately.</p>
        <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={busy} onClick={onClose} className="text-sm px-3 py-2 text-slate-500">Cancel</button><button disabled={busy} className={tripButton}>{busy ? 'Creating…' : 'Create group'}</button></div>
      </form>
    </div>
  </div>;
}
