import React from 'react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import DestinationCard from '../components/DestinationCard';
import Avatar from '../components/Avatar';
import { DESTINATIONS } from '../data/mockData';
import { Sparkles, Users, ArrowRight, Clock, MapPin, UserPlus } from 'lucide-react';
import { formatTime24to12 } from '../utils/matchingEngine';

export default function DashboardPage({ 
  user, 
  onSelectDestination, 
  activeGroups, 
  onViewGroupDetails, 
  onJoinGroup,
  communities = [], 
  onNavigateToCommunities 
}) {
  const activeUserGroup = (activeGroups || []).find(g =>
    g.members && g.members.some(m => (m.id && m.id === user?.id) || (m.user_id && m.user_id === user?.id) || (user?.name && m.name === user.name))
  );
  const openGroups = (activeGroups || []).filter(g => g.status === 'Open' || g.status === 'Confirmed');
  const userCommunity = user?.joinedCommunity ? communities.find(c => c.id === user.joinedCommunity) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-blue-200 text-xs font-semibold mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Welcome, {user?.name?.split(' ')[0] || 'Student'}{user?.hostel ? ` (${user.hostel})` : ''}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Where are you travelling?
          </h1>

          <p className="text-slate-200 text-sm sm:text-base mt-2 font-normal leading-relaxed">
            Choose your transit destination or connect with your hometown city community to coordinate weekend carpools and train companions.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateToCommunities && onNavigateToCommunities()}
              className="px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Explore City Communities</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Community Quick Highlight Card */}
      {userCommunity ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 flex items-center justify-center text-2xl shadow-xs shrink-0">
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
              <h4 className="font-extrabold text-slate-900 text-base mt-0.5">
                {userCommunity.name} ({userCommunity.state})
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {userCommunity.description}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToCommunities && onNavigateToCommunities()}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <span>Open Notice Board</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-xs shrink-0">
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
              <h4 className="font-extrabold text-slate-900 text-base mt-0.5">
                Join Your City Community
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Connect with students heading home to Delhi NCR, Tri-City, Ludhiana, etc. for festival breaks.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToCommunities && onNavigateToCommunities()}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <span>Explore Communities</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Trip Quick Banner (If user belongs to a group) */}
      {activeUserGroup && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-base shadow-md">
              #{activeUserGroup.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md">
                  Active Joined Group
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {activeUserGroup.members.length}/{activeUserGroup.maxMembers} Members
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
            onClick={() => onViewGroupDetails(activeUserGroup.id)}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Group & Chat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Campus Travel Groups Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Live Ride Groups on Campus</span>
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Active student travel groups departing from TIET. Join an open ride or start a new group below!
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            {openGroups.length} Active {openGroups.length === 1 ? 'Group' : 'Groups'}
          </span>
        </div>

        {openGroups.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-2 shadow-xs">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">No Active Ride Groups Formed Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Be the first to create a travel group for your upcoming trip! Pick a destination below to get matched.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {openGroups.map((group) => {
              const isFull = (group.members || []).length >= (group.maxMembers || 4);
              const isUserMember = group.members && group.members.some(m => 
                (m.id && m.id === user?.id) || 
                (m.user_id && m.user_id === user?.id) ||
                (user?.name && m.name === user.name)
              );

              return (
                <div 
                  key={group.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                          #{group.id}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {group.destinationName}
                          </h4>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            group.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : isFull ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {group.status === 'Confirmed' ? 'Confirmed' : isFull ? 'Full (4/4)' : 'Open For Riders'}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {group.members.length}/{group.maxMembers || 4}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Departure: {formatTime24to12(group.departureTime)} ({group.date || 'Today'})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Pickup: {group.pickupPoint}</span>
                      </div>
                    </div>

                    {/* Members Avatars preview */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Riders:</span>
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {(group.members || []).map((m, idx) => (
                          <Avatar
                            key={idx}
                            src={m.avatar}
                            name={m.name}
                            size="w-6 h-6"
                            textSize="text-[10px]"
                            rounded="rounded-full"
                            bg="bg-slate-800"
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium ml-1 truncate">
                        ({group.members.map(m => m.name.split(' ')[0]).join(', ')})
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {isUserMember ? (
                      <button
                        onClick={() => onViewGroupDetails(group.id)}
                        className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Open My Group & Chat</span>
                      </button>
                    ) : isFull ? (
                      <div className="w-full py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center border border-slate-200">
                        Group Full (4/4 Members)
                      </div>
                    ) : (
                      <button
                        onClick={() => onJoinGroup ? onJoinGroup(group.id) : onViewGroupDetails(group.id)}
                        className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Join Group #{group.id} ({group.members.length}/4)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Destination Grid Title */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Select Destination
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Click any destination to start matching with TIET students.
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            4 Core Transit Hubs
          </span>
        </div>

        {/* 4 Destination Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DESTINATIONS.map((dest) => (
            <DestinationCard
              key={dest.id}
              destination={dest}
              onSelect={onSelectDestination}
            />
          ))}
        </div>
      </div>

      {/* Informational Feature Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <h3 className="font-bold text-lg text-slate-900 mb-6 text-center">
          How Thapar Journey Connect Works
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center mx-auto mb-3">
              1
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Submit Journey Window</h4>
            <p className="text-slate-500 text-xs mt-1">
              Select destination, date, departure time, flexibility range, and your hostel.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center mx-auto mb-3">
              2
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Smart Match Ranking</h4>
            <p className="text-slate-500 text-xs mt-1">
              Engine calculates time overlap & hostel proximity to pair compatible students.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center mx-auto mb-3">
              3
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Group & Coordinate</h4>
            <p className="text-slate-500 text-xs mt-1">
              Form 2-4 student groups, pick up at Main Gate, and chat to coordinate.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
