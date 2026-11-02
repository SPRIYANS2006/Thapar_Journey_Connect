import React, { useState, useCallback, useMemo } from 'react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import SlotPicker from '../components/SlotPicker';
import { DESTINATIONS, HOSTELS } from '../data/mockData';
import { formatTime24to12 } from '../utils/matchingEngine';
import { 
  ArrowRight, 
  Clock, 
  MapPin, 
  Car, 
  Package, 
  Search, 
  Home, 
  Calendar,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

export default function DashboardPage({ 
  user, 
  onSelectDestination: _onSelectDestination, 
  activeGroups = [], 
  onViewGroupDetails, 
  onJoinGroup: _onJoinGroup,
  communities = [], 
  onNavigateToCommunities,
  onNavigateToSendLuggage,
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
  const [selectedTime, setSelectedTime] = useState('');
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

  // Fetch 10-minute slots
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
          id: `join_slot_${Date.now()}`,
          type: 'success',
          title: res.created ? '🎉 Group Created!' : '🎉 Joined Group!',
          message: res.message || `Successfully joined Group #${res.group.id} for ${slot.time}!`,
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
          id: `slot_err_${Date.now()}`,
          type: 'error',
          title: 'Could Not Book Slot',
          message: err.message || 'Unable to join slot. Please check single-ride policy or capacity.'
        });
      }
    } finally {
      setJoiningSlotKey(null);
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
  const userCommunity = user?.joinedCommunity
    ? communities.find((c) => c.id === user.joinedCommunity)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Disclaimer Banner */}
      <DisclaimerBanner />

      {/* PART 1.1: STICKY SEARCH CARD (MakeMyTrip / BlaBlaCar style) */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl p-5 sm:p-6 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Book a Scheduled Slot
            </h2>
            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 hidden sm:inline-block">
              10-Minute Departures
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {currentDestination.name} • {currentDestination.distance}
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1. FROM: Fixed Thapar Campus */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>From (Fixed Origin)</span>
              </span>
              <div className="font-extrabold text-slate-800 text-sm mt-1 truncate">
                Thapar Institute, Patiala
              </div>
              <span className="text-[10px] text-slate-400">Campus Main Gate</span>
            </div>

            {/* 2. TO: Searchable Dropdown with Type-Ahead */}
            <div className="relative bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-600" />
                <span>To (Destination)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsDestDropdownOpen((prev) => !prev)}
                className="w-full text-left font-extrabold text-slate-900 text-sm mt-1 flex items-center justify-between gap-1 cursor-pointer truncate"
              >
                <span className="truncate">{currentDestination.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
              <span className="text-[10px] text-slate-400 truncate">
                {currentDestination.avgCabFare}
              </span>

              {/* Dropdown Menu */}
              {isDestDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-2 space-y-1.5 max-h-72 overflow-y-auto animate-in fade-in duration-150">
                  <div className="relative px-1 pt-1 pb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Type destination name..."
                      value={destSearchQuery}
                      onChange={(e) => setDestSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        selectedDestId === dest.id
                          ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{dest.icon}</span>
                          <span>{dest.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{dest.distance}</div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{dest.avgCabFare}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. DATE: Picker (Today to +30 Days) */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>Travel Date</span>
              </span>
              <label htmlFor="travel-date-select" className="sr-only">Select Travel Date</label>
              <select
                id="travel-date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-transparent font-extrabold text-slate-900 text-sm mt-1 focus:outline-none cursor-pointer"
              >
                {dateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">Up to 30 days ahead</span>
            </div>

            {/* 4. DEPARTURE TIME */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>Departure Time</span>
                </span>
                {selectedTime && (
                  <button
                    type="button"
                    onClick={() => setSelectedTime('')}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <label htmlFor="dashboard-departure-time" className="sr-only">Select Departure Time</label>
              <input
                id="dashboard-departure-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full bg-transparent font-extrabold text-slate-900 text-sm mt-1 focus:outline-none cursor-pointer"
                title="Select preferred departure time"
              />
              <span className="text-[10px] text-slate-400 truncate">
                {selectedTime ? `${formatTime24to12(selectedTime)} IST` : 'Any departure time'}
              </span>
            </div>

            {/* 5. VEHICLE TYPE */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Car className="w-3 h-3 text-indigo-600" />
                <span>Vehicle Type</span>
              </span>
              <label htmlFor="vehicle-type-select" className="sr-only">Select Vehicle Type</label>
              <select
                id="vehicle-type-select"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full bg-transparent font-extrabold text-slate-900 text-sm mt-1 focus:outline-none cursor-pointer"
              >
                <option value="Shared Cab">Shared Cab (Max 4)</option>
                <option value="Shared Auto">Shared Auto (Max 3)</option>
                <option value="Either">Either Vehicle</option>
              </select>
              <span className="text-[10px] text-slate-400">Split fare equally</span>
            </div>

            {/* 6. SEARCH BUTTON & HOSTEL QUICK OVERRIDE */}
            <div className="flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span className="flex items-center gap-1">
                  <Home className="w-3 h-3 text-blue-600" />
                  <span className="font-semibold">{selectedHostel.split(' ')[0]}</span>
                </span>
                <label htmlFor="hostel-quick-override" className="sr-only">Change hostel pickup</label>
                <select
                  id="hostel-quick-override"
                  value={selectedHostel}
                  onChange={(e) => setSelectedHostel(e.target.value)}
                  className="text-[10px] bg-transparent text-blue-700 font-bold focus:outline-none cursor-pointer"
                  title="Change hostel pickup"
                >
                  {HOSTELS.map((h) => (
                    <option key={h.id} value={h.name}>
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
                <span>Search Slots</span>
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Active Trip Quick Banner (If user belongs to a group) */}
      {activeUserGroup && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-base shadow-md shrink-0">
              #{activeUserGroup.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md">
                  Active Joined Group
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {activeUserGroup.members?.length || 1}/{activeUserGroup.maxMembers || 4} Members
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-base mt-0.5">
                TIET → {activeUserGroup.destinationName}
              </h4>
              <p className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                <span>⏰ Departure: {activeUserGroup.departureTime}</span>
                <span>•</span>
                <span>📍 Pickup: {activeUserGroup.pickupPoint}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onViewGroupDetails && onViewGroupDetails(activeUserGroup.id)}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>Open Group & Chat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PART 2.1: PROMINENT "SEND LUGGAGE" CARD (Porter / Rapido style) */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-white/15 backdrop-blur-md rounded-full text-emerald-200 text-xs font-extrabold border border-white/10">
            <Package className="w-3.5 h-3.5" />
            <span>Campus Luggage Transport (Vendor-Based)</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Sending Bags or Trunks Home?
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm font-normal leading-relaxed">
            Book verified local tempo, auto, or bike couriers to deliver heavy luggage to the station or home.
            <strong className="text-white ml-1">Pool with hostel peers to slash delivery fares up to 50%!</strong>
          </p>
        </div>

        <button
          onClick={() => onNavigateToSendLuggage && onNavigateToSendLuggage()}
          className="w-full sm:w-auto px-6 py-3.5 bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Package className="w-4 h-4 text-emerald-600" />
          <span>Book Luggage Transport</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* PART 1.2: 10-MINUTE SLOTS (BlaBlaCar-style slot cards, available only after Search) */}
      {!hasSearched ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200 mx-auto flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-slate-900">
              Find Scheduled Travel Departures
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Choose your destination, travel date, preferred departure time, and vehicle above, then click <strong>"Search Slots"</strong> to view available 10-minute departures with verified TIET students.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 font-semibold">
              ⏱️ 10-minute slot intervals
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 font-semibold">
              🚗 Split cab fare up to 4-ways
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 font-semibold">
              🛡️ Campus-verified co-riders
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" />
                <span>Available Time Slots ({currentDestination.name})</span>
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                10-minute departures for {selectedDate}{selectedTime ? ` around ${formatTime24to12(selectedTime)}` : ''}. Join an active group with peers or start a fresh slot!
              </p>
            </div>
          </div>

          {slotsError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-semibold text-rose-800">
              Error loading slots: {slotsError}
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

      {/* Community Quick Highlight Card */}
      {userCommunity ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-blue-200 flex items-center justify-center text-3xl shadow-xs shrink-0">
              {userCommunity.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Your Hometown Community
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  👥 {userCommunity.membersCount} TIET Members
                </span>
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg mt-0.5">
                {userCommunity.name} ({userCommunity.state})
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {userCommunity.description}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToCommunities && onNavigateToCommunities()}
            className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <span>Open Notice Board</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-3xl shadow-xs shrink-0">
              📍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                  Hometown Hub
                </span>
                <span className="text-xs text-amber-600 font-semibold">
                  Not Enrolled Yet
                </span>
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg mt-0.5">
                Join Your City Community
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Connect with students heading home to Delhi NCR, Tri-City, Ludhiana, etc. for festival breaks.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToCommunities && onNavigateToCommunities()}
            className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <span>Explore Communities</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
