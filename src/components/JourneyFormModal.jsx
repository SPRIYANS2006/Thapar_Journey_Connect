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

export default function JourneyFormModal({ destination, user, onClose, onSubmitJourney }) {
  const [selectedDestId, setSelectedDestId] = useState(destination?.id || 'railway');
  const [date, setDate] = useState('Today');
  const [departureTime, setDepartureTime] = useState('17:00'); // 5:00 PM
  const [flexibility, setFlexibility] = useState(15); // ±15 minutes
  const [hostel, setHostel] = useState(user?.hostel || 'HA');
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
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
                New Journey Request
              </span>
              <h2 className="text-xl font-bold text-white leading-tight">
                {selectedDestObj.name}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-200">
            Find fellow Thapar students departing around your schedule.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Destination Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pickup Point / Origin
            </label>
            <input
              type="text"
              value="TIET Campus (Main Gate / Hostel Block)"
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 cursor-not-allowed"
            />
          </div>

          {/* Date & Departure Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Date</span>
              </label>
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Today">Today (Sept 16)</option>
                <option value="Tomorrow">Tomorrow (Sept 17)</option>
                <option value="Sept 18">Sept 18</option>
                <option value="Sept 19">Sept 19</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Departure Time</span>
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Time Flexibility Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Time Flexibility</span>
              </label>
              <span className="text-xs text-blue-600 font-semibold">
                ±{flexibility} Minutes Window
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
                  ±{mins} mins
                </button>
              ))}
            </div>
            
            <div className="mt-2 bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Smart Matching Note:</strong> You don't need to leave at the exact same minute! Students departing within your ±{flexibility}m window will be matched.
              </span>
            </div>
          </div>

          {/* Hostel Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-blue-600" />
              <span>Your TIET Hostel</span>
            </label>
            <select
              value={hostel}
              onChange={(e) => setHostel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <optgroup label="Boys Hostels">
                {HOSTELS.filter(h => h.gender === 'Boys').map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </optgroup>
              <optgroup label="Girls Hostels (Official TIET Halls)">
                {HOSTELS.filter(h => h.gender === 'Girls').map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </optgroup>
              <optgroup label="PG / Research Hostels">
                {HOSTELS.filter(h => h.gender === 'Co-ed').map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Transport Preference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-600" />
              <span>Transport Preference</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Shared Cab', 'Shared Auto', 'Either'].map((pref) => (
                <button
                  type="button"
                  key={pref}
                  onClick={() => setTransport(pref)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    transport === pref
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 mt-4"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Find Travel Partners</span>
          </button>
        </form>

      </div>
    </div>
  );
}
