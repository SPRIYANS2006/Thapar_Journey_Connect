import React, { useState } from 'react';
import Avatar from '../components/Avatar';
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
  Calculator,
  ShieldAlert,
  LogOut,
  UserPlus
} from 'lucide-react';
import FareSplitModal from '../components/FareSplitModal';
import EmergencySOSModal from '../components/EmergencySOSModal';
import ConfirmDialog from '../components/ConfirmDialog';
import RescheduleSlotModal from '../components/RescheduleSlotModal';
import AddFriendModal from '../components/AddFriendModal';
import { formatTime24to12 } from '../utils/matchingEngine';
import { api } from '../services/api';

const PICKUP_POINTS = [
  'Main Gate (Near Executive Mess)',
  'Hostel-J Gate',
  'Hostel-M / Anantam Roundabout',
  'Hostel-PG Quad',
  'COS Complex Gate',
  'Library Forecourt',
  'Nirvana Roundabout'
];

export default function GroupDetailsPage({ 
  group, 
  currentUser, 
  onBack, 
  onOpenChat, 
  onConfirmJourney,
  onLeaveGroup,
  onJoinGroup,
  onChangePickupPoint,
  onRescheduleSuccess,
  triggerToast
}) {
  const [showFareSplit, setShowFareSplit] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [isUpdatingPickup, setIsUpdatingPickup] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  const handleAddFriend = async (friendData) => {
    if (!group?.id) return;
    setFriendActionLoading(true);
    try {
      const res = await api.addFriendToGroup(group.id, friendData);
      if (triggerToast) {
        triggerToast(res.message || `Added ${friendData.name} to Group #${group.id}.`, 'success');
      }
      if (onRescheduleSuccess && res.group) {
        onRescheduleSuccess(res.group);
      }
    } catch (err) {
      if (triggerToast) {
        triggerToast(err.message || 'Failed to add friend.', 'error');
      }
      throw err;
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId, friendName) => {
    if (!group?.id) return;
    setFriendActionLoading(true);
    try {
      const res = await api.removeFriendFromGroup(group.id, friendId);
      if (triggerToast) {
        triggerToast(res.message || `Removed ${friendName || 'friend'} from Group #${group.id}.`, 'info');
      }
      if (onRescheduleSuccess && res.group) {
        onRescheduleSuccess(res.group);
      }
    } catch (err) {
      if (triggerToast) {
        triggerToast(err.message || 'Failed to remove friend.', 'error');
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4 animate-in fade-in duration-300">
        <h2 className="text-xl font-bold text-slate-800">No group selected</h2>
        <p className="text-sm text-slate-500">Choose or form a group from the dashboard.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to dashboard</span>
        </button>
      </div>
    );
  }

  const currentUserId = currentUser?.id;
  const isMember = (group.members || []).some(
    (m) => (m.userId && m.userId === currentUserId) || (m.id && m.id === currentUserId)
  );
  const isAdmin =
    currentUser &&
    (group.adminId === currentUserId ||
      group.admin_id === currentUserId ||
      group.creatorId === currentUserId ||
      group.creator_id === currentUserId ||
      ((group.members || [])[0]?.userId === currentUserId ||
        (group.members || [])[0]?.id === currentUserId ||
        (group.members || [])[0]?.user_id === currentUserId));

  const isConfirmed = group.status === 'Confirmed';
  const isCompleted = group.status === 'Completed';
  const isFull = (group.members || []).length >= (group.capacity || group.maxMembers || 4);

  // Helper to calculate hours left until ride departure
  const calculateHoursUntilDeparture = (dateStr, timeStr) => {
    if (!timeStr) return 999;
    const now = new Date();
    const target = new Date();

    if (dateStr) {
      const s = String(dateStr).trim();
      if (/tomorrow/i.test(s)) {
        target.setDate(target.getDate() + 1);
      } else if (!/today/i.test(s)) {
        const cleanDate = s.replace(/^[A-Za-z]+,\s*/, '').replace(/^[A-Za-z]+\s*\([^)]*\)\s*/, '');
        const parsed = Date.parse(`${cleanDate} ${target.getFullYear()}`);
        if (!isNaN(parsed)) {
          target.setTime(parsed);
        }
      }
    }

    const [hStr, mStr] = (timeStr || '').split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    target.setHours(h, m, 0, 0);

    const diffMs = target.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60);
  };

  const hoursLeft = calculateHoursUntilDeparture(group.date, group.departureTime);
  const isLateCancellation = hoursLeft <= 4;
  const isCriticalCancellation = hoursLeft <= 0.5;

  const handlePickupChange = async (e) => {
    const newPoint = e.target.value;
    if (!newPoint || newPoint === group.pickupPoint) return;
    setIsUpdatingPickup(true);
    try {
      if (onChangePickupPoint) {
        await onChangePickupPoint(group.id, newPoint);
      }
    } finally {
      setIsUpdatingPickup(false);
    }
  };

  const getLeaveConfirmMessage = () => {
    if (isCriticalCancellation) {
      return `⚠️ CRITICAL CANCELLATION WARNING:\nThis ride departs in less than 30 minutes!\nUnder Thapar Travel Reliability Policy:\n• Dropping out leaves co-passengers stranded with high fare splits.\n• Your reliability rating will decrease by -0.8⭐.\n\nAre you sure you want to proceed?`;
    }
    if (isLateCancellation) {
      const minsRemaining = Math.max(1, Math.round(hoursLeft * 60));
      return `⚠️ LATE CANCELLATION WARNING:\nThis ride departs in less than 4 hours (~${minsRemaining} mins remaining).\nUnder Thapar Travel Reliability Policy:\n• Free cancellation is permitted up to 4 hours before departure.\n• Leaving now will decrease your reliability rating by -0.3⭐.\n\nAre you sure you want to proceed?`;
    }
    return `Are you sure you want to leave Group #${group.id}?\n\n(Free cancellation: more than 4 hours remain before scheduled departure)`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Groups / Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFareSplit(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-3.5 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Cab Fare Splitter</span>
          </button>

          <button
            onClick={() => setShowSOS(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 px-3.5 py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors shadow-xs cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Campus SOS</span>
          </button>
        </div>
      </div>

      {/* Group Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800/60 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-3 py-0.5 rounded-full">
                Group #{group.id}
              </span>

              <span
                className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                  isConfirmed || isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isFull
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-400 text-slate-900'
                }`}
              >
                {isConfirmed
                  ? 'Confirmed'
                  : isCompleted
                  ? 'Completed'
                  : isFull
                  ? `Full (${group.members?.length || 0}/${group.capacity || 4})`
                  : 'Open'}
              </span>

              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-0.5 rounded-full border border-slate-700">
                Vehicle: {group.transport || 'Shared Cab'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              TIET Campus → {group.destinationName}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 flex-wrap">
              <span className="flex items-center gap-1.5 font-semibold text-blue-200">
                <Clock className="w-4 h-4 text-blue-400" />
                Target Departure: {formatTime24to12(group.departureTime)} ({group.date || 'Today'})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-4 h-4 text-indigo-400" />
                Pickup: <strong className="text-white">{group.pickupPoint}</strong>
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {isMember ? (
              <>
                <button
                  onClick={() => onOpenChat && onOpenChat(group.id)}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Group Chat</span>
                </button>

                {!isCompleted && !group.isCommunityRide && (
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="px-4 py-3 bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold text-xs rounded-2xl border border-indigo-400/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                    title="Move to another 15-minute time slot"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Change date/time</span>
                  </button>
                )}

                {!isConfirmed && !isCompleted && isAdmin && (
                  <button
                    onClick={() => onConfirmJourney && onConfirmJourney(group.id)}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Journey</span>
                  </button>
                )}

                {(isConfirmed || isCompleted) && (
                  <div className="flex items-center gap-2">
                    <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{isCompleted ? 'Completed' : 'Journey Confirmed'}</span>
                    </div>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `🚖 *Thapar Journey Connect - Group #${group.id}*\n📍 Destination: ${group.destinationName}\n⏰ Departure: ${group.departureTime} (${group.date || 'Today'})\n📍 Pickup Point: ${group.pickupPoint}\n👥 Members: ${(group.members || []).map((m) => m.name).join(', ')}\nCoordinated via Thapar Journey Connect`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      title="Share details to WhatsApp"
                    >
                      <span>Share on WhatsApp</span>
                    </a>
                  </div>
                )}

                {onLeaveGroup && (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className={`px-4 py-3 font-bold text-xs rounded-2xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      isCriticalCancellation
                        ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border-rose-500/50'
                        : isLateCancellation
                        ? 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border-amber-500/50'
                        : 'bg-slate-800/80 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border-slate-700'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>
                      Leave{' '}
                      {isCriticalCancellation
                        ? '(-0.8⭐ penalty)'
                        : isLateCancellation
                        ? '(-0.3⭐ penalty)'
                        : ''}
                    </span>
                  </button>
                )}
              </>
            ) : isFull ? (
              <div className="px-5 py-3 bg-slate-800 text-slate-400 font-bold text-xs rounded-2xl border border-slate-700 text-center">
                Group Full ({group.members?.length || 0}/{group.capacity || 4})
              </div>
            ) : (
              <button
                onClick={() => onJoinGroup && onJoinGroup(group.id)}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-500/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer ring-2 ring-white/30 active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                <span>
                  Join Group #{group.id} ({group.members?.length || 0}/{group.capacity || 4})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Policy Banner */}
      <div
        className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isCriticalCancellation
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : isLateCancellation
            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <span>
            <strong>Cancellation Policy:</strong> Free cancellation up to 4 hours before departure. Cancellations within 4 hours incur a <strong>-0.3⭐</strong> reliability penalty (<strong>-0.8⭐</strong> in the final 30 minutes).
          </span>
        </div>
        <span className="font-bold text-[11px] whitespace-nowrap px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-current shadow-xs">
          {hoursLeft <= 0.5
            ? '⚠️ < 30 Mins Left (-0.8⭐)'
            : hoursLeft <= 4
            ? `⚠️ ~${Math.max(1, Math.round(hoursLeft * 60))} Mins Left (-0.3⭐)`
            : '✅ Free Cancellation Active'}
        </span>
      </div>

      {/* Pickup Point Card with Admin Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/50 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Pickup point
              </span>
              {isAdmin && (
                <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                  Admin editable
                </span>
              )}
            </div>

            {isAdmin ? (
              <div className="mt-1 flex items-center gap-3">
                <select
                  value={group.pickupPoint}
                  onChange={handlePickupChange}
                  disabled={isUpdatingPickup}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {PICKUP_POINTS.map((pt) => (
                    <option key={pt} value={pt} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {pt}
                    </option>
                  ))}
                </select>
                {isUpdatingPickup && (
                  <span className="text-xs text-slate-400">Updating...</span>
                )}
              </div>
            ) : (
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">
                {group.pickupPoint}
              </h3>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Optimized for member hostels. All members meet here 5 minutes prior to departure.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/70 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-semibold w-full md:w-auto text-center shrink-0">
          Capacity:{' '}
          <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
            {(group.members || []).length}/{group.capacity || 4}
          </strong>{' '}
          Seats ({group.transport || 'Shared Cab'})
        </div>
      </div>

      {/* Members Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>
              Group Members ({(group.members || []).length}/{group.capacity || group.maxMembers || 4})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {isMember && (group.members || []).length < (group.capacity || group.maxMembers || 4) && (
              <button
                type="button"
                onClick={() => setIsAddFriendOpen(true)}
                disabled={friendActionLoading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Friend</span>
              </button>
            )}
            <span className="text-xs text-slate-500 hidden sm:inline">Verified TIET Student Profiles</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(group.members || []).map((member) => {
            const isMe =
              (member.userId && member.userId === currentUserId) ||
              (member.id && member.id === currentUserId);
            const canSeePhone = (isConfirmed || isCompleted) && isMember;
            const isCompanion = Boolean(member.isCompanion);
            const canRemoveCompanion = isCompanion && (member.addedBy === currentUserId || isAdmin);

            return (
              <div
                key={member.userId || member.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between relative overflow-hidden ${
                  isMe 
                    ? 'border-blue-500/80 bg-blue-50/30 dark:bg-blue-950/20' 
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                {isMe && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                    You
                  </span>
                )}
                {isCompanion && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md">
                    Friend
                  </span>
                )}

                <div>
                  <Avatar
                    src={member.avatar}
                    name={member.name}
                    size="w-14 h-14"
                    textSize="text-lg"
                    rounded="rounded-2xl"
                    bg="bg-slate-900"
                    className="mb-4 shadow-md"
                  />

                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {member.name}
                  </h3>

                  <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        Hostel: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{member.hostel || 'Campus'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        Departure: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{formatTime24to12(member.departureTime || group.departureTime)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span>
                        Reliability: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{typeof member.reliability === 'number' ? member.reliability.toFixed(1) : '5.0'} / 5.0</strong>
                      </span>
                    </div>

                    {/* Privacy Shielded Phone Contact */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {isMe ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-mono font-bold text-[11px]">{member.phone || 'No phone set'}</span>
                        </div>
                      ) : canSeePhone ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-mono font-bold text-[11px]">{member.phone || 'No phone set'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px]" title="Phone visible only to confirmed group members.">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="italic">
                            {isMember ? '🔒 Visible after confirmation' : '🔒 Members only'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md font-bold text-slate-700 dark:text-slate-300">
                    {member.role || 'Member'}
                  </span>
                  {canRemoveCompanion ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(member.id || member.userId || member.user_id, member.name)}
                      disabled={friendActionLoading}
                      className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
                    >
                      Remove Friend
                    </button>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Verified TIET</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showFareSplit && (
        <FareSplitModal
          group={group}
          onClose={() => setShowFareSplit(false)}
        />
      )}

      {showSOS && (
        <EmergencySOSModal
          user={currentUser}
          onClose={() => setShowSOS(false)}
        />
      )}

      {/* Leave Group Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="Leave Travel Group"
        message={getLeaveConfirmMessage()}
        confirmLabel="Leave Group"
        isDestructive={true}
        onConfirm={() => {
          setShowLeaveConfirm(false);
          if (onLeaveGroup) {
            onLeaveGroup(group.id);
          }
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Reschedule Slot Modal */}
      <RescheduleSlotModal
        group={group}
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onSuccess={(newGroup) => {
          if (onRescheduleSuccess) {
            onRescheduleSuccess(newGroup);
          }
        }}
        triggerToast={triggerToast}
      />

      {/* Add Friend to Slot Modal */}
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onAddFriend={handleAddFriend}
        groupDestination={group.destinationName || 'Travel Slot'}
        currentSeats={(group.members || []).length}
        maxSeats={group.capacity || group.maxMembers || 4}
      />
    </div>
  );
}
