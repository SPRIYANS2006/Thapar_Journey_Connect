import React from 'react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import DestinationCard from '../components/DestinationCard';
import { DESTINATIONS } from '../data/mockData';
import { Sparkles, Users, ArrowRight, Clock, MapPin } from 'lucide-react';

export default function DashboardPage({ 
  user, 
  onSelectDestination, 
  activeGroups, 
  onViewGroupDetails, 
  communities = [], 
  onNavigateToCommunities 
}) {
  const activeUserGroup = (activeGroups || []).find(g =>
    g.members && g.members.some(m => (m.id && m.id === user?.id) || (m.user_id && m.user_id === user?.id))
  );
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
