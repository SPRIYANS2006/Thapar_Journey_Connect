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
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/60">
                Matching results
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                TIET Campus → {destName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Compatible travel partners
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Ranked by departure time, hostel proximity, and vehicle preference.
            </p>
          </div>

          {/* User Request Summary Badge */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 text-xs text-slate-700 dark:text-slate-300 shrink-0 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Date: {journeyReq?.date || 'Today'} • {formatTime24to12(journeyReq?.departureTime)} (±{journeyReq?.flexibility}m)
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <span>
                Hostel: <strong className="text-slate-800 dark:text-slate-200">{journeyReq?.hostel || 'Campus'}</strong>
              </span>
              <span>•</span>
              <span>
                Pref: <strong className="text-slate-800 dark:text-slate-200">{journeyReq?.transport || 'Shared Cab'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MATCHING OPEN GROUPS SECTION */}
      {safeMatchingGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Open Travel Groups Heading to {destName}</span>
            </h2>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
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
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-blue-400 dark:hover:border-blue-500 transition-all relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                        #{group.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">
                            Group #{group.id}
                          </h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isFull ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {isFull ? `Full (${group.members?.length || 0}/${group.capacity || 4})` : 'Open'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Departure: {formatTime24to12(group.departureTime)} ({group.date || 'Today'})
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {matchScore}%
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        Match
                      </div>
                    </div>
                  </div>

                  {/* Reasons Badges */}
                  {Array.isArray(reasons) && reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {reasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium border border-blue-100 dark:border-blue-900/60"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Members List */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Members ({(group.members || []).length}/{group.capacity || 4})
                      </span>
                      <span>Pickup: {group.pickupPoint}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(group.members || []).map((m) => (
                        <div
                          key={m.userId || m.id}
                          className="bg-white dark:bg-slate-850 p-2 rounded-lg border border-slate-200/80 dark:border-slate-750 flex items-center gap-2 text-xs"
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
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{m.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
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
                      className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>View ride & chat</span>
                    </button>
                  ) : isFull ? (
                    <div className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded-xl text-xs text-center border border-slate-200 dark:border-slate-700">
                      Group Full ({group.members?.length || 0}/{group.capacity || 4})
                    </div>
                  ) : (
                    <button
                      onClick={() => onJoinGroup(group.id)}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Join group #{group.id}</span>
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Matched students searching for co-riders</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Start a shared ride group with any compatible student below.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-900/60">
            {safeMatchedStudents.length} {safeMatchedStudents.length === 1 ? 'Student' : 'Students'}
          </span>
        </div>

        {safeMatchedStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center space-y-4 shadow-2xs transition-colors">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-xl mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                No other students searching for this departure yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Your request is in the matching pool. As soon as another student searches for a compatible ride to {destName}, you will be matched automatically.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onCreateGroupForJourney ? onCreateGroupForJourney() : onBack()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Start open group for this ride</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {safeMatchedStudents.map(({ student, matchInfo, journeyId }) => (
              <div
                key={student.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={student.avatar}
                        name={student.name}
                        size="w-11 h-11"
                        textSize="text-sm"
                        rounded="rounded-xl"
                        bg="bg-blue-600"
                        className="shadow-xs"
                      />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {student.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{student.hostel || 'Hostel Resident'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {matchInfo?.score || 90}%
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        Match
                      </div>
                    </div>
                  </div>

                  {/* Badges / Reasons */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        Departure: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{formatTime24to12(student.departureTime)}</strong> (±{student.flexibility || 15}m)
                      </span>
                    </div>

                    {Array.isArray(matchInfo?.reasons) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {matchInfo.reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/60"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onCreateGroupWithStudent({ ...student, journeyId })}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Start group with {student.name.split(' ')[0]}</span>
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
