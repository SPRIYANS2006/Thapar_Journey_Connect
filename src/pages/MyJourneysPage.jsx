import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  MessageSquare, 
  ArrowRight,
  Star
} from 'lucide-react';
import { formatTime24to12 } from '../utils/matchingEngine';

export default function MyJourneysPage({ activeGroups, currentUser, onViewGroupDetails, onOpenChat }) {
  const [activeTab, setActiveTab] = useState('upcoming');

  const upcomingJourneys = (activeGroups || []).filter(g =>
    g.members && g.members.some(m => (m.id && m.id === currentUser?.id) || (m.user_id && m.user_id === currentUser?.id))
  );

  const completedJourneys = [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md">
            Journey History
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            My Student Journeys
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage your upcoming TIET transit groups and past completed journeys.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming ({upcomingJourneys.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedJourneys.length})
          </button>
        </div>
      </div>

      {/* UPCOMING JOURNEYS TAB */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingJourneys.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">No Upcoming Journeys</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                You have no active travel requests. Select a destination from the Dashboard to find travel partners!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingJourneys.map((group) => {
                return (
                  <div
                    key={group.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                            #{group.id}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              TIET → {group.destinationName}
                            </span>
                            <h3 className="font-bold text-slate-900 text-base mt-0.5">
                              Group #{group.id}
                            </h3>
                          </div>
                        </div>

                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          group.status === 'Confirmed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {group.status || 'Active'}
                        </span>
                      </div>

                      {/* Journey Metadata */}
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-600 mb-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>Departure Time: <strong className="text-slate-900 font-bold">{formatTime24to12(group.departureTime)}</strong> ({group.date})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          <span>Pickup Point: <strong className="text-slate-900 font-semibold">{group.pickupPoint}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span>Members: <strong className="text-slate-900 font-semibold">{group.members.length} / {group.maxMembers} Students</strong></span>
                        </div>
                      </div>

                      {/* Members Avatar Row */}
                      <div className="flex items-center gap-2 mb-6">
                        <span className="text-xs text-slate-500 font-semibold">Travelers:</span>
                        <div className="flex -space-x-2">
                          {group.members.map((m) => (
                            <Avatar
                              key={m.id}
                              src={m.avatar}
                              name={m.name}
                              size="w-7 h-7"
                              textSize="text-[10px]"
                              rounded="rounded-full"
                              bg="bg-slate-800"
                              className="border-2 border-white"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => onOpenChat(group.id)}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => onViewGroupDetails(group.id)}
                        className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <span>View Details</span>
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
          {completedJourneys.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-lg">No Completed Journeys Yet</h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto">
                  Your past shared rides and student reviews will be archived here once you finish your upcoming journeys.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {completedJourneys.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md border border-slate-200">
                        Group #{trip.groupId}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">
                      TIET → {trip.destinationName}
                    </h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                      <div>Date: <strong className="text-slate-800 font-semibold">{trip.date}</strong></div>
                      <div>Departure: <strong className="text-slate-800 font-semibold">{formatTime24to12(trip.departureTime)}</strong></div>
                      <div>Pickup: <strong className="text-slate-800 font-semibold">{trip.pickupPoint}</strong></div>
                      <div>Travel Partners: <strong className="text-slate-800 font-semibold">{trip.partners.join(', ')}</strong></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Ride Reliability</span>
                    <div className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-4 h-4 fill-amber-500" />
                      <span>{trip.rating} / 5.0</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
