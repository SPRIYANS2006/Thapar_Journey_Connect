import React from 'react';
import Avatar from '../components/Avatar';
import { 
  ArrowLeft, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Home, 
  UserPlus, 
  MessageSquare,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatTime24to12 } from '../utils/matchingEngine';

export default function MatchingResultsPage({ 
  journeyReq, 
  matchedStudents, 
  activeGroups, 
  currentUser,
  onBack, 
  onJoinGroup, 
  onCreateGroupWithStudent 
}) {
  const currentUid = currentUser?.id;
  const destName = journeyReq?.destinationName || 'Selected Transit Point';
  const filteredGroups = (activeGroups || []).filter(g => g.destinationId === journeyReq?.destinationId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Navigation & Header */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md">
                Matching Results
              </span>
              <span className="text-xs text-slate-500">
                TIET Campus → {destName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              Compatible Travel Partners
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Matches are ranked using departure time, hostel proximity and destination compatibility.
            </p>
          </div>

          {/* User Request Summary Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 shrink-0 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Target Departure: {formatTime24to12(journeyReq?.departureTime)} (±{journeyReq?.flexibility}m)</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span>Hostel: <strong className="text-slate-800">{journeyReq?.hostel}</strong></span>
              <span>•</span>
              <span>Pref: <strong className="text-slate-800">{journeyReq?.transport}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE GROUPS SECTION */}
      {filteredGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Existing Open Groups for {destName}</span>
            </h2>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              {filteredGroups.length} Active Group Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGroups.map((group) => {
              const isFull = (group.members || []).length >= (group.maxMembers || 4);
              const isUserMember = group.members && group.members.some(m => (m.id && m.id === currentUid) || (m.user_id && m.user_id === currentUid));

              return (
                <div 
                  key={group.id}
                  className="bg-white rounded-3xl border border-indigo-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                        #{group.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">
                            Group #{group.id}
                          </h3>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            isFull ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isFull ? 'Full (4/4)' : 'Open'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Target Departure: {formatTime24to12(group.departureTime)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-indigo-600">
                        {group.matchScore}%
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Group Match
                      </div>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-bold text-slate-700">Members ({group.members.length}/4)</span>
                      <span>Pickup: {group.pickupPoint}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {group.members.map((m) => (
                        <div key={m.id} className="bg-white p-2 rounded-xl border border-slate-200/80 flex items-center gap-2 text-xs">
                          <Avatar
                            src={m.avatar}
                            name={m.name}
                            size="w-6 h-6"
                            textSize="text-[10px]"
                            rounded="rounded-full"
                            bg="bg-slate-700"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-800 truncate block">{m.name}</span>
                            <span className="text-[10px] text-slate-500">{m.hostel} • {formatTime24to12(m.departureTime)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  {isUserMember ? (
                    <button
                      onClick={() => onJoinGroup(group.id)}
                      className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>View My Group & Chat</span>
                    </button>
                  ) : isFull ? (
                    <div className="w-full py-2.5 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center border border-slate-200">
                      Group Full (4/4 Members)
                    </div>
                  ) : (
                    <button
                      onClick={() => onJoinGroup(group.id)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Join Group #{group.id} ({group.members.length}/4 Members)</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INDIVIDUAL MATCHED STUDENTS CARDS */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span>Individual Matched TIET Students</span>
        </h2>

        {matchedStudents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-blue-200 p-8 sm:p-10 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-xl">You're the First Student on this Departure Slot!</h3>
              <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto mt-1.5 leading-relaxed">
                No one else has registered for this exact time yet. Create Group #1 now so when other Thapar students heading to <strong className="text-slate-900">{destName}</strong> search, they can instantly find and join your ride!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                onClick={() => onCreateGroupWithStudent({
                  id: 'me_open',
                  name: 'Open Group',
                  hostel: journeyReq?.hostel,
                  departureTime: journeyReq?.departureTime
                })}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Ride Group (1/4 Members)</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🚕 *Thapar Journey Connect Ride Share*
Heading from TIET campus to ${destName} at ${formatTime24to12(journeyReq?.departureTime)} (${journeyReq?.date || 'Today'}).
Looking for co-passengers to share cab fare!
Join my group on Thapar Journey Connect.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-2"
              >
                <span>Share to Batch WhatsApp Group</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchedStudents.map((item) => {
              const { student, matchInfo } = item;
              return (
                <div
                  key={student.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Avatar & Match % */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={student.avatar}
                          name={student.name}
                          size="w-12 h-12"
                          textSize="text-base"
                          rounded="rounded-2xl"
                          bg="bg-indigo-600"
                          className="shadow-md"
                        />
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {student.hostel}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              {formatTime24to12(student.departureTime)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score Pill */}
                      <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-2xl text-center shrink-0">
                        <div className="text-lg font-black text-emerald-700 leading-none">
                          {matchInfo.score}%
                        </div>
                        <div className="text-[9px] font-bold text-emerald-800 uppercase mt-0.5">
                          Match
                        </div>
                      </div>
                    </div>

                    {/* Match Reasons List */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5 text-xs text-slate-700 mb-6">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Match Breakdown
                      </div>
                      {matchInfo.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{reason.replace('✓ ', '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Join / Form Group Button */}
                  <button
                    onClick={() => onCreateGroupWithStudent(student)}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Join / Form Group with {student.name.split(' ')[0]}</span>
                  </button>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
