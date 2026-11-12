import React, { useState, useCallback, useMemo } from 'react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import SlotPicker from '../components/SlotPicker';
import AddFriendModal from '../components/AddFriendModal';
import { DESTINATIONS, HOSTELS } from '../data/mockData';
import { TIME_SLOT_OPTIONS_15MIN } from '../utils/matchingEngine';
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
  UserPlus,
  X,
  Sparkles,
  ShieldCheck,
  Users,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

let toastSeq = 0;
function makeToastId(prefix) {
  toastSeq = (toastSeq + 1) % 1000000;
  return `${prefix}_${toastSeq}`;
}

function getCurrentSlotTime() {
  const now = new Date();
  let minutes = Math.ceil(now.getMinutes() / 15) * 15;
  let hours = now.getHours();
  if (minutes >= 60) {
    minutes = 0;
    hours = (hours + 1) % 24;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function DashboardPage({ 
  user, 
  onSelectDestination: _onSelectDestination, 
  activeGroups = [], 
  onViewGroupDetails, 
  onJoinGroup: _onJoinGroup,
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
      const isoDate = d.toISOString().split('T')[0];
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();

      let label = `${weekday}, ${month} ${day}`;
      if (i === 0) label = `Today (${weekday}, ${month} ${day})`;
      if (i === 1) label = `Tomorrow (${weekday}, ${month} ${day})`;

      list.push({ value: isoDate, label, isToday: i === 0 });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  const [selectedTime, setSelectedTime] = useState(() => getCurrentSlotTime());
  const [selectedVehicle, setSelectedVehicle] = useState('Shared Cab');
  const [selectedHostel, setSelectedHostel] = useState(user?.hostel || HOSTELS[0].name);

  // Slots State (Only loaded when user presses Search)
  const [hasSearched, setHasSearched] = useState(false);
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
  const fetchSlots = useCallback(async (destId, dateStr, vehicleType) => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const res = await api.getSlots({
        destinationId: destId,
        date: dateStr,
        vehicle: vehicleType
      });
      if (res && res.slots) {
        setSlots(res.slots);
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
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setIsDestDropdownOpen(false);
    setHasSearched(true);
    fetchSlots(selectedDestId, selectedDate, selectedVehicle);
  };

  const handleQuickDestinationSelect = (destId) => {
    setSelectedDestId(destId);
    setIsDestDropdownOpen(false);
    setHasSearched(true);
    fetchSlots(destId, selectedDate, selectedVehicle);
  };

  // Join Slot Handler (Atomic Join or Lazy Creation)
  const handleJoinSlot = async (slot) => {
    setJoiningSlotKey(slot.slotKey);
    try {
      const res = await api.joinSlot({
        destinationId: slot.destinationId,
        date: slot.date,
        time: slot.time,
        vehicle: slot.vehicle,
        pickupPoint: 'Main Gate (Near Executive Mess)'
      });

      if (triggerToast) {
        triggerToast({
          id: makeToastId('join_slot'),
          type: 'success',
          title: res.created ? 'Group created' : 'Joined group',
          message: res.message || `Joined Group #${res.group.id} for ${slot.time}`,
          actionLabel: `View Group #${res.group.id}`,
          onAction: () => onViewGroupDetails && onViewGroupDetails(res.group.id)
        });
      }

      if (onRefreshGroups) {
        await onRefreshGroups().catch(() => {});
      }
      await fetchSlots(selectedDestId, selectedDate, selectedVehicle);

      if (onViewGroupDetails && res.group?.id) {
        onViewGroupDetails(res.group.id);
      }
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

  // Friend / Companion Management
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  const handleAddFriend = async (friendData) => {
    if (!activeUserGroup) return;
    setFriendActionLoading(true);
    try {
      const res = await api.addFriendToGroup(activeUserGroup.id, friendData);
      if (triggerToast) {
        triggerToast({
          id: makeToastId('friend_add'),
          type: 'success',
          title: 'Friend added',
          message: res.message || `Added ${friendData.name} to Group #${activeUserGroup.id}`
        });
      }
      if (onRefreshGroups) await onRefreshGroups().catch(() => {});
      if (hasSearched) await fetchSlots(selectedDestId, selectedDate, selectedVehicle);
    } catch (err) {
      if (triggerToast) {
        triggerToast({
          id: makeToastId('friend_err'),
          type: 'error',
          title: 'Could not add friend',
          message: err.message || 'Failed to add friend.'
        });
      }
      throw err;
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId, friendName) => {
    if (!activeUserGroup) return;
    setFriendActionLoading(true);
    try {
      const res = await api.removeFriendFromGroup(activeUserGroup.id, friendId);
      if (triggerToast) {
        triggerToast({
          id: makeToastId('friend_rm'),
          type: 'info',
          title: 'Friend removed',
          message: res.message || `Removed ${friendName || 'friend'} from Group #${activeUserGroup.id}.`
        });
      }
      if (onRefreshGroups) await onRefreshGroups().catch(() => {});
      if (hasSearched) await fetchSlots(selectedDestId, selectedDate, selectedVehicle);
    } catch (err) {
      if (triggerToast) {
        triggerToast({
          id: makeToastId('friend_rm_err'),
          type: 'error',
          title: 'Could not remove friend',
          message: err.message || 'Failed to remove friend.'
        });
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  const activeUserGroup = (activeGroups || []).find((g) =>
    g.members &&
    g.members.some(
      (m) =>
        (m.id && m.id === user?.id) ||
        (m.userId && m.userId === user?.id) ||
        (m.user_id && m.user_id === user?.id) ||
        (user?.name && m.name === user.name)
    )
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Disclaimer Banner */}
      <DisclaimerBanner />

      {/* PART 1: STICKY SEARCH CARD */}
      <div className="sticky top-20 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl dark:shadow-2xl dark:shadow-black/40 p-4 sm:p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Find a ride
            </h2>
            <span className="text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 hidden sm:inline-block">
              Every 15 min
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {currentDestination.name} • {currentDestination.distance}
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1. FROM: Fixed Thapar Campus */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>From</span>
              </span>
              <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-1">
                Thapar Institute
              </div>
            </div>

            {/* 2. TO: Searchable Dropdown with Type-Ahead */}
            <div className="relative bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>To</span>
              </span>
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
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{dest.avgCabFare}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. DATE: Picker (Today to +30 Days) */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Date</span>
              </span>
              <label htmlFor="travel-date-select" className="sr-only">Date</label>
              <select
                id="travel-date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-transparent font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-1 focus:outline-none cursor-pointer"
              >
                {dateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {opt.label}
                  </option>
                ))}
              </select>
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
                <option value="Shared Auto" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Auto</option>
                <option value="Either" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Either</option>
              </select>
            </div>

            {/* 6. SEARCH BUTTON & HOSTEL QUICK OVERRIDE */}
            <div className="flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Home className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold">Pickup from {selectedHostel.split(' ')[0]}</span>
                </span>
                <label htmlFor="hostel-quick-override" className="sr-only">Change hostel pickup</label>
                <select
                  id="hostel-quick-override"
                  value={selectedHostel}
                  onChange={(e) => setSelectedHostel(e.target.value)}
                  className="text-[10px] bg-transparent text-blue-700 dark:text-blue-400 font-bold focus:outline-none cursor-pointer"
                  title="Change hostel pickup"
                >
                  {HOSTELS.map((h) => (
                    <option key={h.id} value={h.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {h.id}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
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
                <span>{d.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Active Trip Quick Banner (If user belongs to a group) */}
      {activeUserGroup && (
        <div className="bg-white dark:bg-slate-900 border border-blue-200/90 dark:border-blue-900/60 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ring-1 ring-blue-500/10 dark:ring-blue-500/20 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-blue-500/20 shrink-0">
                #{activeUserGroup.id}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md">
                    Active ride
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {activeUserGroup.members?.length || 1}/{activeUserGroup.maxMembers || 4} riders
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                  TIET ➔ {activeUserGroup.destinationName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                  <span>Departure: <strong className="text-slate-700 dark:text-slate-200">{activeUserGroup.departureTime}</strong></span>
                  <span>•</span>
                  <span>Pickup: <strong className="text-slate-700 dark:text-slate-200">{activeUserGroup.pickupPoint}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(activeUserGroup.members?.length || 0) < (activeUserGroup.maxMembers || 4) && (
                <button
                  type="button"
                  onClick={() => setIsAddFriendOpen(true)}
                  disabled={friendActionLoading}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add friend</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onViewGroupDetails && onViewGroupDetails(activeUserGroup.id)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span>Open group chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Members & Companions in Active Group */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-1">Riders:</span>
            {(activeUserGroup.members || []).map((m) => {
              const isCompanion = Boolean(m.isCompanion);
              const isMyCompanion = isCompanion && (m.addedBy === user?.id || activeUserGroup.adminId === user?.id);
              const memberId = m.id || m.user_id || m.userId;
              return (
                <div
                  key={memberId}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold ${
                    isCompanion
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{m.name}</span>
                  {isCompanion && (
                    <span className="text-[10px] bg-amber-200/70 dark:bg-amber-800/60 px-1.5 py-0.2 rounded font-bold text-amber-800 dark:text-amber-200">
                      Friend
                    </span>
                  )}
                  {isMyCompanion && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(memberId, m.name)}
                      disabled={friendActionLoading}
                      title="Remove friend from slot"
                      className="ml-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100/60 dark:hover:bg-rose-950/60 rounded-full p-0.5 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN VIEW: EITHER POPULAR DISCOVERY OR AVAILABLE DEPARTURES */}
      {!hasSearched ? (
        <div className="space-y-10 animate-in fade-in duration-300">
          
          {/* Hero Welcome Showcase */}
          <div className="relative rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white p-8 sm:p-12 overflow-hidden shadow-xl">
            {/* Background Glow Accents */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Verified Thapar Transit Network</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                Share a cab from campus.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-indigo-200 to-sky-300">
                  Save up to 75% on every trip.
                </span>
              </h1>

              <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl">
                Match with students departing from your hostel quad. Book 15-minute departure slots to Chandigarh Airport, Delhi, Patiala stations, or join your hometown city community.
              </p>

              {/* Stat Highlights */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-black text-white">96</div>
                  <div className="text-[11px] text-blue-200 font-medium">Slots daily (every 15m)</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-black text-white">4 max</div>
                  <div className="text-[11px] text-blue-200 font-medium">Riders per cab</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-black text-white">75%</div>
                  <div className="text-[11px] text-blue-200 font-medium">Fare savings</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-black text-white">100%</div>
                  <div className="text-[11px] text-blue-200 font-medium">@thapar.edu verified</div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: POPULAR CAMPUS DESTINATIONS (Clickable Cards) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Popular campus destinations</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Tap any route to view live 15-minute departures and join fellow Thapar students.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DESTINATIONS.map((dest) => {
                // Calculate split estimate per rider
                const approxSplit = dest.id === 'chd_airport' 
                  ? '₹300 - ₹375'
                  : dest.id === 'del_airport'
                  ? '₹1,125 - ₹1,375'
                  : dest.id === 'railway'
                  ? '₹40 - ₹50'
                  : '₹30 - ₹40';

                return (
                  <div
                    key={dest.id}
                    onClick={() => handleQuickDestinationSelect(dest.id)}
                    className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl p-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 group-hover:scale-110 transition-transform">
                          {dest.icon}
                        </span>
                        <span className="text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                          Save 75%
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {dest.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {dest.distance}
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {dest.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">Your split</span>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">{approxSplit} <span className="text-[10px] font-normal text-slate-400">/ rider</span></span>
                      </div>
                      <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: EXPLORE THE FULL PLATFORM (Directly prompts users to explore!) */}
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Explore Thapar Journey Network</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Feature 1: Hometown City Communities */}
              <div 
                onClick={() => onNavigateToCommunities && onNavigateToCommunities()}
                className="group bg-gradient-to-br from-indigo-50/70 to-blue-50/70 dark:from-slate-900 dark:to-indigo-950/40 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Hometown City Hubs
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Heading home to Delhi, Ludhiana, Jaipur, Gurgaon, or Chandigarh for the break? Connect with students from your hometown to coordinate direct cabs and train cohorts.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 gap-1.5 group-hover:gap-2.5 transition-all">
                  <span>Explore City Hubs</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Feature 2: Hostel Quad Pickups */}
              <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/70 dark:from-slate-900 dark:to-emerald-950/40 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/50 p-6 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Home className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Hostel Quad Pickups
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Never drag heavy luggage across campus to the Main Gate. Select your hostel (Hostels A–M, PG, and girls' quads) so your co-passengers meet right at your quad gate.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selectable in search above</span>
                </div>
              </div>

              {/* Feature 3: Verified & Safe Rides */}
              <div className="bg-gradient-to-br from-blue-50/70 to-cyan-50/70 dark:from-slate-900 dark:to-cyan-950/40 rounded-3xl border border-blue-200/80 dark:border-blue-900/50 p-6 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Verified Students Only
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    All accounts require official @thapar.edu authentication. View co-rider reliability ratings, trip history, and coordinate via secure group chats.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Private in-app chat included</span>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 3: HOW IT WORKS IN 3 SIMPLE STEPS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                How Thapar Journey Connect works
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Simple, safe, and built specifically for TIET students.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Search your slot</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pick a destination, date, and preferred time window. Slots depart every 15 minutes.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Join or start a group</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Join an open group with existing co-riders, or start an empty slot with 1 tap. Up to 4 per cab.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Coordinate & save 75%</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chat in private ride rooms, confirm meeting at your hostel, and split cab fares equally.
                  </p>
                </div>
              </div>
            </div>
          </div>

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
            onViewGroup={onViewGroupDetails}
            joiningSlotKey={joiningSlotKey}
            initialJumpTime={selectedTime}
            activeGroupId={activeUserGroup?.id}
          />
        </div>
      )}

      {/* Add Friend to Slot Modal */}
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onAddFriend={handleAddFriend}
        groupDestination={activeUserGroup ? activeUserGroup.destinationName : 'Travel Slot'}
        currentSeats={activeUserGroup?.members?.length || 1}
        maxSeats={activeUserGroup?.maxMembers || 4}
      />

    </div>
  );
}
