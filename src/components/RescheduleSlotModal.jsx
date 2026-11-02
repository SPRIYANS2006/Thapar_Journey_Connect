import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import SlotPicker from './SlotPicker';
import { api } from '../services/api';
import { formatTime24to12 } from '../utils/matchingEngine';

const VEHICLES = ['Shared Cab', 'Shared Auto', 'Either'];

export default function RescheduleSlotModal({
  group,
  isOpen,
  onClose,
  onSuccess,
  triggerToast
}) {
  const [selectedDate, setSelectedDate] = useState(group?.date || 'Today');
  const [selectedVehicle, setSelectedVehicle] = useState(group?.transport || 'Shared Cab');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [targetSlot, setTargetSlot] = useState(null);
  const [penaltyPreview, setPenaltyPreview] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load slots for selected date & vehicle
  useEffect(() => {
    if (!group || !isOpen) return;
    let cancelled = false;
    // Asynchronous fetch
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const destId = group.destinationId || group.destination_id;
        const res = await api.getSlots({
          destinationId: destId,
          date: selectedDate,
          vehicle: selectedVehicle
        });
        if (!cancelled && res && res.slots) {
          setSlots(res.slots);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to load slots for rescheduling:', err);
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    };

    fetchSlots();

    return () => {
      cancelled = true;
    };
  }, [group, isOpen, selectedDate, selectedVehicle]);

  if (!isOpen || !group) return null;

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

  const handleSelectSlot = async (slot) => {
    // Prevent selecting current slot
    const isSameSlot =
      (group.slotKey && slot.slotKey && group.slotKey === slot.slotKey) ||
      (group.date === selectedDate && group.departureTime === slot.time);

    if (isSameSlot) {
      if (triggerToast) {
        triggerToast('You are already enrolled in this travel slot.', 'info');
      }
      return;
    }

    setTargetSlot(slot);

    // Fetch penalty preview
    try {
      const preview = await api.previewRescheduleSlot(group.id);
      setPenaltyPreview(preview);
    } catch {
      setPenaltyPreview({ penalty: 0, willIncurPenalty: false, hoursLeft: 99 });
    }
    setShowConfirm(true);
  };

  const handleConfirmReschedule = async () => {
    if (!targetSlot || !group) return;
    setIsSubmitting(true);
    try {
      const destId = group.destinationId || group.destination_id;
      const res = await api.rescheduleSlot({
        oldGroupId: group.id,
        targetDestinationId: destId,
        targetDate: selectedDate,
        targetTime: targetSlot.time,
        targetVehicle: targetSlot.vehicle,
        targetPickupPoint: group.pickupPoint
      });

      if (triggerToast) {
        triggerToast(
          res.penaltyApplied
            ? `Rescheduled! Late penalty (-${res.penaltyAmount}⭐) applied.`
            : `Successfully moved to ${targetSlot.time}!`,
          res.penaltyApplied ? 'warning' : 'success'
        );
      }

      if (onSuccess) {
        onSuccess(res.group);
      }
      onClose();
    } catch (err) {
      if (triggerToast) {
        triggerToast(
          err.message || 'Rescheduling failed. You remain in your current slot.',
          'error'
        );
      }
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-md">
                Reschedule Ride
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Group #{group.id}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Change Travel Date & Time
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atomic switch to any 15-minute slot for {group.destinationName}.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Booking Pill */}
        <div className="px-6 py-3 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-900 font-semibold">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>
              Current Slot: <strong>{formatTime24to12(group.departureTime)}</strong> ({group.date || 'Today'}) • {group.transport}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-700 text-[11px]">
            <MapPin className="w-3.5 h-3.5" />
            <span>{group.pickupPoint}</span>
          </div>
        </div>

        {/* Filters & Date Picker bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Select New Date</span>
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.display}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Vehicle Type
            </label>
            <div className="flex gap-2">
              {VEHICLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVehicle(v)}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
                    selectedVehicle === v
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Slots List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <SlotPicker
            slots={slots}
            loading={loadingSlots}
            onJoinSlot={handleSelectSlot}
            actionLabel="Switch to Slot"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Atomic swap: You stay safely in your current group if the new slot fills up.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Confirmation & Penalty Dialog Overlay */}
        {showConfirm && targetSlot && (
          <div className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    penaltyPreview?.willIncurPenalty
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {penaltyPreview?.willIncurPenalty ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">
                    Confirm Slot Change
                  </h3>
                  <p className="text-xs text-slate-500">
                    Switch ride to {targetSlot.time} ({selectedDate})
                  </p>
                </div>
              </div>

              {penaltyPreview?.willIncurPenalty ? (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Late Rescheduling Notice</span>
                  </div>
                  <p>
                    Your current group departs in{' '}
                    <strong>{penaltyPreview.hoursLeft} hours</strong>. Rescheduling
                    now will apply a late-change penalty of{' '}
                    <strong className="text-red-700">
                      -{penaltyPreview.penalty}⭐
                    </strong>{' '}
                    to your campus reliability rating.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
                  <p>
                    You are moving from <strong>{group.departureTime}</strong> to{' '}
                    <strong>{targetSlot.time}</strong> ({selectedDate}).
                  </p>
                  <p className="text-emerald-700 font-semibold">
                    ✓ No reliability penalty applies (ample notice).
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirm(false)}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Keep Current Slot
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmReschedule}
                  className={`py-3 px-4 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer ${
                    penaltyPreview?.willIncurPenalty
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  }`}
                >
                  {isSubmitting ? 'Moving Ride...' : 'Confirm Switch'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
