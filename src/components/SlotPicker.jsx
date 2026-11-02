import React, { useState, useMemo } from 'react';
import Avatar from './Avatar';
import { 
  Clock, 
  Flame, 
  Car, 
  Check, 
  ArrowRight, 
  ShieldCheck,
  ChevronRight,
  Filter
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
  initialJumpTime = '',
  _activeGroupId = null
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [jumpTimeInput, setJumpTimeInput] = useState(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const jumpTime = jumpTimeInput !== null ? jumpTimeInput : (initialJumpTime || '');

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (onlyAvailable && (slot.isPast || slot.isFull)) {
        return false;
      }

      if (jumpTime) {
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
    <div className="space-y-5">
      {/* Modern Compact Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">
              Departures every 15 min
            </span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {availableCount} available
            </span>
            {fillingFastCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{fillingFastCount} filling fast</span>
              </span>
            )}
          </div>

          {/* Jump to time & Availability toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">Hour:</span>
              <label htmlFor="jump-time-input" className="sr-only">Jump to hour</label>
              <input
                id="jump-time-input"
                type="time"
                value={jumpTime}
                onChange={(e) => setJumpTimeInput(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                title="Jump to time slot"
              />
              {jumpTime && (
                <button
                  type="button"
                  onClick={() => setJumpTimeInput('')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold ml-1 cursor-pointer"
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
              <span>Available only</span>
            </label>
          </div>
        </div>

        {/* Clean Segmented Time Window Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1 hidden sm:block" />
          {TIME_FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
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
          <h3 className="text-base font-bold text-slate-700">No departures in this window</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Switch to "All" or clear the time filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('all');
              setJumpTimeInput('');
              setOnlyAvailable(false);
            }}
            className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSlots.map((slot) => {
            const isJoiningThis = joiningSlotKey === slot.slotKey;
            const isFull = slot.isFull;
            const isPast = slot.isPast;
            const isJoined = slot.isJoined;

            return (
              <div
                key={slot.slotKey}
                className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isJoined
                    ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                    : isPast
                    ? 'bg-slate-50/80 border-slate-200/60 opacity-60'
                    : isFull
                    ? 'bg-slate-50 border-slate-200'
                    : slot.isFillingFast
                    ? 'bg-white border-amber-300 shadow-xs hover:shadow-md hover:border-amber-400'
                    : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md'
                }`}
              >
                {/* Header: Time, Vehicle, Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {slot.time}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {formatTime24to12(slot.time)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-700">{slot.vehicle || 'Shared Cab'}</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">{slot.destinationName || slot.destination}</span>
                      </p>
                    </div>

                    {/* Clean Status Badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {isJoined ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Joined</span>
                        </span>
                      ) : isPast ? (
                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Departed
                        </span>
                      ) : isFull ? (
                        <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Full
                        </span>
                      ) : slot.isFillingFast ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>Filling fast</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
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

                  {/* Seat Indicators & Price */}
                  <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Seats
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((idx) => {
                          const isOccupied = idx < (slot.seatsFilled || 0);
                          return (
                            <span
                              key={idx}
                              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                isOccupied
                                  ? isFull
                                    ? 'bg-rose-500'
                                    : 'bg-blue-600'
                                  : 'bg-slate-200'
                              }`}
                            />
                          );
                        })}
                        <span className="text-xs font-bold text-slate-700 ml-1">
                          {slot.seatsFilled}/4
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Fare
                      </span>
                      <div className="text-base font-black text-blue-700 leading-none">
                        ₹{slot.estimatedFarePerPerson}{' '}
                        <span className="text-[10px] font-normal text-slate-500">/ rider</span>
                      </div>
                    </div>
                  </div>

                  {/* Co-riders Avatars */}
                  <div className="flex items-center justify-between min-h-[28px] pt-1">
                    {slot.members && slot.members.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center -space-x-1.5">
                          {slot.members.map((m) => (
                            <span
                              key={m.id}
                              title={`${m.name} (${m.hostel || 'Campus'})`}
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
                        <span className="text-[11px] text-slate-600 font-semibold truncate max-w-[140px]">
                          {slot.members.map((m) => m.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Empty • Start this slot
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  {isJoined ? (
                    <button
                      type="button"
                      onClick={() => onViewGroup && onViewGroup(slot.groupId || slot.rideId)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>View group #{slot.groupId || slot.rideId}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : isPast ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed text-center"
                    >
                      Departed
                    </button>
                  ) : isFull ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed text-center"
                    >
                      Full (4/4)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onJoinSlot && onJoinSlot(slot)}
                      disabled={isJoiningThis}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      {isJoiningThis ? (
                        <span>Joining...</span>
                      ) : (
                        <>
                          <span>{actionLabel || 'Join'} ({slot.time})</span>
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
