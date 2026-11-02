import React, { useState } from 'react';
import { UserPlus, X, Users, AlertCircle, Check } from 'lucide-react';

export default function AddFriendModal({
  isOpen,
  onClose,
  onAddFriend,
  groupDestination = 'Travel Slot',
  currentSeats = 1,
  maxSeats = 4
}) {
  const [friendName, setFriendName] = useState('');
  const [friendHostel, setFriendHostel] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!friendName.trim()) {
      setError("Enter your friend's name.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAddFriend({
        name: friendName.trim(),
        hostel: friendHostel.trim(),
        phone: friendPhone.trim()
      });
      setFriendName('');
      setFriendHostel('');
      setFriendPhone('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add friend to slot.');
    } finally {
      setLoading(false);
    }
  };

  const seatsLeft = maxSeats - currentSeats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Add a friend</h3>
              <p className="text-blue-100 text-xs">Reserve a seat for your friend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <span className="font-bold text-blue-900">{groupDestination}</span>
            <span className="font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left
            </span>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Rohan Sharma"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Hostel or location</label>
            <input
              type="text"
              placeholder="e.g. Hostel J / Day Scholar"
              value={friendHostel}
              onChange={(e) => setFriendHostel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Phone (optional)</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={friendPhone}
              onChange={(e) => setFriendPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1 border border-slate-200/60">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>How it works:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1">
              <li>Reserves a seat in your slot.</li>
              <li>Fare splits equally among all riders.</li>
              <li>You can remove your friend anytime.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || seatsLeft <= 0}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Adding...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Add friend</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
