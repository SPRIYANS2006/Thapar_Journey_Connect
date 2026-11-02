import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Car,
  Clock,
  MapPin,
  Calendar,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Heart,
  Navigation,
  Lock,
  Search,
  ChevronDown,
  Check
} from 'lucide-react';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import SlotPicker from '../components/SlotPicker';
import { getPresetDestinationsForCommunity } from '../data/cityDestinations';
import { HOSTELS } from '../data/mockData';
import { formatTime24to12 } from '../utils/matchingEngine';
import { api } from '../services/api';

export default function CityCommunityHubPage({
  community,
  user,
  activeGroup = null,
  posts = [],
  onBack = null,
  onJoinCommunity,
  onLeaveCommunity,
  onAddPost,
  onLikePost,
  onAddComment,
  onRefreshPosts,
  onRefreshGroups,
  onViewGroupDetails = null,
  onOpenChat = null,
  onLeaveGroup = null,
  triggerToast
}) {
  const [activeTab, setActiveTab] = useState('rides'); // 'rides' | 'board'
  const isUserEnrolledInCity = user?.joinedCommunity === community?.id;

  // 1. Date options: Today to +30 days in IST
  const dateOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 31; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const isoDate = d.toISOString().split('T')[0];
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();

      let label = `${weekday}, ${month} ${day}`;
      if (i === 0) label = `Today (${weekday}, ${month} ${day})`;
      if (i === 1) label = `Tomorrow (${weekday}, ${month} ${day})`;

      list.push({ value: isoDate, label, isToday: i === 0 });
    }
    return list;
  }, []);

  // 2. Preset Destinations for this community
  const presetDestinations = useMemo(() => {
    if (!community?.id) return [];
    return getPresetDestinationsForCommunity(community.id, community.name);
  }, [community]);

  // 3. Search Form State (MakeMyTrip style)
  const [selectedDest, setSelectedDest] = useState(() => {
    return presetDestinations[0] || `${community?.name || 'City'} Center`;
  });
  const [customDestInput, setCustomDestInput] = useState('');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => dateOptions[0]?.value || 'Today');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedMode, setSelectedMode] = useState('Shared Cab'); // 'Shared Cab' | 'Train Cohort' | 'Either'
  const [selectedHostel, setSelectedHostel] = useState(() => user?.hostel || HOSTELS[0].name);
  const [isHostelDropdownOpen, setIsHostelDropdownOpen] = useState(false);

  // Filtered destinations in typeahead
  const filteredPresetDestinations = useMemo(() => {
    if (!destSearchQuery.trim()) return presetDestinations;
    const q = destSearchQuery.toLowerCase();
    return presetDestinations.filter((d) => d.toLowerCase().includes(q));
  }, [presetDestinations, destSearchQuery]);

  const effectiveDest = customDestInput.trim() || selectedDest;

  // 4. Slots State (Only loaded when student presses Search)
  const [hasSearched, setHasSearched] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [joiningSlotKey, setJoiningSlotKey] = useState(null);

  // Active ride tracking
  const userActiveRide = useMemo(() => {
    if (!user) return null;
    if (activeGroup) return activeGroup;
    return (
      (slots || []).find((s) => s.isJoined) || null
    );
  }, [user, activeGroup, slots]);

  // Leave ride confirmation state
  const [rideToLeave, setRideToLeave] = useState(null);
  const [isLeavingRide, setIsLeavingRide] = useState(false);

  // Notice board state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('Carpool Request');
  const [postError, setPostError] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [openReplyPostId, setOpenReplyPostId] = useState(null);
  const [replyInputText, setReplyInputText] = useState('');

  // Fetch slots for this city community
  const fetchCommunitySlots = useCallback(
    async (destName, dateVal, modeVal) => {
      if (!community?.id || !isUserEnrolledInCity) return;
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const modeParam =
          modeVal === 'Train Cohort' ? 'Train' : modeVal === 'Shared Cab' ? 'Cab' : 'All';
        const res = await api.getCityCommunitySlots(community.id, {
          destination: destName,
          date: dateVal,
          mode: modeParam
        });
        if (res && res.slots) {
          setSlots(res.slots);
        } else {
          setSlots([]);
        }
      } catch (err) {
        console.warn('Failed to fetch community slots:', err.message);
        setSlotsError(err.message || 'Unable to load travel slots');
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [community, isUserEnrolledInCity]
  );

  // Refresh notice board posts on mount or community change
  useEffect(() => {
    if (community?.id && onRefreshPosts) {
      onRefreshPosts(community.id);
    }
  }, [community, onRefreshPosts]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setIsDestDropdownOpen(false);
    setHasSearched(true);
    fetchCommunitySlots(effectiveDest, selectedDate, selectedMode);
  };

  // Handle Join Slot (Atomic Join or Lazy Group Creation)
  const handleJoinSlot = async (slot) => {
    if (userActiveRide && userActiveRide.id !== (slot.groupId || slot.rideId)) {
      if (triggerToast) {
        triggerToast({
          id: `ride_active_err_${Date.now()}`,
          type: 'error',
          title: 'Single-Ride Policy Active',
          message: `You already belong to an active ride (${userActiveRide.destinationName || userActiveRide.destination || 'Group #' + userActiveRide.id}). Leave that ride before joining another.`
        });
      }
      return;
    }

    setJoiningSlotKey(slot.slotKey);
    try {
      const modeParam = slot.mode || (selectedMode === 'Train Cohort' ? 'Train' : 'Cab');
      const res = await api.joinCityCommunitySlot(community.id, {
        date: slot.date,
        time: slot.time,
        mode: modeParam,
        destination: slot.destination || effectiveDest,
        pickupPoint: selectedHostel
      });

      if (triggerToast) {
        triggerToast({
          id: `slot_joined_${Date.now()}`,
          type: 'success',
          title: res?.created ? 'New Group Formed! 🎉' : 'Joined Ride Group! 🚗',
          message:
            res?.message ||
            `You joined Group #${res?.ride?.id || ''} to ${community.name} at ${slot.time}.`,
          actionLabel: 'Open Chat',
          onAction: () => {
            if (onOpenChat && res?.ride?.id) {
              onOpenChat(res.ride.id);
            }
          }
        });
      }

      fetchCommunitySlots(effectiveDest, selectedDate, selectedMode);
      if (onRefreshGroups) {
        onRefreshGroups();
      }
    } catch (err) {
      if (triggerToast) {
        triggerToast({
          id: `slot_join_err_${Date.now()}`,
          type: 'error',
          title: 'Could Not Join Slot',
          message: err.message || 'Unable to join slot'
        });
      }
    } finally {
      setJoiningSlotKey(null);
    }
  };

  // Handle Leave Ride Confirmation
  const handleLeaveRideConfirm = async () => {
    if (!rideToLeave) return;
    try {
      setIsLeavingRide(true);
      const rideId = rideToLeave.id || rideToLeave.rideId;
      if (rideToLeave.community_id || rideToLeave.communityId) {
        await api.leaveCityRide(community.id, rideId);
      } else if (onLeaveGroup) {
        await onLeaveGroup(rideId);
      }

      if (triggerToast) {
        triggerToast({
          id: `ride_left_${Date.now()}`,
          type: 'info',
          title: 'Left Ride',
          message: `You left Group #${rideId}. Seat reopened for fellow students.`
        });
      }

      setRideToLeave(null);
      fetchCommunitySlots(effectiveDest, selectedDate, selectedMode);
      if (onRefreshGroups) {
        onRefreshGroups();
      }
    } catch (err) {
      if (triggerToast) {
        triggerToast({
          id: `ride_leave_err_${Date.now()}`,
          type: 'error',
          title: 'Could Not Leave Ride',
          message: err.message || 'Error leaving ride'
        });
      }
    } finally {
      setIsLeavingRide(false);
    }
  };

  // Notice board handlers
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      setPostError('Please enter both a title and details for the notice.');
      return;
    }
    try {
      setIsSubmittingPost(true);
      setPostError('');
      if (onAddPost) {
        await onAddPost({
          communityId: community.id,
          title: postTitle.trim(),
          content: postContent.trim(),
          category: postCategory || 'Carpool Request'
        });
      }
      setPostTitle('');
      setPostContent('');
      setIsPosting(false);
      if (onRefreshPosts) {
        onRefreshPosts(community.id);
      }
    } catch (err) {
      setPostError(
        err.message || 'Failed to post notice. Verify you are an enrolled member of this hub.'
      );
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleCommentSubmit = async (postId) => {
    if (!replyInputText.trim()) return;
    try {
      if (onAddComment) {
        await onAddComment(postId, replyInputText.trim());
      }
      setReplyInputText('');
      setOpenReplyPostId(null);
      if (onRefreshPosts) {
        onRefreshPosts(community.id);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const filteredPosts = (posts || []).filter(
    (p) => (p.communityId || p.community_id) === community?.id
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* Back button only shown if user is NOT enrolled (e.g. previewing before joining) */}
      {!isUserEnrolledInCity && onBack && (
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All City Communities</span>
          </button>
        </div>
      )}

      {/* Hero Banner for City Community */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 border border-blue-400/30 text-blue-200">
                <Navigation className="w-3.5 h-3.5" />
                <span>Thapar Campus (Patiala) ➔ {community?.name}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
                {community?.state}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl">{community?.icon || '🏙️'}</span>
              <div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                  {community?.name} Travel Hub
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  {community?.description ||
                    `Direct travel partner coordination & 10-minute slot booking between Thapar & ${community?.name}.`}
                </p>
              </div>
            </div>
          </div>

          {/* Membership Actions */}
          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
            {isUserEnrolledInCity ? (
              <div className="space-y-2 text-center md:text-right">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  Your Official Hometown Hub
                </span>
                <div>
                  <button
                    onClick={() => onLeaveCommunity && onLeaveCommunity(community.id)}
                    className="text-[11px] text-slate-400 hover:text-rose-300 underline transition-colors cursor-pointer"
                  >
                    Leave Hometown Hub
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onJoinCommunity && onJoinCommunity(community.id)}
                className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Join {community?.name} Hub</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Route Benchmarks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs relative z-10">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
              Distance
            </span>
            <span className="text-slate-100 font-bold text-sm mt-0.5 block">
              {community?.distanceFromThapar || '200 km'}
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
              Cab Fare Split
            </span>
            <span className="text-slate-100 font-bold text-sm mt-0.5 block">
              Split 4-ways (Save 75%)
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
              Train Cohorts
            </span>
            <span className="text-slate-100 font-bold text-sm mt-0.5 block">
              Group Travel Safety
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
              Enrolled Students
            </span>
            <span className="text-slate-100 font-bold text-sm mt-0.5 block">
              {community?.membersCount || 0} Students
            </span>
          </div>
        </div>

        {/* Decorative corner glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Feature Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl px-3 pt-2 shadow-2xs">
        <button
          onClick={() => setActiveTab('rides')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'rides'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Thapar ➔ {community?.name} Ride Booking (Cab & Train)</span>
        </button>

        <button
          onClick={() => setActiveTab('board')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'board'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Notice Board & Carpool Requests</span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">
            {filteredPosts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: RIDES - Restricted if not enrolled */}
      {activeTab === 'rides' && !isUserEnrolledInCity && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-6 shadow-xs max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">
              {community?.name} Travel Hub Rides Restricted
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              To view 10-minute scheduled departures, divide cab fares, or coordinate train cohorts for {community?.name}, you must be an enrolled member of this hometown hub.
            </p>
            {user?.joinedCommunity && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                Under TIET privacy policy, you can only access the travel slots of your enrolled hometown community.
              </p>
            )}
          </div>
          <button
            onClick={() => onJoinCommunity && onJoinCommunity(community.id)}
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Join {community?.name} Hometown Hub</span>
          </button>
        </div>
      )}

      {/* TAB 1: RIDES - Active for Enrolled Students */}
      {activeTab === 'rides' && isUserEnrolledInCity && (
        <div className="space-y-6">

          {/* ACTIVE BOOKING CARD (if user currently has an active ride) */}
          {userActiveRide && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                  #{userActiveRide.id || userActiveRide.groupId || userActiveRide.rideId}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                      Your Active Booked Ride
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Status: {userActiveRide.status || 'Confirmed'}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    ➔ {userActiveRide.destination || userActiveRide.destinationName} ({userActiveRide.date} at {userActiveRide.time} IST)
                  </h4>
                  <div className="text-xs text-slate-600 flex items-center gap-3">
                    <span>
                      Pickup: <strong>{userActiveRide.pickupPoint || userActiveRide.pickup_point || selectedHostel}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {userActiveRide.members?.length || userActiveRide.currentMembersCount || 1} student(s) booked
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenChat && onOpenChat(userActiveRide.id || userActiveRide.groupId || userActiveRide.rideId)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open Chat</span>
                </button>

                {onViewGroupDetails && (
                  <button
                    onClick={() => onViewGroupDetails(userActiveRide.id || userActiveRide.groupId || userActiveRide.rideId)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    View Details
                  </button>
                )}

                <button
                  onClick={() => setRideToLeave(userActiveRide)}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
                >
                  Leave Ride
                </button>
              </div>
            </div>
          )}

          {/* STICKY SEARCH CARD (MakeMyTrip style) */}
          <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl p-5 sm:p-6 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Book a Scheduled Travel Slot to {community?.name}
                </h2>
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 hidden sm:inline-block">
                  10-Minute Departures
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {community?.distanceFromThapar || '200 km'} • Verified TIET Students
              </span>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

                {/* 1. FROM: Fixed Thapar Campus */}
                <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span>From (Fixed Origin)</span>
                  </span>
                  <div className="font-extrabold text-slate-800 text-sm mt-1 truncate">
                    Thapar Institute, Patiala
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 truncate">
                    Pickup: {selectedHostel.split(' ')[0]}
                  </span>
                </div>

                {/* 2. TO: Drop Destination in City (Searchable Dropdown) */}
                <div className="relative bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-600" />
                    <span>To ({community?.name} Hub)</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsDestDropdownOpen(!isDestDropdownOpen)}
                    className="font-extrabold text-slate-800 text-sm mt-1 text-left flex items-center justify-between w-full truncate cursor-pointer"
                  >
                    <span className="truncate">{effectiveDest}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                  </button>

                  <span className="text-[10px] text-slate-500 mt-0.5 truncate">
                    Preset or Custom Drop Hub
                  </span>

                  {isDestDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 space-y-2 max-h-72 overflow-y-auto">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search drop landmark..."
                          value={destSearchQuery}
                          onChange={(e) => setDestSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                          Popular Drop Points
                        </span>
                        {filteredPresetDestinations.map((dest) => (
                          <div
                            key={dest}
                            onClick={() => {
                              setSelectedDest(dest);
                              setCustomDestInput('');
                              setIsDestDropdownOpen(false);
                            }}
                            className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                              effectiveDest === dest
                                ? 'bg-blue-50 text-blue-700'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{dest}</span>
                            {effectiveDest === dest && (
                              <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                          Or Type Custom Landmark / Address
                        </span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. Rohini Sector 11, GTB Nagar..."
                            value={customDestInput}
                            onChange={(e) => setCustomDestInput(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setIsDestDropdownOpen(false)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. DATE: Picker (Today to +30 Days) */}
                <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    <span>Travel Date</span>
                  </span>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="font-extrabold text-slate-800 text-sm mt-1 bg-transparent border-none focus:outline-hidden cursor-pointer"
                  >
                    {dateOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    IST Departure
                  </span>
                </div>

                {/* 4. TIME: Departure Time */}
                <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>Departure Time</span>
                    </span>
                    {selectedTime && (
                      <button
                        type="button"
                        onClick={() => setSelectedTime('')}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <label htmlFor="city-departure-time" className="sr-only">Select Departure Time</label>
                  <input
                    id="city-departure-time"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-transparent font-extrabold text-slate-900 text-sm mt-1 focus:outline-hidden cursor-pointer"
                    title="Select preferred departure time"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {selectedTime ? `${formatTime24to12(selectedTime)} IST` : 'Any departure time'}
                  </span>
                </div>

                {/* 5. MODE: Shared Cab / Train Cohort */}
                <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Car className="w-3 h-3 text-blue-600" />
                    <span>Transport Mode</span>
                  </span>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="font-extrabold text-slate-800 text-sm mt-1 bg-transparent border-none focus:outline-hidden cursor-pointer"
                  >
                    <option value="Shared Cab">Shared Cab (4 Seats)</option>
                    <option value="Train Cohort">Train Cohort (6 Seats)</option>
                    <option value="Either">Either / All Modes</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {selectedMode === 'Train Cohort' ? 'Shatabdi & Cohorts' : 'Fare Split 4-Ways'}
                  </span>
                </div>

                {/* 6. SEARCH BUTTON & HOSTEL SELECTION */}
                <div className="flex flex-col justify-between gap-1">
                  <button
                    type="submit"
                    className="w-full h-full min-h-[46px] rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Search className="w-4 h-4 stroke-[2.5]" />
                    <span>Search Slots</span>
                  </button>

                  <div className="relative text-center">
                    <button
                      type="button"
                      onClick={() => setIsHostelDropdownOpen(!isHostelDropdownOpen)}
                      className="text-[10px] font-bold text-slate-500 hover:text-blue-600 underline cursor-pointer truncate max-w-full block"
                    >
                      Pickup: {selectedHostel.split(' ')[0]} ▾
                    </button>

                    {isHostelDropdownOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 max-h-60 overflow-y-auto space-y-1 text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                          Campus Pickup Hostel
                        </span>
                        {HOSTELS.map((h) => (
                          <div
                            key={h.id}
                            onClick={() => {
                              setSelectedHostel(h.name);
                              setIsHostelDropdownOpen(false);
                            }}
                            className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              selectedHostel === h.name
                                ? 'bg-blue-50 text-blue-700'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {h.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </form>
          </div>

          {/* 10-MINUTE SLOTS (BlaBlaCar style, only shown when student presses Search) */}
          {!hasSearched ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200 mx-auto flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-slate-900">
                  Find Scheduled Departures to {community?.name}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Select your drop landmark, travel date, departure time, and transport mode above, then click <strong>"Search Slots"</strong> to view all 10-minute departure groups with fellow students.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 font-semibold">
                  ⏱️ 144 slots in 10-min steps
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 font-semibold">
                  🚕 Split cab fare 4-ways
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 font-semibold">
                  🚆 Train cohort travel company
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Available Departures for {selectedDate}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    From Thapar Campus to {effectiveDest} • {selectedMode}{selectedTime ? ` around ${formatTime24to12(selectedTime)}` : ''}
                  </p>
                </div>
              </div>

              {slotsError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{slotsError}</span>
                </div>
              )}

              <SlotPicker
                slots={slots}
                loading={slotsLoading}
                onJoinSlot={handleJoinSlot}
                onViewGroup={(groupId) => {
                  if (onViewGroupDetails) {
                    onViewGroupDetails(groupId);
                  }
                }}
                joiningSlotKey={joiningSlotKey}
                initialJumpTime={selectedTime}
              />
            </div>
          )}

        </div>
      )}

      {/* TAB 2: COMMUNITY NOTICE BOARD */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {community?.name} Discussion & Carpool Notice Board
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Post travel inquiries, holiday plans, or general student questions for fellow hometown students.
              </p>
            </div>

            {isUserEnrolledInCity ? (
              !isPosting && (
                <button
                  onClick={() => {
                    setIsPosting(true);
                    setPostError('');
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post Notice</span>
                </button>
              )
            ) : (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-2xl font-medium shrink-0">
                Join {community?.name} hub to post notices
              </span>
            )}
          </div>

          {/* Post Creator Form */}
          {isPosting && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Create New Notice / Carpool Request
                </h3>
                <button
                  onClick={() => {
                    setIsPosting(false);
                    setPostError('');
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {postError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{postError}</span>
                </div>
              )}

              <form onSubmit={handlePostSubmit} className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 shrink-0">
                    Notice Category:
                  </label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Carpool Request">Carpool Request</option>
                    <option value="Weekend Travel">Weekend Travel</option>
                    <option value="Holiday Break">Holiday Break</option>
                    <option value="General Notice">General Notice</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Notice Title (e.g. Taking Friday Train at 6 PM, looking for company)..."
                  maxLength={120}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  required
                />
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Detailed notes, departure timing, or co-traveler requests..."
                  rows={3}
                  maxLength={2000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  required
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPosting(false);
                      setPostError('');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPost}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                  >
                    {isSubmittingPost ? 'Publishing...' : 'Publish Notice'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Posts List */}
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2 text-slate-500">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">
                No notices posted for {community?.name} yet.
              </p>
              <p className="text-xs text-slate-400">
                Join this community hub to post the first update!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const authorName = post.author || post.authorName || 'Student';
                const authorHostel = post.authorHostel || '';
                const authorAvatar = post.authorAvatar || 'ST';
                const isLiked = Boolean(post.isLiked);
                const likesCount =
                  typeof post.likes === 'number'
                    ? post.likes
                    : Array.isArray(post.likes)
                    ? post.likes.length
                    : 0;
                const commentsList = Array.isArray(post.comments) ? post.comments : [];
                const hasReplies = commentsList.length > 0;

                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={authorAvatar}
                          name={authorName}
                          size="w-9 h-9"
                          textSize="text-xs"
                          rounded="rounded-full"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{authorName}</span>
                            {authorHostel && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                {authorHostel}
                              </span>
                            )}
                            {post.category && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                                {post.category}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {post.createdAt
                              ? new Date(post.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short'
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{post.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs">
                      <button
                        onClick={() => onLikePost && onLikePost(post.id)}
                        className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                          isLiked ? 'text-rose-600' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-600' : ''}`}
                        />
                        <span>{likesCount}</span>
                      </button>

                      <button
                        onClick={() =>
                          setOpenReplyPostId(openReplyPostId === post.id ? null : post.id)
                        }
                        className="flex items-center gap-1 text-slate-500 hover:text-blue-600 font-semibold transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{commentsList.length} Replies</span>
                      </button>
                    </div>

                    {/* Replies */}
                    {hasReplies && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 pl-4">
                        {commentsList.map((comm) => (
                          <div
                            key={comm.id}
                            className="bg-slate-50 p-2.5 rounded-2xl text-xs space-y-1"
                          >
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                              <span>{comm.author || comm.authorName || 'Student'}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {comm.createdAt
                                  ? new Date(comm.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : ''}
                              </span>
                            </div>
                            <p className="text-slate-600">{comm.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    {openReplyPostId === post.id && (
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={replyInputText}
                          onChange={(e) => setReplyInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCommentSubmit(post.id);
                            }
                          }}
                          placeholder={`Reply to ${authorName}...`}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LEAVE RIDE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(rideToLeave)}
        title="Leave Scheduled Ride?"
        message={`Are you sure you want to leave Group #${rideToLeave?.id || rideToLeave?.groupId || rideToLeave?.rideId} to ${rideToLeave?.destination || rideToLeave?.destinationName}? Your reserved seat will be reopened for other students.`}
        confirmLabel={isLeavingRide ? 'Leaving...' : 'Leave Ride'}
        cancelLabel="Stay in Ride"
        isDestructive={true}
        onConfirm={handleLeaveRideConfirm}
        onCancel={() => setRideToLeave(null)}
      />
    </div>
  );
}
