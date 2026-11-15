import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Car, Train, Bus, MessageSquare, Clock, MapPin, Users, Plus, Search } from 'lucide-react';
import { api } from '../services/api';
import { formatTime24to12 } from '../utils/timeSlots';
import { istDate, tripDate, tripButton, tripInput } from '../utils/tripUi';
import CreateTravelGroupModal from '../components/CreateTravelGroupModal';
import CommunityBoard from '../components/CommunityBoard';

const tabs = [{ id: 'Cab', label: 'Cab rides', Icon: Car }, { id: 'Train', label: 'Train groups', Icon: Train }, { id: 'Bus', label: 'Bus groups', Icon: Bus }, { id: 'Board', label: 'Notice board', Icon: MessageSquare }];

export default function CityCommunityHubPage({ community, user, posts = [], onBack, onJoinCommunity, onLeaveCommunity, onAddPost, onLikePost, onAddComment, onRefreshGroups, onNavigateMyJourneys, triggerToast }) {
  const [tab, setTab] = useState('Cab');
  const [cabDate, setCabDate] = useState(() => istDate());
  const [travelDate, setTravelDate] = useState('');
  const [direction, setDirection] = useState('departing');
  const [time, setTime] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [creating, setCreating] = useState(false);
  const [limit, setLimit] = useState(6);
  const [revision, setRevision] = useState(0);
  const enrolled = user?.joinedCommunity === community.id;
  const isCab = tab === 'Cab';

  useEffect(() => {
    let current = true;
    if (tab === 'Board' || (tab === 'Cab' && !enrolled)) return;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const data = tab === 'Cab'
          ? await api.getCityCommunitySlots(community.id, { date: cabDate, direction })
          : await api.getTravelGroups({ communityId: community.id, type: tab, date: travelDate, search, excludeJoined: true });
        if (!current) return;
        const list = tab === 'Cab' ? data.slots || [] : Array.isArray(data) ? data : [];
        setResults(list.filter(item => !item.isJoined && !item.isMember && !item.isPast && (tab !== 'Cab' || (!item.isFull && item.status === 'Open'))));
      } catch (failure) { if (current) { setError(failure.message || 'Unable to load departures.'); setResults([]); } }
      finally { if (current) setLoading(false); }
    }, search ? 200 : 0);
    return () => { current = false; clearTimeout(timer); };
  }, [community.id, enrolled, tab, cabDate, direction, travelDate, search, revision]);

  async function join(item) {
    if (pending) return; const id = isCab ? item.slotKey : item.id;
    setPending(id); setError('');
    try {
      if (isCab) await api.joinCityCommunitySlot(community.id, { date: item.date, time: item.time, direction: item.direction || direction, destination: direction === 'returning' ? item.origin : item.destination, pickupPoint: 'Main Gate (Near Executive Mess)' });
      else await api.joinTravelGroup(item.id);
      setResults(previous => previous.filter(value => (isCab ? value.slotKey : value.id) !== id));
      // The booking already succeeded; a background list refresh must not turn it into an error.
      Promise.resolve(onRefreshGroups?.()).catch(() => {});
      triggerToast?.({ id: 'community_trip_joined', type: 'success', title: 'Added to My Journeys', message: 'Your trip, group chat and travel details are ready there.' });
      onNavigateMyJourneys?.();
    } catch (failure) { setError(failure.message || 'Could not join. Please try again.'); }
    finally { setPending(null); }
  }

  const available = isCab ? results.filter(item => !time || item.time >= time) : results;
  const visible = available.slice(0, limit);
  const ActiveIcon = tabs.find(item => item.id === tab).Icon;

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    <header className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600" onClick={onBack}><ArrowLeft className="w-4 h-4" />All communities</button>
        {enrolled ? <span className="text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-3 py-1.5">Your hometown</span> : <button className={tripButton} onClick={() => onJoinCommunity?.(community.id)}>Join hometown</button>}
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-xs uppercase tracking-widest font-semibold text-blue-600 mb-2">Travel together</p><h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{community.name}</h1><p className="text-sm text-slate-500 mt-2">Find your next trip. Manage everything you join in My Journeys.</p></div>{enrolled && <button className="text-xs text-slate-500 underline" onClick={() => onLeaveCommunity?.(community.id)}>Leave hometown</button>}</div>
    </header>

    <div role="tablist" aria-label="Community travel" className="flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto">
      {tabs.map(({ id, label, Icon }) => <button key={id} role="tab" aria-selected={tab === id} aria-controls="community-panel" className={`flex-1 min-w-max inline-flex justify-center items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${tab === id ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`} onClick={() => { setTab(id); setResults([]); setLoading(true); setLimit(6); setError(''); }}><Icon className="w-4 h-4" />{label}</button>)}
    </div>

    <div role="tabpanel" id="community-panel" aria-label={tabs.find(item => item.id === tab).label}>
      {tab === 'Board' ? <CommunityBoard community={community} enrolled={enrolled} posts={posts} onAddPost={onAddPost} onLikePost={onLikePost} onAddComment={onAddComment} /> : isCab && !enrolled ? <div className="text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 space-y-3"><Car className="mx-auto text-blue-600 w-8 h-8" /><h2 className="font-bold text-lg">Cab pools for your hometown</h2><p className="text-sm text-slate-500">Join this hometown to find cab rides. Train and bus groups are open across communities.</p><button className={tripButton} onClick={() => onJoinCommunity?.(community.id)}>Join {community.name}</button></div> : <section className="space-y-5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex justify-between items-start gap-4 flex-wrap"><div><h2 className="text-xl font-bold flex items-center gap-2"><ActiveIcon className="w-5 h-5 text-blue-600" />{isCab ? 'Find a cab pool' : `Find a ${tab.toLowerCase()} group`}</h2><p className="text-sm text-slate-500 mt-1">{isCab ? '15-minute departure slots · up to 4 riders' : 'Meet students on the same service. Book your own ticket separately.'}</p></div>{!isCab && <button className={tripButton} onClick={() => setCreating(true)}><Plus className="w-4 h-4" />Create {tab.toLowerCase()} group</button>}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isCab ? <label className="text-xs font-semibold space-y-1.5">Route<select className={tripInput} value={direction} onChange={event => { setDirection(event.target.value); setResults([]); setLoading(true); setLimit(6); }}><option value="departing">Thapar → {community.name}</option><option value="returning">{community.name} → Thapar</option></select></label> : <label className="text-xs font-semibold space-y-1.5 sm:col-span-2">Search service or destination<div className="relative"><Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" /><input className={`${tripInput} pr-10`} value={search} onChange={event => { setSearch(event.target.value); setLimit(6); }} placeholder={tab === 'Train' ? 'Train name, number or station' : 'Operator, boarding point or city'} /></div></label>}
            <label className="text-xs font-semibold space-y-1.5">{isCab ? 'Travel date' : 'Date (optional)'}<input type="date" className={tripInput} min={istDate()} max={istDate(30)} value={isCab ? cabDate : travelDate} onChange={event => { if (isCab) { if (!event.target.value) return; setCabDate(event.target.value); } else setTravelDate(event.target.value); setResults([]); setLoading(true); setLimit(6); }} /></label>
            {isCab && <label className="text-xs font-semibold space-y-1.5">Depart after (optional)<input type="time" step={900} className={tripInput} value={time} onChange={event => { setTime(event.target.value); setLimit(6); }} /></label>}
          </div>
          <p className="text-xs text-slate-500">{isCab ? 'Citywide pools: agree exact pickup and stops with your group. Joining a slot does not book a vehicle.' : 'Only upcoming groups you have not joined appear here. Joined groups live in My Journeys.'}</p>
        </div>

        {error && <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-4 text-sm flex flex-wrap justify-between gap-3"><span>{error}</span><button className="underline" onClick={() => setRevision(value => value + 1)}>Try again</button></div>}
        <div className="flex justify-between text-sm"><h3 className="font-semibold">Available {isCab ? 'departures' : 'groups'}</h3><span className="text-slate-500">{loading ? 'Loading…' : `${available.length} ${isCab ? available.length === 1 ? 'slot' : 'slots' : available.length === 1 ? 'group' : 'groups'}`}</span></div>
        {loading ? <div role="status" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map(value => <div key={value} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl h-48" />)}<span className="sr-only">Loading departures</span></div> : !error && !visible.length ? <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-12 px-5 text-center space-y-3"><ActiveIcon className="w-8 h-8 text-slate-400 mx-auto" /><h3 className="font-bold">{isCab ? 'No departures for these filters' : 'No groups available yet'}</h3><p className="text-sm text-slate-500">{isCab ? 'Try another date or an earlier departure time.' : 'Try another date or start a group for your service.'}</p><button className="text-sm text-blue-600 font-semibold underline" onClick={() => { if (isCab) { setCabDate(istDate(1)); setTime(''); } else { setSearch(''); setTravelDate(''); } }}>{isCab ? 'Find departures tomorrow' : 'Clear filters'}</button></div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(item => <article key={isCab ? item.slotKey : item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
            <div className="flex items-center justify-between gap-2"><span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-1 font-semibold">{isCab ? item.seatsFilled ? 'Pooling' : 'Start a pool' : tab === 'Train' ? item.travelClass || 'Train' : item.busOperator}</span><span className="text-sm font-bold">{formatTime24to12(isCab ? item.time : item.departureTime)}</span></div>
            {!isCab && <h3 className="font-bold leading-snug">{tab === 'Train' ? item.trainNumber : item.title}</h3>}
            <div className="space-y-2 text-sm"><p className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" /><span>{isCab ? item.origin : item.boardingPoint}<ArrowRight className="inline w-3 h-3 mx-1" />{item.destination}</span></p><p className="flex gap-2 text-slate-500"><Clock className="w-4 h-4 shrink-0 mt-0.5" />{tripDate(item.date)}</p><p className="flex gap-2 text-slate-500"><Users className="w-4 h-4 shrink-0 mt-0.5" />{isCab ? `${item.seatsFilled}/${item.maxSeats} seats filled` : `${item.membersCount} ${item.membersCount === 1 ? 'student' : 'students'} travelling`}</p></div>
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">{!isCab && <span className="text-xs text-slate-500">Tickets booked separately</span>}<button className={tripButton} disabled={!!pending || (isCab && item.isFull)} onClick={() => join(item)}>{pending === (isCab ? item.slotKey : item.id) ? 'Joining…' : isCab && item.isFull ? 'Full' : isCab ? item.seatsFilled ? 'Join cab' : 'Start pool' : 'Join group'}</button></div>
          </article>)}
        </div>}
        {!loading && limit < available.length && <button className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setLimit(value => value + 6)}>Show more departures</button>}
      </section>}
    </div>
    {creating && <CreateTravelGroupModal isOpen onClose={() => setCreating(false)} defaultType={tab} community={community} triggerToast={triggerToast} onSuccess={() => { setCreating(false); onNavigateMyJourneys?.(); }} />}
  </div>;
}
