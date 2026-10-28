import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Users, 
  MapPin, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  ShieldCheck, 
  Phone, 
  Home, 
  Star,
  Sparkles,
  AlertCircle,
  Calculator,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import DynamicSimulateWidget from '../components/DynamicSimulateWidget';
import FareSplitModal from '../components/FareSplitModal';
import EmergencySOSModal from '../components/EmergencySOSModal';
import { formatTime24to12 } from '../utils/matchingEngine';

export default function GroupDetailsPage({ 
  group, 
  currentUser, 
  onBack, 
  onOpenChat, 
  onSimulateJoin, 
  onResetGroup,
  onConfirmJourney,
  onLeaveGroup,
  onShareToChat
}) {
  const [isConfirmed, setIsConfirmed] = useState(group?.status === 'Confirmed');
  const [showFareSplit, setShowFareSplit] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4 animate-in fade-in duration-300">
        <h2 className="text-xl font-bold text-slate-800">No Group Selected</h2>
        <p className="text-sm text-slate-500">Please choose or form a group from the dashboard.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  const isFull = (group.members || []).length >= (group.maxMembers || 4);
  const isMember = (group.members || []).some(m => (m.id && m.id === currentUser?.id) || (m.user_id && m.user_id === currentUser?.id));

  const handleConfirm = () => {
    setIsConfirmed(true);
    onConfirmJourney(group.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Groups / Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFareSplit(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl hover:bg-blue-100 transition-colors shadow-xs"
          >
            <Calculator className="w-4 h-4 text-blue-600" />
            <span>Cab Fare Splitter</span>
          </button>

          <button
            onClick={() => setShowSOS(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl hover:bg-red-100 transition-colors shadow-xs"
          >
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>Campus SOS</span>
          </button>
        </div>
      </div>

      {/* Dynamic Match Engine Simulator Banner */}
      <DynamicSimulateWidget
        activeGroup={group}
        onSimulateJoin={onSimulateJoin}
        onResetGroup={onResetGroup}
      />

      {/* Group Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-3 py-0.5 rounded-full">
                Group #{group.id}
              </span>
              
              <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                group.status === 'Confirmed' || isConfirmed
                  ? 'bg-emerald-500 text-white'
                  : isFull
                  ? 'bg-amber-500 text-white'
                  : 'bg-blue-400 text-slate-900'
              }`}>
                {group.status === 'Confirmed' || isConfirmed ? '✓ Journey Confirmed' : isFull ? 'Full (4/4 Members)' : 'Status: Open'}
              </span>

              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-0.5 rounded-full border border-slate-700">
                Match Score: {group.matchScore}%
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              TIET Campus → {group.destinationName}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 flex-wrap">
              <span className="flex items-center gap-1.5 font-semibold text-blue-200">
                <Clock className="w-4 h-4 text-blue-400" />
                Target Departure: {formatTime24to12(group.departureTime)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-4 h-4 text-indigo-400" />
                Suggested Pickup: <strong className="text-white">{group.pickupPoint}</strong>
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onOpenChat(group.id)}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Group Chat</span>
            </button>

            {!(group.status === 'Confirmed' || isConfirmed) ? (
              <button
                onClick={handleConfirm}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Journey</span>
              </button>
            ) : (
              <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Journey Confirmed</span>
              </div>
            )}

            {isMember && onLeaveGroup && (
              <button
                onClick={() => onLeaveGroup(group.id)}
                className="px-4 py-3 bg-slate-800/80 hover:bg-red-900/60 text-slate-300 hover:text-red-200 font-bold text-xs rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                title="Leave this travel group"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Suggested Pickup Point Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Coordinated Pickup Point
            </span>
            <h3 className="font-bold text-slate-900 text-lg">
              {group.pickupPoint}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Optimized for member hostels ({group.members.map(m=>m.hostel).join(', ')}). All members meet here 5 minutes prior to departure.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-600 font-semibold w-full md:w-auto text-center">
          Group Capacity: <strong className="text-indigo-600 font-extrabold text-sm">{group.members.length}/{group.maxMembers}</strong>
        </div>
      </div>

      {/* Members Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Group Members ({group.members.length}/4)</span>
          </h2>
          <span className="text-xs text-slate-500">
            Verified TIET Student Profiles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {group.members.map((member) => {
            const isMe = (member.id && member.id === currentUser?.id) || (member.user_id && member.user_id === currentUser?.id);
            return (
              <div
                key={member.id}
                className={`bg-white rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between relative overflow-hidden ${
                  isMe ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'
                }`}
              >
                {isMe && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                    You
                  </span>
                )}

                <div>
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center mb-4 shadow-md">
                    {member.avatar}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                    <span>{member.name}</span>
                  </h3>

                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Hostel: <strong className="text-slate-800 font-semibold">{member.hostel}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Departure: <strong className="text-slate-800 font-semibold">{formatTime24to12(member.departureTime)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span>Reliability: <strong className="text-slate-800 font-semibold">4.8 / 5.0</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-700">{member.phone || '+91 98765 XXXXX'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="bg-slate-100 px-2.5 py-0.5 rounded-md font-bold text-slate-700">
                    {member.role || 'Member'}
                  </span>
                  <span className="text-emerald-600 font-semibold">✓ Verified TIET</span>
                </div>
              </div>
            );
          })}

          {/* Empty Member Slots if less than 4 */}
          {Array.from({ length: Math.max(0, group.maxMembers - group.members.length) }).map((_, idx) => (
            <div
              key={idx}
              className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-2 min-h-[240px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-400 flex items-center justify-center font-bold">
                +
              </div>
              <h4 className="font-bold text-slate-700 text-sm">Open Slot #{group.members.length + idx + 1}</h4>
              <p className="text-xs text-slate-500">
                Waiting for compatible student match...
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showFareSplit && (
        <FareSplitModal
          group={group}
          onClose={() => setShowFareSplit(false)}
          onShareToChat={(fareText) => {
            if (onShareToChat) onShareToChat(group.id, fareText);
            setShowFareSplit(false);
          }}
        />
      )}

      {showSOS && (
        <EmergencySOSModal
          user={currentUser}
          onClose={() => setShowSOS(false)}
        />
      )}

    </div>
  );
}
