import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Truck, 
  Bike, 
  Car, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Phone, 
  RefreshCw, 
  X, 
  Plus, 
  Minus, 
  Camera,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { formatTime24to12 } from '../utils/matchingEngine';

const VEHICLES = [
  {
    type: 'Bike/Scooter',
    title: 'Bike / Scooter',
    icon: Bike,
    desc: 'Best for 1-2 small bags or backpacks',
    maxItems: 2,
    baseFare: 80
  },
  {
    type: 'Auto/e-rickshaw',
    title: 'Auto / E-Rickshaw',
    icon: Car,
    desc: 'Up to 4 trolley bags & boxes',
    maxItems: 4,
    baseFare: 180
  },
  {
    type: 'Tempo/Mini-truck',
    title: 'Tempo / Tata Ace',
    icon: Truck,
    desc: 'Heavy trunks, crates & bulk luggage',
    maxItems: 12,
    baseFare: 420
  }
];

const ITEM_TYPES = [
  { size: 'Small', label: 'Small Bag', desc: 'Backpack / Duffel / Handbag', price: 30 },
  { size: 'Medium', label: 'Medium Trolley', desc: 'Cabin Trolley (20"-24")', price: 60 },
  { size: 'Large', label: 'Large Trolley', desc: 'Check-in Trolley (28"+)', price: 100 },
  { size: 'Trunk-Box', label: 'Trunk / Metal Box', desc: 'Heavy iron box / Wooden crate', price: 180 }
];

const COMMON_DROPS = [
  'Patiala Railway Station',
  'Patiala Bus Stand / ISBT',
  'Patiala Cantt Railway Station',
  'Urban Estate Phase 1 & 2',
  'Tripuri / Model Town',
  'Rajpura Junction',
  'Ambala Cantt Railway Station',
  'Chandigarh ISBT Sector 43',
  'Chandigarh Airport',
  'Ludhiana Railway Station',
  'Delhi NCR / IGI Airport'
];

export default function LuggagePage({
  user,
  onNavigateToDashboard: _onNavigateToDashboard,
  triggerToast
}) {
  const [activeTab, setActiveTab] = useState('book'); // 'book' | 'my-luggage'
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [pickupLocation, setPickupLocation] = useState(user?.hostel || 'Main Gate (Near Executive Mess)');
  const [destination, setDestination] = useState('Patiala Railway Station');
  const [customDestination, setCustomDestination] = useState('');
  const [date, setDate] = useState('Today');
  const [slotTime, setSlotTime] = useState('14:00');
  const [vehicleType, setVehicleType] = useState('Tempo/Mini-truck');
  const [itemCounts, setItemCounts] = useState({
    Small: 0,
    Medium: 1,
    Large: 0,
    'Trunk-Box': 0
  });
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  // Data states
  const [quote, setQuote] = useState(null);
  const [_loadingQuote, setLoadingQuote] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedRequest, setBookedRequest] = useState(null);

  // My Luggage states
  const [myRequests, setMyRequests] = useState([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // Reschedule state for existing order
  const [reschedulingOrder, setReschedulingOrder] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('Today');
  const [rescheduleTime, setRescheduleTime] = useState('15:00');

  // Generate 30 days date options
  const dateOptions = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();
    let label = `${dayName}, ${dayNum} ${monthName}`;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    dateOptions.push({
      value: label,
      display: `${label} (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
    });
  }

  const effectiveDestination = destination === 'Other' ? (customDestination || 'Patiala City') : destination;

  // Build items array
  const formattedItems = Object.entries(itemCounts)
    .filter(([, count]) => count > 0)
    .map(([size, count]) => ({ size, count }));

  // Load quote when step 3 or 4 is reached or inputs change
  useEffect(() => {
    let cancelled = false;
    const loadQuote = async () => {
      setLoadingQuote(true);
      try {
        const res = await api.getLuggageQuote({
          destination: effectiveDestination,
          date,
          time: slotTime,
          vehicleType,
          items: formattedItems
        });
        if (!cancelled && res?.quote) setQuote(res.quote);
      } catch (err) {
        if (!cancelled) console.warn(err);
      } finally {
        if (!cancelled) setLoadingQuote(false);
      }
    };

    if (currentStep >= 3 && formattedItems.length > 0) {
      loadQuote();
    }
    return () => {
      cancelled = true;
    };
  }, [currentStep, effectiveDestination, date, slotTime, vehicleType, formattedItems]);

  // Load slots for step 2
  useEffect(() => {
    let cancelled = false;
    const loadSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await api.getLuggageSlots({
          destination: effectiveDestination,
          date,
          vehicleType
        });
        if (!cancelled && res?.slots) setSlots(res.slots);
      } catch (err) {
        if (!cancelled) console.warn(err);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    };

    if (currentStep === 2) {
      loadSlots();
    }
    return () => {
      cancelled = true;
    };
  }, [currentStep, effectiveDestination, date, vehicleType]);

  // Fetch student's luggage requests for "My Luggage" tab
  const fetchMyRequests = useCallback(async () => {
    setLoadingMyRequests(true);
    try {
      const res = await api.getMyLuggageRequests();
      if (res && res.all) {
        setMyRequests(res.all);
        if (selectedRequest) {
          const fresh = res.all.find((r) => r.id === selectedRequest.id);
          if (fresh) setSelectedRequest(fresh);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch luggage requests:', err);
    } finally {
      setLoadingMyRequests(false);
    }
  }, [selectedRequest]);

  useEffect(() => {
    let cancelled = false;
    const loadMyOrders = async () => {
      setLoadingMyRequests(true);
      try {
        const res = await api.getMyLuggageRequests();
        if (!cancelled && res?.all) setMyRequests(res.all);
      } catch (err) {
        if (!cancelled) console.warn(err);
      } finally {
        if (!cancelled) setLoadingMyRequests(false);
      }
    };

    if (activeTab === 'my-luggage') {
      loadMyOrders();
    }
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      if (triggerToast) triggerToast('Photo must be less than 2MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Submit Booking
  const handleBookLuggage = async () => {
    if (formattedItems.length === 0) {
      if (triggerToast) triggerToast('Please add at least 1 bag or trunk.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.createLuggageRequest({
        pickupLocation,
        destination: effectiveDestination,
        destinationAddress: customDestination,
        date,
        slotTime,
        items: formattedItems,
        notes,
        photoUrl: photoPreview || '',
        vehicleType
      });

      if (triggerToast) {
        triggerToast('Luggage request booked successfully! Check timeline.', 'success');
      }
      setBookedRequest(res.luggage);
      setCurrentStep(5); // Success confirmation step
      fetchMyRequests();
    } catch (err) {
      if (triggerToast) {
        triggerToast(err.message || 'Failed to book luggage transport.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Request
  const handleCancelRequest = async (id) => {
    setCancellingId(id);
    try {
      const res = await api.cancelLuggageRequest(id);
      if (triggerToast) {
        triggerToast(res.message || 'Luggage booking cancelled.', res.penaltyApplied ? 'warning' : 'info');
      }
      await fetchMyRequests();
    } catch (err) {
      if (triggerToast) triggerToast(err.message || 'Failed to cancel.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // Reschedule Request
  const handleRescheduleSubmit = async () => {
    if (!reschedulingOrder) return;
    try {
      const res = await api.rescheduleLuggageRequest(reschedulingOrder.id, {
        targetDate: rescheduleDate,
        targetSlotTime: rescheduleTime
      });
      if (triggerToast) {
        triggerToast(res.message || 'Pickup slot rescheduled!', 'success');
      }
      setReschedulingOrder(null);
      await fetchMyRequests();
    } catch (err) {
      if (triggerToast) triggerToast(err.message || 'Reschedule failed.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-3 py-0.5 rounded-full flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-300" />
                <span>Vendor Parcel Logistics</span>
              </span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-0.5 rounded-full border border-emerald-400/30">
                Official Campus Partner
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              TIET Luggage & Trunk Transport
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              Book tempos, autos, or bike couriers to carry your heavy luggage to the railway station, bus stand, or home. Tied up with verified local transport vendors.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 shrink-0">
            <button
              onClick={() => setActiveTab('book')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'book'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Book Vehicle</span>
            </button>
            <button
              onClick={() => setActiveTab('my-luggage')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'my-luggage'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>My Luggage ({myRequests.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: 4-STEP BOOKING WIZARD */}
      {/* ======================================================== */}
      {activeTab === 'book' && (
        <div className="space-y-6">
          {currentStep <= 4 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-sm">
              {/* Stepper Header */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                {[
                  { num: 1, label: 'Pickup & Drop' },
                  { num: 2, label: '10-Min Slot' },
                  { num: 3, label: 'Bags & Size' },
                  { num: 4, label: 'Vehicle & Price' }
                ].map((s) => (
                  <div
                    key={s.num}
                    onClick={() => {
                      if (s.num < currentStep) setCurrentStep(s.num);
                    }}
                    className={`p-3 rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      currentStep === s.num
                        ? 'bg-blue-600 text-white shadow-md'
                        : s.num < currentStep
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-white/20">
                      {s.num < currentStep ? '✓' : s.num}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: PICKUP & DROP */}
          {currentStep === 1 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                  Step 1 of 4
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Where should we pick up and deliver?
                </h2>
                <p className="text-xs text-slate-500">
                  Driver will meet you at the campus pickup point to load your bags.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup Location */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Campus Pickup Point (Hostel / Gate)</span>
                  </label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g. Tejas Hall (Hostel-J Gate) or Main Gate"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Defaulted from your TIET profile. You can change this if needed.
                  </p>
                </div>

                {/* Destination Drop */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Drop Destination</span>
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {COMMON_DROPS.map((dest) => (
                      <option key={dest} value={dest}>
                        {dest}
                      </option>
                    ))}
                    <option value="Other">Other / Custom City Address</option>
                  </select>

                  {destination === 'Other' && (
                    <input
                      type="text"
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      placeholder="Enter city, full address or landmark"
                      className="w-full mt-2 bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Pickup Slot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DATE AND 10-MINUTE PICKUP SLOT */}
          {currentStep === 2 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                    Step 2 of 4
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1">
                    Select 10-Minute Pickup Slot
                  </h2>
                  <p className="text-xs text-slate-500">
                    Vendor vehicle will arrive at {pickupLocation} within your chosen slot.
                  </p>
                </div>

                {/* Date Dropdown */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <select
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dateOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.display}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slot Cards Grid */}
              {loadingSlots ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Checking vendor capacity for slots...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[360px] overflow-y-auto p-1">
                  {slots
                    .filter((s) => !s.isPast)
                    .map((s) => {
                      const isSelected = slotTime === s.time;
                      return (
                        <button
                          key={s.time}
                          type="button"
                          disabled={s.isFull}
                          onClick={() => setSlotTime(s.time)}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40'
                              : s.isFull
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                              : s.hasPooling
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          {s.hasPooling && !isSelected && (
                            <span className="absolute -top-2 right-2 text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded-full shadow-xs">
                              Pool & Save
                            </span>
                          )}

                          <div className="font-mono font-black text-sm">
                            {formatTime24to12(s.time)}
                          </div>

                          <div className={`text-[10px] mt-1 font-semibold ${
                            isSelected ? 'text-blue-100' : s.isFull ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {s.isFull ? 'Full' : `${s.bookedCount}/${s.capacity} Booked`}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Bags</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ITEMS & SIZES */}
          {currentStep === 3 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                  Step 3 of 4
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  What items are you sending?
                </h2>
                <p className="text-xs text-slate-500">
                  Select item sizes so the vendor dispatches the right vehicle size.
                </p>
              </div>

              {/* Items Counter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ITEM_TYPES.map((item) => {
                  const count = itemCounts[item.size] || 0;
                  return (
                    <div
                      key={item.size}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                        count > 0
                          ? 'border-blue-400 bg-blue-50/20 shadow-xs'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{item.label}</h4>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            +₹{item.price}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setItemCounts((prev) => ({
                              ...prev,
                              [item.size]: Math.max(0, (prev[item.size] || 0) - 1)
                            }))
                          }
                          disabled={count === 0}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-sm text-slate-900">
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setItemCounts((prev) => ({
                              ...prev,
                              [item.size]: (prev[item.size] || 0) + 1
                            }))
                          }
                          className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-black shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Instructions & Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Handling Instructions / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Fragile computer monitor inside box, 3rd floor hostel room 312"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Photo Upload (Optional) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Attach Bag / Box Photo (Optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {photoPreview && (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200">
                      <img src={photoPreview} alt="Luggage preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (formattedItems.length === 0) {
                      if (triggerToast) triggerToast('Please add at least 1 item.', 'error');
                      return;
                    }
                    setCurrentStep(4);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Vehicle & Price</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: VEHICLE & PRICING */}
          {currentStep === 4 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                  Step 4 of 4
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Choose Vehicle & Confirm Price
                </h2>
                <p className="text-xs text-slate-500">
                  Select your preferred transport vehicle and review instant pricing.
                </p>
              </div>

              {/* Vehicle Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {VEHICLES.map((v) => {
                  const Icon = v.icon;
                  const isSelected = vehicleType === v.type;
                  return (
                    <div
                      key={v.type}
                      onClick={() => setVehicleType(v.type)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-black text-slate-900 text-base">{v.title}</h4>
                        <p className="text-xs text-slate-500">{v.desc}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Base fare:</span>
                        <strong className="text-slate-900 font-bold">₹{v.baseFare}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pooling Savings Banner (Porter/BlaBla style) */}
              {quote && quote.pooledSavings > 0 && (
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 rounded-2xl border border-emerald-300 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                      <span>Pool & Save Applied: You Save ₹{quote.pooledSavings}!</span>
                    </h4>
                    <p className="text-xs text-emerald-800">
                      {quote.poolCount - 1} other student(s) booked the same destination at {slotTime}. Transport cost is split evenly.
                    </p>
                  </div>
                </div>
              )}

              {/* Instant Fare Summary Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Fare Breakdown
                </h4>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Vehicle & Distance Base:</span>
                    <span>₹{quote?.combinedBase || 240}</span>
                  </div>

                  {quote && quote.pooledSavings > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Shared Transport Discount:</span>
                      <span>-₹{quote.pooledSavings}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Luggage Items Fee ({quote?.totalItemCount || 1} items):</span>
                    <span>₹{quote?.itemsTotal || 60}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                    <span>Total Estimated Fare:</span>
                    <span className="text-blue-700">₹{quote?.estimatedFare || 260}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    💵 Pay Cash / UPI to Driver on Pickup
                  </span>
                </div>
              </div>

              {/* Booking Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleBookLuggage}
                  className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Dispatching Request...</span>
                  ) : (
                    <>
                      <span>Confirm & Book Transport</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: BOOKING SUCCESS SCREEN */}
          {currentStep === 5 && bookedRequest && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  Request Confirmed #{bookedRequest.id}
                </span>
                <h3 className="text-2xl font-black text-slate-900 pt-2">
                  Luggage Transport Booked!
                </h3>
                <p className="text-xs text-slate-500">
                  Your request has been routed to our tied-up campus logistics vendor.
                </p>
              </div>

              {/* 4-Digit Pickup OTP Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-2">
                <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">
                  Pickup Handover OTP
                </span>
                <div className="text-4xl font-mono font-black tracking-widest text-emerald-400">
                  {bookedRequest.pickupOtp}
                </div>
                <p className="text-[11px] text-slate-300">
                  Share this 4-digit OTP with the driver when they arrive to verify collection.
                </p>
              </div>

              {/* Booking Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 space-y-2 text-left">
                <div className="flex justify-between">
                  <span>Pickup:</span>
                  <strong className="text-slate-900">{bookedRequest.pickupLocation}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Destination:</span>
                  <strong className="text-slate-900">{bookedRequest.destination}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Pickup Slot:</span>
                  <strong className="text-slate-900">
                    {formatTime24to12(bookedRequest.slotTime)} ({bookedRequest.date})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Fare:</span>
                  <strong className="text-blue-700 font-black">₹{bookedRequest.estimatedFare}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setBookedRequest(null);
                  }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Book Another Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('my-luggage');
                    setSelectedRequest(bookedRequest);
                  }}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  View Live Tracking
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MY LUGGAGE & TRACKING TIMELINE */}
      {/* ======================================================== */}
      {activeTab === 'my-luggage' && (
        <div className="space-y-6">
          {loadingMyRequests ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Loading your luggage requests...
            </div>
          ) : myRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-lg">No Luggage Bookings Yet</h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto">
                  Send heavy bags, iron trunks, or parcels to the railway station or home through our tied-up vendor.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('book');
                  setCurrentStep(1);
                }}
                className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Send Luggage Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: List of Requests */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-base">All Bookings</h3>
                  <button
                    onClick={fetchMyRequests}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {myRequests.map((req) => {
                    const isSelected = selectedRequest?.id === req.id;
                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-black text-slate-900">
                            #{req.id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : req.status === 'Picked Up' || req.status === 'In Transit'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="font-bold text-slate-900 truncate">
                            {req.destination}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatTime24to12(req.slotTime)} ({req.date})</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-slate-500">{req.totalItemsCount} items • {req.vehicleType}</span>
                            <span className="font-bold text-blue-700">₹{req.estimatedFare}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Tracking Timeline & Details */}
              <div className="lg:col-span-2">
                {selectedRequest ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md">
                            #{selectedRequest.id}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            selectedRequest.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedRequest.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {selectedRequest.status}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mt-1">
                          TIET → {selectedRequest.destination}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Pickup from {selectedRequest.pickupLocation}
                        </p>
                      </div>

                      {/* 4-digit OTP Pill (Only active if not cancelled/delivered) */}
                      {!['Delivered', 'Cancelled'].includes(selectedRequest.status) && (
                        <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl text-center shrink-0">
                          <div className="text-[10px] uppercase font-bold text-indigo-300">
                            Handover OTP
                          </div>
                          <div className="text-2xl font-mono font-black text-emerald-400">
                            {selectedRequest.pickupOtp}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assigned Driver Details (Visible after assignment) */}
                    {selectedRequest.driverName && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase text-blue-800">
                              Assigned Vendor Driver
                            </div>
                            <div className="font-bold text-slate-900 text-sm">
                              {selectedRequest.driverName}
                            </div>
                            <div className="text-xs font-mono text-slate-600">
                              Vehicle: {selectedRequest.vehicleNumber}
                            </div>
                          </div>
                        </div>

                        {selectedRequest.driverPhone && (
                          <a
                            href={`tel:${selectedRequest.driverPhone}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call {selectedRequest.driverPhone}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Timeline (Rapido/Porter-style) */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status Timeline
                      </h4>

                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {[
                          { s: 'Requested', label: 'Booking Received by Vendor', desc: 'Vendor checking available vehicles in your slot' },
                          { s: 'Vendor Assigned', label: 'Driver & Vehicle Assigned', desc: 'Driver dispatched to campus pickup point' },
                          { s: 'Picked Up', label: 'Luggage Collected (OTP Verified)', desc: 'Belongings loaded into vehicle' },
                          { s: 'In Transit', label: 'On Route to Destination', desc: 'Vehicle in transit' },
                          { s: 'Delivered', label: 'Safely Delivered', desc: 'Handed over at drop address' }
                        ].map((step, idx) => {
                          const timelineEntry = (selectedRequest.timeline || []).find(
                            (tl) => tl.status === step.s
                          );
                          const isDone = Boolean(timelineEntry);
                          const isCancelled = selectedRequest.status === 'Cancelled';

                          return (
                            <div key={step.s} className="relative flex items-start gap-3">
                              <span
                                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                                  isCancelled && idx > 0
                                    ? 'bg-slate-100 border-slate-300 text-slate-300'
                                    : isDone
                                    ? 'bg-emerald-600 border-white text-white shadow-xs'
                                    : 'bg-white border-slate-300 text-slate-400'
                                }`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </span>

                              <div>
                                <h5 className={`font-bold text-sm ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {step.label}
                                </h5>
                                <p className="text-xs text-slate-500">
                                  {timelineEntry?.note || step.desc}
                                </p>
                                {timelineEntry && (
                                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                                    {new Date(timelineEntry.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Bar for Request (Cancel / Reschedule / Rebook) */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      {!['Picked Up', 'In Transit', 'Delivered', 'Cancelled'].includes(selectedRequest.status) && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReschedulingOrder(selectedRequest);
                              setRescheduleDate(selectedRequest.date);
                              setRescheduleTime(selectedRequest.slotTime);
                            }}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Change Slot</span>
                          </button>

                          <button
                            type="button"
                            disabled={cancellingId === selectedRequest.id}
                            onClick={() => handleCancelRequest(selectedRequest.id)}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 flex items-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel Booking</span>
                          </button>
                        </div>
                      )}

                      {['Delivered', 'Cancelled'].includes(selectedRequest.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setDestination(selectedRequest.destination);
                            setPickupLocation(selectedRequest.pickupLocation);
                            setActiveTab('book');
                            setCurrentStep(1);
                          }}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-Book This Journey</span>
                        </button>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
                    Select a booking on the left to view live status timeline.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* Reschedule Slot Modal for Luggage */}
      {reschedulingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Change Pickup Slot</h3>
                <p className="text-xs text-slate-500">Order #{reschedulingOrder.id}</p>
              </div>
              <button
                onClick={() => setReschedulingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Date</label>
                <select
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {dateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.display}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target 10-Minute Time Slot</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReschedulingOrder(null)}
                className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescheduleSubmit}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
