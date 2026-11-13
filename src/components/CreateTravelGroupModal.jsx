import React, { useState } from 'react';
import { 
  X, 
  Train, 
  Bus, 
  Calendar, 
  Clock, 
  MapPin, 
  Info
} from 'lucide-react';
import { api } from '../services/api';

export default function CreateTravelGroupModal({
  isOpen,
  onClose,
  defaultType = 'Train',
  community,
  allCommunities = [],
  onSuccess,
  triggerToast
}) {
  const [type, setType] = useState(defaultType); // 'Train' | 'Bus'
  const [selectedCommunityId, setSelectedCommunityId] = useState(community?.id || (allCommunities[0]?.id || 'del'));
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [departureTime, setDepartureTime] = useState('08:00');
  const [boardingPoint, setBoardingPoint] = useState(() => {
    return defaultType === 'Train' ? 'Patiala Railway Station' : 'Patiala Bus Stand';
  });
  const [destination, setDestination] = useState(() => community?.name || 'New Delhi');
  const [trainNumber, setTrainNumber] = useState('');
  const [travelClass, setTravelClass] = useState('CC');
  const [busOperator, setBusOperator] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTypeChange = (newType) => {
    setType(newType);
    setError('');
    if (newType === 'Train') {
      if (!boardingPoint || boardingPoint === 'Patiala Bus Stand') {
        setBoardingPoint('Patiala Railway Station');
      }
    } else {
      if (!boardingPoint || boardingPoint === 'Patiala Railway Station') {
        setBoardingPoint('Patiala Bus Stand');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }

    if (!date) {
      setError('Please select travel date.');
      return;
    }

    if (!departureTime || !/^\d{1,2}:\d{2}$/.test(departureTime.trim())) {
      setError('Valid departure time in HH:mm format is required.');
      return;
    }

    if (!boardingPoint.trim()) {
      setError(type === 'Train' ? 'Boarding station is required.' : 'Boarding point is required.');
      return;
    }

    if (!destination.trim()) {
      setError('Destination is required.');
      return;
    }

    if (type === 'Train' && !trainNumber.trim()) {
      setError('Train number or train name is required.');
      return;
    }

    if (type === 'Bus' && !busOperator.trim()) {
      setError('Bus operator name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type,
        communityId: selectedCommunityId,
        title: title.trim(),
        date,
        departureTime: departureTime.trim(),
        boardingPoint: boardingPoint.trim(),
        destination: destination.trim(),
        trainNumber: type === 'Train' ? trainNumber.trim() : '',
        travelClass: type === 'Train' ? travelClass : '',
        busOperator: type === 'Bus' ? busOperator.trim() : '',
        description: description.trim()
      };

      const res = await api.createTravelGroup(payload);
      if (triggerToast) {
        triggerToast({
          id: `tg_created_${Date.now()}`,
          type: 'success',
          title: 'Group created',
          message: `${type} group "${title.trim()}" is now live!`
        });
      }
      if (onSuccess) {
        onSuccess(res.group);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create travel group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              type === 'Train' 
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' 
                : 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
            }`}>
              {type === 'Train' ? <Train className="w-5 h-5" /> : <Bus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Create {type} Travel Group
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coordinate group travel with fellow students
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleTypeChange('Train')}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              type === 'Train'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Train className="w-4 h-4" />
            <span>Train Group</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('Bus')}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              type === 'Bus'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Bus Group</span>
          </button>
        </div>

        {/* Policy Info Notice */}
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Self-booked tickets:</span>
            <p className="text-[11px] text-blue-700/90 dark:text-blue-300">
              Students purchase their own tickets individually. This group is for coordinating cohort departure, meetup, and journeying together.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Destination Community & Group Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                City Community
              </label>
              <select
                value={selectedCommunityId}
                onChange={(e) => {
                  setSelectedCommunityId(e.target.value);
                  const found = allCommunities.find((c) => c.id === e.target.value);
                  if (found) setDestination(found.name);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {allCommunities.length > 0 ? (
                  allCommunities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                ) : (
                  <option value="del">Delhi NCR</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Group Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'Train' ? 'e.g. Shatabdi Cohort to Delhi' : 'e.g. PRTC Volvo to Delhi ISBT'}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Train/Bus Specific Fields */}
          {type === 'Train' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Train Number / Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  placeholder="e.g. 12005 / Kalka Shatabdi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Travel Class
                </label>
                <select
                  value={travelClass}
                  onChange={(e) => setTravelClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="CC">CC (AC Chair Car)</option>
                  <option value="EC">EC (Executive Chair Car)</option>
                  <option value="3A">3A (AC 3 Tier)</option>
                  <option value="2A">2A (AC 2 Tier)</option>
                  <option value="1A">1A (First AC)</option>
                  <option value="SL">SL (Sleeper)</option>
                  <option value="2S">2S (Second Sitting)</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bus Operator / Service <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={busOperator}
                onChange={(e) => setBusOperator(e.target.value)}
                placeholder="e.g. PRTC Express, Zingbus, IntrCity SmartBus, Volvo AC"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          )}

          {/* Date & Departure Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Departure Time <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Boarding Point & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{type === 'Train' ? 'Boarding Station' : 'Boarding Point'} <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                value={boardingPoint}
                onChange={(e) => setBoardingPoint(e.target.value)}
                placeholder={type === 'Train' ? 'e.g. Patiala Railway Station' : 'e.g. Patiala Bus Stand / Bypass'}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Destination <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. New Delhi, Chandigarh Sector 43"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Journey Notes (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Meeting at Station Gate 1 at 5:00 PM; coach C3 booking recommended"
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer ${
                type === 'Train'
                  ? 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
                  : 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
              }`}
            >
              {loading ? 'Creating...' : `Create ${type} Group`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
