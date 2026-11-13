import React, { useState, useCallback, useMemo, useEffect } from 'react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import SlotPicker from '../components/SlotPicker';
import AddFriendModal from '../components/AddFriendModal';
import HeroBanner from '../components/HeroBanner';
import { DESTINATIONS, HOSTELS } from '../data/mockData';
import { TIME_SLOT_OPTIONS_15MIN } from '../utils/matchingEngine';
import { 
  ArrowRight, 
  ArrowLeft,
  ArrowLeftRight,
  Clock, 
  MapPin, 
  Car, 
  Search, 
  Home, 
  Calendar,
  ChevronDown,
  ChevronRight,
  UserPlus,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
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
  const [direction, setDirection] = useState('departing'); // 'departing' (Going / Thapar -> Dest) or 'returning' (Coming back / Dest -> Thapar)

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
        vehicle: vehicleType,
        direction: tripDir
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
        setSlots(res.slots);
      }
    }).catch((err) => {
      console.warn('Initial slot fetch failed:', err.message);
    });

    return () => {
      active = false;
    };
  }, [selectedDestId, selectedDate, selectedVehicle, direction]);

  // Featured 3 slots for top dashboard view
  const featuredSlots = useMemo(() => {
    if (!slots || slots.length === 0) {
      const baseTime = selectedTime || '13:30';
      const [hStr, mStr] = baseTime.split(':');
      const h = parseInt(hStr || '13', 10);
      const m = parseInt(mStr || '30', 10);

      const makePreview = (minsToAdd) => {
        const total = h * 60 + m + minsToAdd;
        const slotH = Math.floor(total / 60) % 24;
        const slotM = total % 60;
        const time24 = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
        const ampm = slotH >= 12 ? 'PM' : 'AM';
        const h12 = slotH % 12 || 12;
        const label12 = `${h12}:${String(slotM).padStart(2, '0')} ${ampm}`;
        return {
          slotKey: `preview_${time24}`,
          destinationId: selectedDestId,
          date: selectedDate,
          time: time24,
          time12: label12,
          vehicle: selectedVehicle === 'Either' ? 'Shared Cab' : selectedVehicle,
          memberCount: minsToAdd === 0 ? 3 : minsToAdd === 15 ? 2 : 4,
          capacity: 4,
          farePerRider: '₹350'
        };
      };
      return [makePreview(0), makePreview(15), makePreview(30)];
    }

    let subset = slots;
    if (selectedTime) {
      const idx = slots.findIndex((s) => s.time >= selectedTime);
      if (idx !== -1) {
        subset = slots.slice(idx, idx + 3);
      }
    }
    if (subset.length < 3) {
      subset = slots.slice(0, 3);
    }
    return subset.map((s) => ({
      ...s,
      time12: s.time12 || s.time,
      farePerRider: s.farePerRider || (s.fare && s.capacity ? `₹${Math.round(s.fare / s.capacity)}` : '₹350')
    }));
  }, [slots, selectedTime, selectedDestId, selectedDate, selectedVehicle]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setIsDestDropdownOpen(false);
    setHasSearched(true);
    fetchSlots(selectedDestId, selectedDate, selectedVehicle, direction);
  };

  const handleQuickDestinationSelect = (destId) => {
    setSelectedDestId(destId);
    setIsDestDropdownOpen(false);
    setHasSearched(true);
    fetchSlots(destId, selectedDate, selectedVehicle, direction);
  };

  const handleToggleDirection = () => {
    const nextDir = direction === 'departing' ? 'returning' : 'departing';
    setDirection(nextDir);
    if (hasSearched) {
      fetchSlots(selectedDestId, selectedDate, selectedVehicle, nextDir);
    }
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
        pickupPoint: defaultPickup,
        direction: slot.direction || direction
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
      await fetchSlots(selectedDestId, selectedDate, selectedVehicle, direction);

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
              <span>Save up to 75%</span>
            </span>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Disclaimer Banner */}
        <DisclaimerBanner />

        {/* PART 1: STICKY SEARCH CARD */}
        <div className="sticky top-20 z-30 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-6 transition-colors">
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

            {/* Direction Switcher & Swap Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (direction !== 'departing') {
                      setDirection('departing');
                      fetchSlots(selectedDestId, selectedDate, selectedVehicle, 'departing');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    direction === 'departing'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Depart campus</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (direction !== 'returning') {
                      setDirection('returning');
                      fetchSlots(selectedDestId, selectedDate, selectedVehicle, 'returning');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    direction === 'returning'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Return to campus</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleDirection}
                className="p-1.5 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
                title="Switch trip direction"
                aria-label="Switch trip direction between departing and returning"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Switch</span>
              </button>
            </div>
          </div>

        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1 & 2. Dynamic From / To with Switch Support */}
            {direction === 'departing' ? (
              <>
                {/* 1. FROM: Thapar Campus */}
                <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>From</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleDirection}
                      className="text-[10px] text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 p-0.5 cursor-pointer"
                      title="Switch direction"
                      aria-label="Switch direction"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
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
                    <button
                      type="button"
                      onClick={handleToggleDirection}
                      className="text-[10px] text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 p-0.5 cursor-pointer"
                      title="Switch direction"
                      aria-label="Switch direction"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
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
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{dest.avgCabFare}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* 1. FROM: Returning Pickup Destination */}
                <div className="relative bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>From (Pickup)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleDirection}
                      className="text-[10px] text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 p-0.5 cursor-pointer"
                      title="Switch direction"
                      aria-label="Switch direction"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
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
                          placeholder="Type pickup point..."
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

                {/* 2. TO: Thapar Campus */}
                <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>To (Campus)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleDirection}
                      className="text-[10px] text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 p-0.5 cursor-pointer"
                      title="Switch direction"
                      aria-label="Switch direction"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-1">
                    Thapar Institute
                  </div>
                </div>
              </>
            )}

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
                  <span className="font-semibold">{direction === 'returning' ? 'Drop at' : 'Pickup from'} {selectedHostel.split(' ')[0]}</span>
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
                <span>{d.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* 2-Column Section: Available Ride Slots (Left) & Active Journey (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Available ride slots */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-800 p-6 transition-colors">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {featuredSlots.map((slot, idx) => {
              const isFull = (slot.memberCount || slot.members?.length || 0) >= (slot.capacity || 4);
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
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {slot.farePerRider || '₹350'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                          per rider
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-2">
                      {slot.vehicle === 'Shared Cab' ? 'Cab' : 'Auto'} • {slot.memberCount || slot.members?.length || 0} / {slot.capacity || 4} seats
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
                        disabled={joiningSlotKey === slot.slotKey}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-center"
                      >
                        {joiningSlotKey === slot.slotKey ? 'Joining...' : 'Join Slot'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expandable full SlotPicker if View All Slots is toggled */}
          {showAllSlots && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <SlotPicker
                slots={slots}
                loading={slotsLoading}
                onJoinSlot={handleJoinSlot}
                onViewGroup={onViewGroupDetails}
                joiningSlotKey={joiningSlotKey}
                initialJumpTime={selectedTime}
                activeGroupId={activeUserGroup?.id}
                direction={direction}
              />
            </div>
          )}
        </div>

        {/* Right Column (1/3 width): Your active journey */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-800 p-6 flex flex-col justify-between transition-colors">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-blue-600" />
              <span>Your active journey</span>
            </h3>

            {activeUserGroup ? (
              <div
                onClick={() => onViewGroupDetails && onViewGroupDetails(activeUserGroup.id)}
                className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4.5 cursor-pointer hover:border-emerald-400 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Confirmed</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-emerald-600" />
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    Thapar → {activeUserGroup.destinationName || 'Patiala'}
                  </h4>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Today, {activeUserGroup.departureTime || '1:30 PM'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cab • {activeUserGroup.members?.length || 1} riders</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center mx-auto">
                  <Car className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  No active journey
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Join a slot above to coordinate a shared cab.
                </p>
              </div>
            )}
          </div>

          {activeUserGroup && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddFriendOpen(true)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add friend</span>
              </button>
              <button
                type="button"
                onClick={() => onViewGroupDetails && onViewGroupDetails(activeUserGroup.id)}
                className="flex-1 py-2 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Open chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Trip Quick Banner (If user belongs to a group) */}
      {activeUserGroup && (
        <div className="bg-white dark:bg-slate-900 border border-blue-200/90 dark:border-blue-900/60 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                #{activeUserGroup.id}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                    Active ride
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {activeUserGroup.members?.length || 1}/{activeUserGroup.maxMembers || 4} riders
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
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
          <div className="relative rounded-2xl bg-[#10264E] dark:bg-[#0c1e3d] text-white p-6 sm:p-10 border border-blue-900/40 shadow-xs space-y-6 transition-colors">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-semibold text-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Verified Thapar Transit Network</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Share a cab from campus.<br />
                <span className="text-blue-300">
                  Save up to 75% on every trip.
                </span>
              </h1>

              <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                Match with students departing from your hostel quad. Book 15-minute departure slots to Chandigarh Airport, Delhi, Patiala stations, or join your hometown city community.
              </p>

              {/* Stat Highlights */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">96</div>
                  <div className="text-[11px] text-blue-200 font-medium">Slots daily (every 15m)</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">4 max</div>
                  <div className="text-[11px] text-blue-200 font-medium">Riders per cab</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">75%</div>
                  <div className="text-[11px] text-blue-200 font-medium">Fare savings</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">100%</div>
                  <div className="text-[11px] text-blue-200 font-medium">@thapar.edu verified</div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: POPULAR CAMPUS DESTINATIONS (Clickable Cards) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
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
                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 group-hover:scale-105 transition-transform">
                          {dest.icon}
                        </span>
                        <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                          Save 75%
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{approxSplit} <span className="text-[10px] font-normal text-slate-400">/ rider</span></span>
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

          {/* SECTION 2: EXPLORE THE FULL PLATFORM */}
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Explore Thapar Journey Network</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Feature 1: Hometown City Communities */}
              <div 
                onClick={() => onNavigateToCommunities && onNavigateToCommunities()}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Hometown City Hubs
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Heading home to Delhi, Ludhiana, Jaipur, Gurgaon, or Chandigarh for the break? Connect with students from your hometown to coordinate direct cabs and train cohorts.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1.5 group-hover:gap-2.5 transition-all">
                  <span>Explore City Hubs</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Feature 2: Hostel Quad Pickups */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Home className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Hostel Quad Pickups
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Never drag heavy luggage across campus to the Main Gate. Select your hostel (Hostels A–M, PG, and girls' quads) so your co-passengers meet right at your quad gate.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selectable in search above</span>
                </div>
              </div>

              {/* Feature 3: Verified & Safe Rides */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Verified Students Only
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    All accounts require official @thapar.edu authentication. View co-rider reliability ratings, trip history, and coordinate via secure group chats.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Private in-app chat included</span>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 3: HOW IT WORKS IN 3 SIMPLE STEPS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
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
            direction={direction}
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
    </div>
  );
}
