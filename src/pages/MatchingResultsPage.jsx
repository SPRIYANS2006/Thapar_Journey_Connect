import React from 'react';
import Avatar from '../components/Avatar';
import { 
  ArrowLeft, 
  Sparkles, 
  Users, 
  Clock, 
  Home, 
  UserPlus, 
  MessageSquare, 
  Calendar 
} from 'lucide-react';
import { formatTime24to12 } from '../utils/matchingEngine';

export default function MatchingResultsPage({ 
  journeyReq, 
  matchedStudents = [], 
  matchingGroups = [], 
  currentUser,
  onBack, 
  onJoinGroup, 
  onViewGroupDetails,
  onCreateGroupWithStudent,
  onCreateGroupForJourney
}) {
  const currentUid = currentUser?.id;
  const destName = journeyReq?.destinationName || 'Selected Transit Point';
  const safeMatchedStudents = Array.isArray(matchedStudents) ? matchedStudents : [];
  const safeMatchingGroups = Array.isArray(matchingGroups) ? matchingGroups : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation & Header */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors mb-4 cursor-pointer"
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
              Ranked by departure time, hostel quad proximity, and transport vehicle compatibility.
            </p>
          </div>

          {/* User Request Summary Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 shrink-0 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Date: {journeyReq?.date || 'Today'} • {formatTime24to12(journeyReq?.departureTime)} (±{journeyReq?.flexibility}m)
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span>
                Hostel: <strong className="text-slate-800">{journeyReq?.hostel || 'Campus'}</strong>
              </span>
              <span>•</span>
              <span>
                Pref: <strong className="text-slate-800">{journeyReq?.transport || 'Shared Cab'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MATCHING OPEN GROUPS SECTION */}
      {safeMatchingGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Open Travel Groups Heading to {destName}</span>
            </h2>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              {safeMatchingGroups.length} Compatible {safeMatchingGroups.length === 1 ? 'Group' : 'Groups'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {safeMatchingGroups.map(({ group, matchScore, reasons }) => {
              const isFull = (group.members || []).length >= (group.capacity || 4);
              const isUserMember = (group.members || []).some(
                (m) => (m.userId && m.userId === currentUid) || (m.id && m.id === currentUid)
              );

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
                            {isFull ? `Full (${group.members?.length || 0}/${group.capacity || 4})` : 'Open'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Departure: {formatTime24to12(group.departureTime)} ({group.date || 'Today'})
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-indigo-600">
                        {matchScore}%
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Group Match
                      </div>
                    </div>
                  </div>

                  {/* Reasons Badges */}
                  {Array.isArray(reasons) && reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {reasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium border border-indigo-100"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Members List */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-bold text-slate-700">
                        Members ({(group.members || []).length}/{group.capacity || 4})
                      </span>
                      <span>Pickup: {group.pickupPoint}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(group.members || []).map((m) => (
                        <div
                          key={m.userId || m.id}
                          className="bg-white p-2 rounded-xl border border-slate-200/80 flex items-center gap-2 text-xs"
                        >
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
                            <span className="text-[10px] text-slate-500">
                              {m.hostel || 'Hostel'} • {formatTime24to12(m.departureTime || group.departureTime)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  {isUserMember ? (
                    <button
                      onClick={() => onViewGroupDetails(group.id)}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>View My Group & Chat</span>
                    </button>
                  ) : isFull ? (
                    <div className="w-full py-2.5 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center border border-slate-200">
                      Group Full ({group.members?.length || 0}/{group.capacity || 4})
                    </div>
                  ) : (
                    <button
                      onClick={() => onJoinGroup(group.id)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Join Group #{group.id}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INDIVIDUAL MATCHED STUDENTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Matched Students Searching for Co-Riders</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Start a new shared ride group with any compatible student below.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            {safeMatchedStudents.length} {safeMatchedStudents.length === 1 ? 'Student' : 'Students'} Found
          </span>
        </div>

        {safeMatchedStudents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">
                No Other Students Searching for this exact time yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your journey request has been registered in the matching pool. As soon as another student searches for a compatible ride to {destName}, you will be matched automatically!
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onCreateGroupForJourney ? onCreateGroupForJourney() : onBack()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Form New Open Group for this Ride</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeMatchedStudents.map(({ student, matchInfo, journeyId }) => (
              <div
                key={student.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={student.avatar}
                        name={student.name}
                        size="w-12 h-12"
                        textSize="text-base"
                        rounded="rounded-2xl"
                        bg="bg-slate-900"
                        className="shadow-md"
                      />
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">
                          {student.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Home className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{student.hostel || 'Hostel Resident'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-blue-600">
                        {matchInfo?.score || 90}%
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Compatibility
                      </div>
                    </div>
                  </div>

                  {/* Badges / Reasons */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        Departure: <strong>{formatTime24to12(student.departureTime)}</strong> (±{student.flexibility || 15}m)
                      </span>
                    </div>

                    {Array.isArray(matchInfo?.reasons) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {matchInfo.reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => onCreateGroupWithStudent({ ...student, journeyId })}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Start Group with {student.name.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
