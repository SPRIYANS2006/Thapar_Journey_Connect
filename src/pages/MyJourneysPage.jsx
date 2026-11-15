import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Car, Train, Bus, ArrowRight, MapPin, Clock, Users, MessageSquare } from 'lucide-react';
import { api, getSocket } from '../services/api';
import { useAuth } from '../context/useAuth';
import { formatTime24to12 } from '../utils/timeSlots';
import { tripDate, tripButton } from '../utils/tripUi';
import ConfirmDialog from '../components/ConfirmDialog';
import TravelGroupChatModal from '../components/TravelGroupChatModal';

const modes = ['All', 'Cab', 'Train', 'Bus'];
const icons = { Cab: Car, Auto: Car, Train, Bus };

export default function MyJourneysPage({ currentUser, onViewGroupDetails, onOpenChat, onRefresh, triggerToast, onFindRide }) {
  const { refreshUser } = useAuth();
  const [feed, setFeed] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('All');
  const [section, setSection] = useState('upcoming');
  const [leaving, setLeaving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [travelChat, setTravelChat] = useState(null);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const data = await api.getMyJourneyFeed();
      if (request === sequence.current) {
        setFeed(data); setError('');
        setTravelChat(current => current && [...data.upcoming, ...data.past].some(trip => trip.kind === 'travel' && trip.id === current.id) ? current : null);
      }
    } catch (failure) { if (request === sequence.current) setError(failure.message || 'Could not load your journeys.'); }
    finally { if (request === sequence.current) setLoading(false); }
  }, []);

  const invalidate = useCallback(() => { sequence.current++; }, []);
  useEffect(() => {
    const initial = setTimeout(load, 0);
    const socket = getSocket();
    let debounce;
    const refresh = () => { clearTimeout(debounce); debounce = setTimeout(load, 150); };
    socket?.on('group_updated', refresh);
    socket?.on('journeys_updated', refresh);
    socket?.on('connect', refresh);
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 60000);
    return () => { invalidate(); clearTimeout(initial); clearTimeout(debounce); clearInterval(timer); socket?.off('group_updated', refresh); socket?.off('journeys_updated', refresh); socket?.off('connect', refresh); window.removeEventListener('focus', refresh); };
  }, [load, invalidate]);

  const matchesMode = trip => mode === 'All' || trip.mode === mode || (mode === 'Cab' && trip.mode === 'Auto');
  const list = feed[section].filter(matchesMode);

  async function leave() {
    if (!leaving || busy) return; setBusy(true);
    try {
      const result = leaving.kind === 'travel' ? await api.leaveTravelGroup(leaving.id) : await api.leaveGroup(leaving.id);
      triggerToast?.(result.penaltyApplied ? `Left the ride. Reliability deduction: ${result.penaltyAmount}. You can request a review under Safety & privacy.` : 'You left the group.', result.penaltyApplied ? 'warning' : 'info');
      if (result.penaltyApplied) await refreshUser();
      setLeaving(null); await load(); Promise.resolve(onRefresh?.()).catch(() => {});
    } catch (failure) { setError(failure.message || 'Could not leave this group.'); setLeaving(null); }
    finally { setBusy(false); }
  }

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <header className="flex flex-wrap justify-between items-start gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-2">Your travel, together</p><h1 className="text-3xl sm:text-4xl font-bold tracking-tight">My Journeys</h1><p className="text-sm text-slate-500 mt-2">Every cab, train and bus group you join, in one place.</p></div><button className={tripButton} onClick={onFindRide}>Find a ride<ArrowRight className="w-4 h-4" /></button></header>
    <div className="flex flex-wrap gap-4 justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
      <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl" role="tablist" aria-label="Journey status">{[['upcoming', 'Upcoming'], ['past', 'Past']].map(([value, label]) => <button key={value} role="tab" aria-selected={section === value} className={`px-4 py-2 rounded-lg text-sm font-semibold ${section === value ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`} onClick={() => setSection(value)}>{label} <span className="ml-1 text-xs text-slate-500">{feed[value].length}</span></button>)}</div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Transport filter">{modes.map(value => <button key={value} aria-pressed={mode === value} className={`px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${mode === value ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300'}`} onClick={() => setMode(value)}>{value === 'All' ? 'All trips' : `${value === 'Cab' ? 'Cab' : value} groups`}</button>)}</div>
    </div>
    {error && <div role="alert" className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm flex justify-between gap-3"><span>{error}</span><button className="underline" onClick={() => { setLoading(true); load(); }}>Retry</button></div>}
    {loading ? <div role="status" className="space-y-4">{[0, 1].map(value => <div key={value} className="rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse h-44" />)}<span className="sr-only">Loading journeys</span></div> : !error && !list.length ? <div className="text-center py-16 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-3"><Car className="w-9 h-9 mx-auto text-slate-400" /><h2 className="font-bold text-lg">{mode !== 'All' ? `No ${mode.toLowerCase()} journeys here` : section === 'upcoming' ? 'No active journeys' : 'No past journeys'}</h2><p className="text-sm text-slate-500">Joined trips appear here automatically. Your next journey starts with a group.</p><button className="text-sm font-semibold text-blue-600 underline" onClick={onFindRide}>Find a ride</button></div> : <div className="space-y-4">
      {list.map(trip => {
        const Icon = icons[trip.mode] || Car;
        const isTravel = trip.kind === 'travel';
        const count = trip.members?.length || trip.membersCount || 0;
        return <article key={`${trip.kind}_${trip.id}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-start gap-3 flex-wrap"><div className="flex items-center gap-3"><div className="w-11 h-11 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center"><Icon className="w-5 h-5" /></div><div><div className="text-xs font-semibold text-blue-600 dark:text-blue-400">{trip.mode === 'Auto' ? 'Shared auto' : trip.mode === 'Cab' ? 'Shared cab' : `${trip.mode} group`}{trip.communityName ? ` · ${trip.communityName}` : ''}</div><h2 className="font-bold text-lg">{isTravel ? trip.type === 'Train' ? trip.trainNumber : trip.busOperator : `Group #${trip.id}`}</h2></div></div><span className="text-xs rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-semibold">{section === 'past' ? trip.status === 'Cancelled' ? 'Cancelled' : trip.completionVerified ? 'Completed by group' : 'Departure passed · arrival unverified' : trip.status === 'Confirmed' ? 'Group confirmed' : 'Coordinating'}</span></div>
          <p className="font-semibold flex flex-wrap items-center gap-2">{trip.origin || trip.boardingPoint || 'Thapar Institute'}<ArrowRight className="w-4 h-4 text-slate-400" />{trip.destinationName || trip.destination}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><Clock className="w-4 h-4" />{tripDate(trip.date)} · {formatTime24to12(trip.departureTime)} IST</span><span className="inline-flex items-center gap-2"><Users className="w-4 h-4" />{count}{trip.maxMembers ? `/${trip.maxMembers}` : ''} {isTravel ? count === 1 ? 'student' : 'students' : count === 1 ? 'rider' : 'riders'}</span>{trip.pickupPoint && <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" />{trip.pickupPoint}</span>}{trip.travelClass && <span>Class {trip.travelClass}</span>}</div>
          {isTravel && <details className="text-sm rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3"><summary className="font-semibold cursor-pointer">Trip details & co-travellers</summary><div className="mt-3 space-y-2"><p>{trip.title}</p>{trip.description && <p className="whitespace-pre-wrap break-words text-slate-500">{trip.description}</p>}<p className="text-xs text-slate-500">Book your train or bus ticket separately. Group membership is for coordination.</p>{trip.members.map(member => <p key={member.userId || member.id} className="break-words">{member.name}{member.userId === currentUser?.id ? ' (you)' : ''} · {member.hostel || 'Hostel not set'} · {Number(member.reliability ?? 4.5).toFixed(1)} / 5 · {member.phone || 'No contact shared'}</p>)}</div></details>}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4"><button className={tripButton} onClick={() => isTravel ? setTravelChat(trip) : onOpenChat?.(trip.id)}><MessageSquare className="w-4 h-4" />Open chat</button>{!isTravel && <button className="border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold" onClick={() => onViewGroupDetails?.(trip.id)}>View Details</button>}{section === 'upcoming' && <button disabled={busy} className="text-sm px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl sm:ml-auto" onClick={() => setLeaving(trip)}>Leave group</button>}</div>
        </article>;
      })}
    </div>}
    <ConfirmDialog isOpen={!!leaving} title="Leave this group?" message={leaving?.kind === 'travel' || leaving?.isCommunityRide ? 'You will leave this travel group and lose access to its chat. Your separately booked ticket is not cancelled.' : 'Leaving within four hours of departure deducts 0.3 reliability points; within thirty minutes deducts 0.8. Emergency or disputed deductions can be reviewed under Safety & privacy.'} confirmLabel={busy ? 'Leaving…' : 'Leave group'} isDestructive onConfirm={leave} onCancel={() => { if (!busy) setLeaving(null); }} />
    {travelChat && <TravelGroupChatModal group={travelChat} isOpen onClose={() => setTravelChat(null)} currentUser={currentUser} triggerToast={(message, type) => triggerToast?.(typeof message === 'string' ? message : message.message, type || 'info')} />}
  </div>;
}
