import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Home, 
  Car, 
  Sliders, 
  CheckCircle2, 
  Info 
} from 'lucide-react';
import { DESTINATIONS, HOSTELS } from '../data/mockData';
import { TIME_SLOT_OPTIONS_15MIN } from '../utils/matchingEngine';

export default function JourneyFormModal({ destination, user, onClose, onSubmitJourney }) {
  const [selectedDestId, setSelectedDestId] = useState(destination?.id || 'railway');
  
  // Dynamically generate the next 15 days starting from the current date
  const availableDates = React.useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 15; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });

      let label = '';
      let value = '';

      if (i === 0) {
        label = `Today (${weekday}, ${monthName} ${dayNum})`;
        value = 'Today';
      } else if (i === 1) {
        label = `Tomorrow (${weekday}, ${monthName} ${dayNum})`;
        value = 'Tomorrow';
      } else {
        label = `${weekday}, ${monthName} ${dayNum}`;
        value = `${monthName} ${dayNum}`;
      }

      list.push({ value, label });
    }
    return list;
  }, []);

  const [date, setDate] = useState('Today');

  // Dynamically calculate departure time (current time + 45m rounded to next 15 mins)
  const [departureTime, setDepartureTime] = useState(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 45 * 60 * 1000);
    const mins = Math.ceil(future.getMinutes() / 15) * 15;
    if (mins >= 60) {
      future.setHours(future.getHours() + 1);
      future.setMinutes(0);
    } else {
      future.setMinutes(mins);
    }
    const hh = String(future.getHours()).padStart(2, '0');
    const mm = String(future.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  const [flexibility, setFlexibility] = useState(15); // ±15 minutes
  const [hostel, setHostel] = useState(user?.hostel && user.hostel !== 'HA' ? user.hostel : '');
  const [transport, setTransport] = useState('Shared Cab');

  const selectedDestObj = DESTINATIONS.find(d => d.id === selectedDestId) || DESTINATIONS[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    const journeyData = {
      destinationId: selectedDestId,
      destinationName: selectedDestObj.name,
      origin: 'TIET Campus',
      date,
      departureTime,
      flexibility,
      hostel,
      transport
    };
    onSubmitJourney(journeyData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl p-2 bg-white/10 rounded-2xl border border-white/20">
              {selectedDestObj.icon}
            </span>
            <div>
              <span className="text-xs font-semibold text-blue-200">
                Find a ride
              </span>
              <h2 className="text-xl font-bold text-white leading-tight">
                {selectedDestObj.name}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-200">
            Find students departing around your schedule.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Destination Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Destination</span>
            </label>
            <select
              value={selectedDestId}
              onChange={(e) => setSelectedDestId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {DESTINATIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* From Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              From
            </label>
            <input
              type="text"
              value="Thapar Institute"
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 cursor-not-allowed"
            />
          </div>

          {/* Date & Departure Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Date</span>
              </label>
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {availableDates.map((item, idx) => (
                  <option key={idx} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Time (optional)</span>
              </label>
              <label htmlFor="modal-departure-time" className="sr-only">Time</label>
              <select
                id="modal-departure-time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="">Any time</option>
                {TIME_SLOT_OPTIONS_15MIN.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Flexibility Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Time window</span>
              </label>
              <span className="text-xs text-blue-600 font-semibold">
                ±{flexibility} min
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 30].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setFlexibility(mins)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    flexibility === mins
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ±{mins} min
                </button>
              ))}
            </div>
            
            <div className="mt-2 bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Students departing within your ±{flexibility} min window will be matched.
              </span>
            </div>
          </div>

          {/* Hostel Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-blue-600" />
              <span>Hostel</span>
            </label>
            <select
              value={hostel}
              onChange={(e) => setHostel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Choose Your Hostel / Hall --</option>
              <optgroup label="Boys Hostels">
                {HOSTELS.filter(h => h.gender === 'Boys').map(h => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </optgroup>
              <optgroup label="Girls Hostels">
                {HOSTELS.filter(h => h.gender === 'Girls').map(h => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </optgroup>
              <optgroup label="PG / Research Hostels">
                {HOSTELS.filter(h => h.gender === 'Co-ed').map(h => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Transport Preference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-600" />
              <span>Vehicle</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Shared Cab', label: 'Cab' },
                { id: 'Shared Auto', label: 'Auto' },
                { id: 'Either', label: 'Either' }
              ].map((pref) => (
                <button
                  type="button"
                  key={pref.id}
                  onClick={() => setTransport(pref.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    transport === pref.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pref.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Find rides</span>
          </button>
        </form>

      </div>
    </div>
  );
}
