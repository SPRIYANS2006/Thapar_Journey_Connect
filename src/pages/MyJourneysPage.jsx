import React, { useState, useEffect } from 'react';
import HeroBanner from '../components/HeroBanner';
import { 
  Calendar, 
  Clock, 
  Users, 
  Car,
  Home,
  X
} from 'lucide-react';
import { formatTime24to12 } from '../utils/matchingEngine';
import { api } from '../services/api';
import RescheduleSlotModal from '../components/RescheduleSlotModal';

export default function MyJourneysPage({
  activeGroups,
  currentUser: _currentUser,
  onViewGroupDetails,
  onOpenChat,
  onRefresh,
  triggerToast: _triggerToast,
  onFindRide: _onFindRide
}) {
  const [fetchedJourneys, setFetchedJourneys] = useState(null);
  const [completedJourneys, setCompletedJourneys] = useState([]);
  const [rescheduleGroup, setRescheduleGroup] = useState(null);

  useEffect(() => {
    let active = true;
    api.getMyGroups()
      .then((data) => {
        if (active) {
          setFetchedJourneys(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.warn('Failed to load active journeys:', err);
      });

    api.getGroupHistory()
      .then((history) => {
        if (active) {
          setCompletedJourneys(Array.isArray(history) ? history : []);
        }
      })
      .catch((err) => {
        console.warn('Failed to load completed journeys:', err);
      });

    if (onRefresh) {
      onRefresh().catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [onRefresh]);

  const upcomingJourneys = fetchedJourneys !== null
    ? fetchedJourneys
    : (Array.isArray(activeGroups) ? activeGroups : []);

  return (
    <div className="animate-in fade-in duration-300">
      {/* Top Hero Banner */}
      <HeroBanner
        tag="YOUR JOURNEYS"
        title="My Journeys"
        subtitle="Manage your upcoming and past rides. View details, coordinate with your group, or make changes."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

      {/* SECTION 1: ACTIVE JOURNEYS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-800 p-6 transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Journeys</h2>
          <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800">
            {upcomingJourneys.length > 0 ? upcomingJourneys.length : 2}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Your upcoming and ongoing trips.
        </p>

        <div className="space-y-3.5">
          {(upcomingJourneys.length > 0 ? upcomingJourneys : [
            {
              id: '101',
              destinationName: 'Patiala',
              date: 'Today, Nov 13',
              departureTime: '13:30',
              pickupPoint: 'Agira Hostel',
              members: [{ id: 1 }, { id: 2 }, { id: 3 }],
              maxMembers: 4,
              vehicle: 'Cab',
              farePerPerson: 350,
              status: 'Confirmed'
            },
            {
              id: '102',
              destinationName: 'Delhi',
              date: 'Sat, Nov 15',
              departureTime: '07:00',
              pickupPoint: 'Thapar Institute',
              members: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
              maxMembers: 6,
              vehicle: 'Cab',
              farePerPerson: 1600,
              status: 'Grouped'
            }
          ]).map((group) => {
            const isConfirmed = group.status === 'Confirmed';
            const isGrouped = group.status === 'Grouped' || group.status === 'Open';
            return (
              <div
                key={group.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Icon & Route Info */}
                <div className="flex items-center gap-3.5 min-w-[260px]">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    isConfirmed 
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600' 
                      : 'bg-blue-50 dark:bg-blue-950/70 text-blue-600'
                  }`}>
                    {isConfirmed ? <Car className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Thapar → {group.destinationName || 'Destination'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{group.date || 'Today'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTime24to12(group.departureTime)} ({group.departureTime})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Pickup & Capacity */}
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span>Pickup: <strong className="text-slate-800 dark:text-slate-100">{group.pickupPoint || 'Campus Gate'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{group.members?.length || 1} / {group.maxMembers || 4} seats</span>
                  </div>
                </div>

                {/* Fare & Vehicle */}
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{group.vehicle || 'Cab'}</span>
                  </div>
                  <div className="mt-0.5">
                    <strong className="text-slate-900 dark:text-white font-bold text-sm">₹{group.farePerPerson || group.totalFare || 350}</strong> <span className="text-[11px] text-slate-400">per rider</span>
                  </div>
                </div>

                {/* Status Pill & Action Buttons */}
                <div className="flex items-center gap-3 justify-end flex-wrap">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isConfirmed
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 flex items-center gap-1.5'
                      : 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 flex items-center gap-1.5'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <span>{isConfirmed ? 'Confirmed' : 'Grouped'}</span>
                  </span>

                  {isGrouped && (
                    <button
                      type="button"
                      onClick={() => onOpenChat ? onOpenChat(group.id) : onViewGroupDetails && onViewGroupDetails(group.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Open Group</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onViewGroupDetails && onViewGroupDetails(group.id)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <span>View Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRescheduleGroup(group)}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reschedule</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: RECENT JOURNEYS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-800 p-6 transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Journeys</h2>
          <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800">
            {completedJourneys.length > 0 ? completedJourneys.length : 2}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Your completed or cancelled trips.
        </p>

        <div className="space-y-3.5">
          {(completedJourneys.length > 0 ? completedJourneys : [
            {
              id: '99',
              destinationName: 'Chandigarh',
              date: 'Fri, Nov 8',
              departureTime: '14:00',
              pickupPoint: 'Agira Hostel',
              members: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
              maxMembers: 4,
              vehicle: 'Cab',
              farePerPerson: 700,
              status: 'Confirmed'
            },
            {
              id: '98',
              destinationName: 'Delhi',
              date: 'Sun, Nov 3',
              departureTime: '11:00',
              pickupPoint: 'Thapar Institute',
              members: [],
              maxMembers: 4,
              vehicle: 'Cab',
              farePerPerson: 1600,
              status: 'Cancelled'
            }
          ]).map((trip) => {
            const isCancelled = trip.status === 'Cancelled';
            return (
              <div
                key={trip.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Icon & Route Info */}
                <div className="flex items-center gap-3.5 min-w-[260px]">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    isCancelled 
                      ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-500' 
                      : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600'
                  }`}>
                    <Car className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Thapar → {trip.destinationName || 'Destination'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{trip.date}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTime24to12(trip.departureTime)} ({trip.departureTime})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Pickup & Capacity */}
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span>Pickup: <strong className="text-slate-800 dark:text-slate-100">{trip.pickupPoint || 'Thapar Institute'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{trip.members?.length > 0 ? `${trip.members.length} / ${trip.maxMembers} seats` : '—'}</span>
                  </div>
                </div>

                {/* Fare & Vehicle */}
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{trip.vehicle || 'Cab'}</span>
                  </div>
                  <div className="mt-0.5">
                    <strong className="text-slate-900 dark:text-white font-bold text-sm">₹{trip.farePerPerson || 700}</strong> <span className="text-[11px] text-slate-400">per rider</span>
                  </div>
                </div>

                {/* Status Pill & Action Button */}
                <div className="flex items-center gap-3 justify-end">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isCancelled
                      ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1'
                      : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 flex items-center gap-1.5'
                  }`}>
                    {isCancelled ? <X className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    <span>{isCancelled ? 'Cancelled' : 'Confirmed'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onViewGroupDetails && onViewGroupDetails(trip.id || trip.groupId)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reschedule Slot Modal */}
      {rescheduleGroup && (
        <RescheduleSlotModal
          group={rescheduleGroup}
          isOpen={Boolean(rescheduleGroup)}
          onClose={() => setRescheduleGroup(null)}
          onSuccess={async () => {
            setRescheduleGroup(null);
            if (onRefresh) {
              await onRefresh().catch(() => {});
            }
            try {
              const fresh = await api.getMyGroups();
              setFetchedJourneys(Array.isArray(fresh) ? fresh : []);
            } catch {
              // ignore
            }
          }}
          triggerToast={_triggerToast}
        />
      )}

      </div>
    </div>
  );
}
