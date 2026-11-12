import React, { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  MessageSquare, 
  ArrowRight,
  Star,
  Sparkles
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
  triggerToast,
  onFindRide
}) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [fetchedJourneys, setFetchedJourneys] = useState(null);
  const [completedJourneys, setCompletedJourneys] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
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
          setLoadingCompleted(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load completed journeys:', err);
        if (active) {
          setLoadingCompleted(false);
        }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Campus ride management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            My journeys
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Your upcoming departures and completed trip records.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Upcoming{upcomingJourneys.length > 0 ? ` (${upcomingJourneys.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Past{completedJourneys.length > 0 ? ` (${completedJourneys.length})` : ''}
          </button>
        </div>
      </div>

      {/* UPCOMING JOURNEYS TAB */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingJourneys.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">No rides planned</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
                  Find a ride from the dashboard to match with fellow students.
                </p>
              </div>
              {onFindRide && (
                <button
                  type="button"
                  onClick={onFindRide}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Find a ride
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingJourneys.map((group) => {
                return (
                  <div
                    key={group.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                            #{group.id}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                {group.direction === 'returning'
                                  ? `${group.origin || 'Pickup'} ➔ Thapar`
                                  : `Thapar ➔ ${group.destinationName}`}
                              </span>
                              {group.direction === 'returning' && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                  ↩ Return
                                </span>
                              )}
                              {group.isCommunityRide && (
                                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                  {group.communityName} Hub
                                </span>
                              )}
                            </div>
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1">
                              {group.isCommunityRide ? `${group.communityName} Travel Cohort` : `Group #${group.id}`}
                            </h3>
                          </div>
                        </div>

                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          group.status === 'Confirmed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {group.status || 'Active'}
                        </span>
                      </div>

                      {/* Journey Metadata */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 mb-5">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>Departure: <strong className="text-slate-900 dark:text-white font-bold">{formatTime24to12(group.departureTime)}</strong> ({group.date})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Pickup: <strong className="text-slate-900 dark:text-white font-semibold">{group.pickupPoint}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Riders: <strong className="text-slate-900 dark:text-white font-semibold">{group.members?.length || 0} / {group.maxMembers}</strong></span>
                        </div>
                        {group.isCommunityRide && group.farePerPerson > 0 && (
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                            <span>Fare split: <strong>₹{group.farePerPerson}</strong> / rider</span>
                          </div>
                        )}
                      </div>

                      {/* Members Avatar Row */}
                      <div className="flex items-center gap-2 mb-5">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Travelers:</span>
                        <div className="flex -space-x-2">
                          {group.members.map((m) => (
                            <span key={m.id} className="ring-2 ring-white dark:ring-slate-900 rounded-full inline-block">
                              <Avatar
                                src={m.avatar}
                                name={m.name}
                                size="w-7 h-7"
                                textSize="text-[10px]"
                                rounded="rounded-full"
                              />
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={`grid gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 ${group.isCommunityRide ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      <button
                        onClick={() => onOpenChat(group.id)}
                        className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span>Chat</span>
                      </button>

                      {!group.isCommunityRide && (
                        <button
                          onClick={() => setRescheduleGroup(group)}
                          className="py-2.5 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer"
                          title="Change travel date or time"
                        >
                          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Reschedule</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewGroupDetails(group.id)}
                        className="py-2.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED JOURNEYS TAB */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {loadingCompleted ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 text-sm">
              Loading completed journeys...
            </div>
          ) : completedJourneys.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">No past rides</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto">
                  Your completed rides and ratings will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {completedJourneys.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {trip.isCommunityRide ? '📍 Community Ride' : `Group #${trip.id || trip.groupId}`}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      {trip.direction === 'returning'
                        ? `${trip.origin || 'Pickup'} ➔ Thapar Institute`
                        : `Thapar Institute ➔ ${trip.destinationName}`}
                    </h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <div>Date: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{trip.date}</strong></div>
                      <div>Departure: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{formatTime24to12(trip.departureTime)}</strong></div>
                      <div>Pickup: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{trip.pickupPoint}</strong></div>
                      <div>Travel Partners: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{(trip.partners || (trip.members || []).map((m) => m.name)).join(', ') || 'Solo Travel'}</strong></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 dark:text-slate-500">Ride Reliability</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-amber-500" />
                      <span>{trip.rating || 5.0} / 5.0</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          triggerToast={triggerToast}
        />
      )}

    </div>
  );
}
