import React, { useState, useMemo } from 'react';
import Avatar from './Avatar';
import { 
  Clock, 
  Users, 
  Flame, 
  Car, 
  Train,
  Check, 
  ArrowRight, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { formatTime24to12 } from '../utils/matchingEngine';

const TIME_FILTERS = [
  { id: 'all', label: 'All Slots' },
  { id: 'morning', label: 'Morning (6 AM - 12 PM)', start: 6 * 60, end: 12 * 60 - 1 },
  { id: 'afternoon', label: 'Afternoon (12 PM - 5 PM)', start: 12 * 60, end: 17 * 60 - 1 },
  { id: 'evening', label: 'Evening (5 PM - 9 PM)', start: 17 * 60, end: 21 * 60 - 1 },
  { id: 'night', label: 'Night (9 PM - 6 AM)', isNight: true }
];

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export default function SlotPicker({
  slots = [],
  loading = false,
  onJoinSlot,
  onViewGroup,
  joiningSlotKey = null,
  actionLabel = null,
  _activeGroupId = null
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [jumpTime, setJumpTime] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (onlyAvailable && (slot.isPast || slot.isFull)) {
        return false;
      }

      if (jumpTime) {
        // match exact or close hour
        const jumpHour = parseInt(jumpTime.split(':')[0], 10);
        const slotHour = parseInt(slot.time.split(':')[0], 10);
        if (jumpHour !== slotHour) {
          return false;
        }
      }

      if (activeFilter === 'all') return true;

      const mins = timeToMins(slot.time);
      const filterObj = TIME_FILTERS.find((f) => f.id === activeFilter);
      if (!filterObj) return true;

      if (filterObj.isNight) {
        return mins >= 21 * 60 || mins < 6 * 60;
      }
      return mins >= filterObj.start && mins <= filterObj.end;
    });
  }, [slots, activeFilter, jumpTime, onlyAvailable]);

  // Statistics
  const fillingFastCount = useMemo(() => slots.filter((s) => s.isFillingFast && !s.isPast).length, [slots]);
  const availableCount = useMemo(() => slots.filter((s) => !s.isPast && !s.isFull).length, [slots]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-8 w-24 bg-slate-200 rounded-xl" />
                <div className="h-6 w-16 bg-slate-200 rounded-lg" />
              </div>
              <div className="h-4 w-full bg-slate-200 rounded-full" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-8 w-8 bg-slate-200 rounded-full" />
                <div className="h-9 w-24 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              10-Minute Slots ({availableCount} Available)
            </span>
            {fillingFastCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-amber-300">
                <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                <span>{fillingFastCount} Filling Fast</span>
              </span>
            )}
          </div>

          {/* Quick options: Jump to time & Hide full/past */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="jump-time-input" className="sr-only">Jump to hour</label>
              <input
                id="jump-time-input"
                type="time"
                value={jumpTime}
                onChange={(e) => setJumpTime(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Jump to time slot"
              />
              {jumpTime && (
                <button
                  onClick={() => setJumpTime('')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>Available Only</span>
            </label>
          </div>
        </div>

        {/* Time Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TIME_FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Grid */}
      {filteredSlots.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No matching slots in this time window</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try switching the time filter to "All Slots" or clearing your jump filter to view all 10-minute departures.
          </p>
          <button
            onClick={() => {
              setActiveFilter('all');
              setJumpTime('');
              setOnlyAvailable(false);
            }}
            className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSlots.map((slot) => {
            const isJoiningThis = joiningSlotKey === slot.slotKey;
            const isFull = slot.isFull;
            const isPast = slot.isPast;
            const isJoined = slot.isJoined;
            const percentFilled = Math.min(100, Math.round((slot.seatsFilled / slot.maxSeats) * 100));

            return (
              <div
                key={slot.slotKey}
                className={`rounded-3xl border p-5 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isJoined
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-sm ring-2 ring-emerald-500/20'
                    : isPast
                    ? 'bg-slate-50 border-slate-200/70 opacity-60'
                    : isFull
                    ? 'bg-slate-50 border-slate-200'
                    : slot.isFillingFast
                    ? 'bg-gradient-to-br from-white to-amber-50/30 border-amber-300/80 shadow-sm hover:shadow-md'
                    : 'bg-white border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* Top Row: Time, Vehicle, Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {slot.time}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {formatTime24to12(slot.time)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1">
                        {slot.mode === 'Train' || (slot.vehicle && slot.vehicle.toLowerCase().includes('train')) ? (
                          <Train className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <Car className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{slot.vehicle || (slot.mode === 'Train' ? 'Train Cohort' : 'Shared Cab')}</span>
                        <span>•</span>
                        <span className="text-slate-500 font-normal">{slot.destinationName || slot.destination}</span>
                      </p>
                    </div>

                    {/* Status Chips */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {isJoined ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Joined</span>
                        </span>
                      ) : isPast ? (
                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                          Departed
                        </span>
                      ) : isFull ? (
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                          Full
                        </span>
                      ) : slot.isFillingFast ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                          <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>Filling Fast</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                          Available
                        </span>
                      )}

                      {(slot.groupId || slot.rideId) && (
                        <span className="text-[10px] font-bold text-slate-400">
                          Group #{slot.groupId || slot.rideId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Seat Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {slot.seatsFilled}/{slot.maxSeats} Seats Booked
                        </span>
                      </span>
                      <span className="font-extrabold text-blue-700">
                        ₹{slot.estimatedFarePerPerson}{' '}
                        <span className="text-[10px] font-normal text-slate-500">/ person</span>
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull
                            ? 'bg-rose-500'
                            : slot.isFillingFast
                            ? 'bg-amber-500'
                            : slot.seatsFilled > 0
                            ? 'bg-blue-600'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Co-riders Avatars Cluster */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 min-h-[36px]">
                    {slot.members && slot.members.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center -space-x-1.5">
                          {slot.members.map((m) => (
                            <span
                              key={m.id}
                              title={`${m.name} (${m.hostel || 'Campus'}) • ★ ${m.reliability ? m.reliability.toFixed(1) : '5.0'}`}
                              className="inline-block ring-2 ring-white rounded-full"
                            >
                              <Avatar
                                src={m.avatar}
                                name={m.name}
                                size="w-6 h-6"
                                textSize="text-[9px]"
                                rounded="rounded-full"
                              />
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">
                          {slot.members.map((m) => m.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Be the first to book this slot
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified TIET</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {isJoined ? (
                    <button
                      onClick={() => onViewGroup && onViewGroup(slot.groupId || slot.rideId)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Open Group #{slot.groupId || slot.rideId}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : isPast ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed text-center"
                    >
                      Slot Departed
                    </button>
                  ) : isFull ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed text-center"
                    >
                      Capacity Reached (Full)
                    </button>
                  ) : (
                    <button
                      onClick={() => onJoinSlot && onJoinSlot(slot)}
                      disabled={isJoiningThis}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      {isJoiningThis ? (
                        <span>Securing Seat...</span>
                      ) : (
                        <>
                          <span>{actionLabel || 'Join Slot'} ({slot.time})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
