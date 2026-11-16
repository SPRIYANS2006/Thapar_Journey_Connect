import React, { useState, useCallback, useMemo, useEffect } from 'react';
import SlotPicker from '../components/SlotPicker';
import HeroBanner from '../components/HeroBanner';
import { DESTINATIONS } from '../data/mockData';
import { istDate, tripInput } from '../utils/tripUi';
import { TIME_SLOT_OPTIONS_15MIN } from '../utils/timeSlots';
import { 
  ArrowRight, 
  ArrowLeft,
  Clock, 
  MapPin, 
  Car, 
  Search, 
  Home, 
  Calendar,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react';
import { isCabOnlyDestination } from '../utils/ridePolicy';
import { api } from '../services/api';

let toastSeq = 0;
function makeToastId(prefix) {
  toastSeq = (toastSeq + 1) % 1000000;
  return `${prefix}_${toastSeq}`;
}

function getCurrentSlotTime() {
  const now = new Date();
  const [istHour, istMinute] = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' }).split(':').map(Number);
  let minutes = Math.ceil(istMinute / 15) * 15;
  let hours = istHour;
  if (minutes >= 60) {
    minutes = 0;
    hours = (hours + 1) % 24;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function DashboardPage({ 
  onNavigateMyJourneys,
  communities: _communities = [], 
  onNavigateToCommunities, 
  triggerToast,
  onRefreshGroups
}) {
  // Search Form State
  const [selectedDestId, setSelectedDestId] = useState(DESTINATIONS[0].id);
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);

  // Generate today to +30 days in IST
  const dateOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 31; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const isoDate = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' });
      const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' });
      const day = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Kolkata' });

      let label = `${weekday}, ${month} ${day}`;
      if (i === 0) label = `Today (${weekday}, ${month} ${day})`;
      if (i === 1) label = `Tomorrow (${weekday}, ${month} ${day})`;

      list.push({ value: isoDate, label, isToday: i === 0 });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  const [selectedTime, setSelectedTime] = useState(() => getCurrentSlotTime());
  const [vehicleChoice, setSelectedVehicle] = useState('Shared Cab');
  const cabOnly = isCabOnlyDestination(selectedDestId);
  const selectedVehicle = cabOnly ? 'Shared Cab' : vehicleChoice;
  const selectedHostel = 'Main Gate';
  const direction = 'departing';

  // Slots State
  const [hasSearched, setHasSearched] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [joiningSlotKey, setJoiningSlotKey] = useState(null);

  // Selected Destination Object
  const currentDestination = useMemo(() => {
    return DESTINATIONS.find((d) => d.id === selectedDestId) || DESTINATIONS[0];
  }, [selectedDestId]);

  // Filtered Destinations for Searchable Dropdown
  const filteredDestinations = useMemo(() => {
    if (!destSearchQuery.trim()) return DESTINATIONS;
    const q = destSearchQuery.toLowerCase();
    return DESTINATIONS.filter(
      (d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
    );
  }, [destSearchQuery]);

  // Fetch 15-minute slots
  const fetchSlots = useCallback(async (destId, dateStr, vehicleType, tripDir = direction) => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const res = await api.getSlots({
        destinationId: destId,
        date: dateStr,
        vehicle: isCabOnlyDestination(destId) ? 'Shared Cab' : vehicleType,
        direction: tripDir
      });
      if (res && res.slots) {
        setSlots(res.slots.filter(slot => !slot.isJoined));
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.warn('Failed to fetch slots:', err.message);
      setSlotsError(err.message || 'Unable to load slots');
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [direction]);

  // Initial slot load on mount
  useEffect(() => {
    let active = true;
    api.getSlots({
      destinationId: selectedDestId,
      date: selectedDate,
      vehicle: selectedVehicle,
      direction
    }).then((res) => {
      if (active && res && res.slots) {
        setSlots(res.slots.filter(slot => !slot.isJoined));
      }
    }).catch((err) => {
      console.warn('Initial slot fetch failed:', err.message);
    });

    return () => {
      active = false;
    };
  }, [selectedDestId, selectedDate, selectedVehicle, direction]);

  // Featured 3 slots for top dashboard view (strictly uses real slots, no preview/fake occupancy)
  const featuredSlots = useMemo(() => {
    if (!slots || slots.length === 0) {
      return [];
    }

    const available = slots.filter(slot => !slot.isPast);
    let subset = available;
    if (selectedTime) {
      const idx = available.findIndex((s) => s.time >= selectedTime);
      if (idx !== -1) {
        subset = available.slice(idx, idx + 3);
      } else { subset = []; }
    }
    return subset.map((s) => ({
      ...s,
      time12: s.time12 || s.time,

    }));
  }, [slots, selectedTime]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setIsDestDropdownOpen(false);
    setHasSearched(true);
    fetchSlots(selectedDestId, selectedDate, selectedVehicle, direction);
  };

  const handleQuickDestinationSelect = (id) => {
    setSelectedDestId(id);
    setHasSearched(true);
    setIsDestDropdownOpen(false);
    fetchSlots(id, selectedDate, selectedVehicle);
  };

  // Join Slot Handler (Atomic Join or Lazy Creation)
  const handleJoinSlot = async (slot) => {
    setJoiningSlotKey(slot.slotKey);
    try {
      const isReturn = (slot.direction || direction) === 'returning';
      const defaultPickup = isReturn
        ? `${currentDestination.name} (Arrivals / Main Exit)`
        : 'Main Gate (Near Executive Mess)';

      const res = await api.joinSlot({
        destinationId: slot.destinationId,
        date: slot.date,
        time: slot.time,
        vehicle: slot.vehicle,
        pickupPoint: isReturn ? defaultPickup : selectedHostel,
        direction: slot.direction || direction
      });

      if (triggerToast) {
        triggerToast({
          id: makeToastId('join_slot'),
          type: 'success',
          title: res.created ? 'Group created' : 'Joined group',
          message: res.message || `Joined Group #${res.group.id} for ${slot.time}`,
          actionLabel: 'My Journeys',
          onAction: onNavigateMyJourneys
        });
      }

      Promise.resolve(onRefreshGroups?.()).catch(() => {});

      onNavigateMyJourneys?.();
    } catch (err) {
      if (triggerToast) {
        triggerToast({
          id: makeToastId('join_slot_err'),
          type: 'error',
          title: 'Could not join slot',
          message: err.message || 'Error joining slot.'
        });
      }
    } finally {
      setJoiningSlotKey(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      {/* Top Hero Banner with Thapar Campus Graphic */}
      <HeroBanner
        tag="YOUR CAMPUS. YOUR JOURNEY."
        title="Where are you headed?"
        subtitle="Find a shared ride with verified Thapar students."
        pills={
          <>
            <span className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Verified Students</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Every 15 Minutes</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Shared fares</span>
            </span>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Disclaimer Banner */}


        {/* Search card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Car className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Find a ride
              </h2>
              <span className="text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200/70 dark:border-blue-800">
                Every 15 min
              </span>
            </div>

          </div>

        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1 & 2. Dynamic From / To with Switch Support */}

              <>
                {/* 1. FROM: Thapar Campus */}
                <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>From</span>
                    </span>
                  </div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-1">
                    Thapar Institute
                  </div>
                </div>

                {/* 2. TO: Searchable Destination Dropdown */}
                <div className="relative bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>To</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDestDropdownOpen((prev) => !prev)}
                    className="w-full text-left font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-1 flex items-center justify-between gap-1 cursor-pointer truncate"
                  >
                    <span className="truncate">{currentDestination.name}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  </button>

                  {/* Dropdown Menu */}
                  {isDestDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 p-2 space-y-1.5 max-h-72 overflow-y-auto animate-in fade-in duration-150">
                      <div className="relative px-1 pt-1 pb-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5" />
                        <input
                          type="text"
                          placeholder="Type destination name..."
                          value={destSearchQuery}
                          onChange={(e) => setDestSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>

                      {filteredDestinations.map((dest) => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => {
                            setSelectedDestId(dest.id);
                            setIsDestDropdownOpen(false);
                            setDestSearchQuery('');
                          }}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            selectedDestId === dest.id
                              ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-800'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{dest.icon}</span>
                              <span>{dest.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{dest.distance}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>

            {/* 3. DATE: Picker (Today to +30 Days) */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Date</span>
              </span>
              <label htmlFor="travel-date-select" className="sr-only">Date</label>
              <input
                type="date"
                id="travel-date-select"
                min={istDate()}
                max={istDate(30)}
                value={selectedDate}
                onChange={event => { if (event.target.value) setSelectedDate(event.target.value); }}
                className={tripInput}
              />
            </div>

            {/* 4. DEPARTURE TIME */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Time (optional)</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTime(getCurrentSlotTime())}
                    className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    title="Set to current upcoming slot"
                  >
                    Now
                  </button>
                  {selectedTime && (
                    <button
                      type="button"
                      onClick={() => setSelectedTime('')}
                      className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <label htmlFor="dashboard-departure-time" className="sr-only">Time</label>
              <select
                id="dashboard-departure-time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full bg-transparent font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-1 focus:outline-none cursor-pointer"
                title="Select preferred departure time"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Any time</option>
                {TIME_SLOT_OPTIONS_15MIN.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. VEHICLE TYPE */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Car className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Vehicle</span>
              </span>
              <label htmlFor="vehicle-type-select" className="sr-only">Vehicle</label>
              <select
                id="vehicle-type-select"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full bg-transparent font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-1 focus:outline-none cursor-pointer"
              >
                <option value="Shared Cab" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Cab</option>
                {!cabOnly && <option value="Shared Auto" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Auto</option>}
              </select>
            </div>

            {/* 6. SEARCH BUTTON & HOSTEL QUICK OVERRIDE */}
            <div className="flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Home className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold">Pickup from {selectedHostel}</span>
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <Search className="w-4 h-4" />
                <span>Find rides</span>
              </button>
            </div>

          </div>

          {/* Quick Destination Pills for Instant 1-Tap Search */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Popular:</span>
            </span>
            {DESTINATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleQuickDestinationSelect(d.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDestId === d.id && hasSearched
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{d.icon}</span>
                <span>{d.name}</span>
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* 2-Column Section: Available Ride Slots (Left) & Active Journey (Right) */}
      <div className="space-y-6">
        {/* Left Column (2/3 width): Available ride slots */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-800 p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Available ride slots</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Departing from campus • {dateOptions.find((d) => d.value === selectedDate)?.label || 'Today'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllSlots((prev) => !prev)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-800/60 cursor-pointer"
            >
              <span>{showAllSlots ? 'Show fewer' : 'View all slots'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Featured Slot Cards Grid */}
          {slotsLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              Loading available ride slots...
            </div>
          ) : featuredSlots.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-800 space-y-1">
              <p className="font-semibold text-slate-600 dark:text-slate-300">No ride slots available</p>
              <p className="text-[11px] text-slate-400">Select another destination or date to view available 15-minute departures.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {featuredSlots.map((slot, idx) => {
                const isFull = slot.isFull;
                return (
                  <div
                    key={slot.slotKey || `featured_${idx}`}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>{slot.time12 || slot.time}</span>
                        </span>
                        </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-2">
                        {slot.vehicle === 'Shared Cab' ? 'Cab' : 'Auto'} • {slot.seatsFilled ?? 0} / {slot.maxSeats} seats
                      </div>
                    </div>

                    <div className="mt-4">
                      {isFull ? (
                        <div className="w-full py-2 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl text-center">
                          Full
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJoinSlot(slot)}
                          disabled={joiningSlotKey === slot.slotKey || slot.isPast || slot.isJoined}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-center"
                        >
                          {slot.isPast ? 'Departed' : slot.isJoined ? 'Joined' : joiningSlotKey === slot.slotKey ? 'Joining...' : 'Join Slot'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expandable full SlotPicker if View All Slots is toggled */}
          {showAllSlots && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <SlotPicker
                slots={slots}
                loading={slotsLoading}
                onJoinSlot={handleJoinSlot}
                joiningSlotKey={joiningSlotKey}
                initialJumpTime={selectedTime}
                direction={direction}
              />
            </div>
          )}
        </div>

      </div>

      {/* MAIN VIEW: EITHER POPULAR DISCOVERY OR AVAILABLE DEPARTURES */}
      {!hasSearched ? (
        <div className="space-y-10 animate-in fade-in duration-300">
          
          <button type="button" onClick={onNavigateToCommunities} className="text-sm font-semibold text-blue-600 dark:text-blue-400 underline">Travelling home? Open City Communities</button>

        </div>
      ) : (
        /* SECTION 4: SEARCH RESULTS & DEPARTURES VIEW */
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHasSearched(false)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to discovery</span>
                </button>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-1">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span>Available departures ({currentDestination.name})</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                15-minute departures for {selectedDate} ({selectedVehicle}). Join an active group or start a new one.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHasSearched(false)}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Change route
            </button>
          </div>

          {slotsError && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-xs font-semibold text-rose-800 dark:text-rose-200">
              Could not load slots: {slotsError}
            </div>
          )}

          {/* Slot Picker Component */}
          <SlotPicker
            slots={slots}
            loading={slotsLoading}
            onJoinSlot={handleJoinSlot}
            joiningSlotKey={joiningSlotKey}
            initialJumpTime={selectedTime}
            direction={direction}
          />
        </div>
      )}

      </div>
    </div>
  );
}
