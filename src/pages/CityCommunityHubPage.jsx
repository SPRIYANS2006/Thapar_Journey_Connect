import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Train,
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  MessageSquare,
  Heart,
  TrendingDown,
  Navigation,
  Lock
} from 'lucide-react';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import { api } from '../services/api';

const getTomorrowDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const MODE_CONFIG = {
  Cab: {
    label: 'Shared Cab',
    icon: Car,
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    color: 'text-blue-600',
    accentBg: 'bg-blue-600',
    description: 'Split the total cab fare equally among student co-riders.'
  },
  Train: {
    label: 'Train Cohort',
    icon: Train,
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    color: 'text-indigo-600',
    accentBg: 'bg-indigo-600',
    description: 'Coordinate train coaches (Shatabdi / Express) and station cabs.'
  }
};

export default function CityCommunityHubPage({
  community,
  allCommunities: _allCommunities = [],
  user,
  posts = [],
  onBack,
  onSelectOtherCommunity: _onSelectOtherCommunity,
  onJoinCommunity,
  onLeaveCommunity,
  onAddPost,
  onLikePost,
  onAddComment,
  onRefreshPosts,
  onRefreshGroups,
  triggerToast
}) {
  const [activeTab, setActiveTab] = useState('rides'); // 'rides' | 'board'
  const [selectedModeFilter, setSelectedModeFilter] = useState('All'); // 'All' | 'Cab' | 'Train'
  const [rides, setRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(false);
  const [ridesError, setRidesError] = useState(null);

  // Create Ride Modal State
  const [isCreateRideModalOpen, setIsCreateRideModalOpen] = useState(false);
  const [rideFormMode, setRideFormMode] = useState('Cab');
  const [rideFormDate, setRideFormDate] = useState(getTomorrowDateStr);
  const [rideFormTime, setRideFormTime] = useState('17:00');
  const [rideFormDestination, setRideFormDestination] = useState(
    () => `${community?.name || 'City'} Center / Hub`
  );
  const [rideFormPickup, setRideFormPickup] = useState('Main Gate (Near Executive Mess)');
  const [rideFormTotalFare, setRideFormTotalFare] = useState(2400);
  const [rideFormMaxCapacity, setRideFormMaxCapacity] = useState(4);
  const [rideFormTransitDetails, setRideFormTransitDetails] = useState('');
  const [rideFormNotes, setRideFormNotes] = useState('');
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [rideFormError, setRideFormError] = useState('');

  // Action / Confirm state
  const [actionLoadingRideId, setActionLoadingRideId] = useState(null);
  const [rideToLeave, setRideToLeave] = useState(null);

  // Notice board state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('Carpool Request');
  const [postError, setPostError] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [openReplyPostId, setOpenReplyPostId] = useState(null);
  const [replyInputText, setReplyInputText] = useState('');

  const isUserEnrolledInCity = user?.joinedCommunity === community?.id;

  // Refresh community notice board posts on mount or community change
  useEffect(() => {
    if (community?.id && onRefreshPosts) {
      onRefreshPosts(community.id);
    }
  }, [community?.id, onRefreshPosts]);

  const refreshRides = useCallback(() => {
    if (!community?.id || !isUserEnrolledInCity) return;
    api.getCityRides(community.id, {
      mode: selectedModeFilter !== 'All' ? selectedModeFilter : undefined
    })
      .then((data) => {
        setRides(Array.isArray(data) ? data : []);
        setRidesError(null);
      })
      .catch((err) => {
        setRidesError(err.message || 'Failed to load rides');
      });
  }, [community, selectedModeFilter, isUserEnrolledInCity]);

  // Fetch Rides for this City (Restricted to enrolled hometown members)
  useEffect(() => {
    if (!community?.id || !isUserEnrolledInCity) {
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (active) setLoadingRides(true);
    });

    api.getCityRides(community.id, {
      mode: selectedModeFilter !== 'All' ? selectedModeFilter : undefined
    })
      .then((data) => {
        if (!active) return;
        setRides(Array.isArray(data) ? data : []);
        setRidesError(null);
      })
      .catch((err) => {
        if (!active) return;
        setRidesError(err.message || 'Failed to load rides');
      })
      .finally(() => {
        if (active) setLoadingRides(false);
      });

    return () => {
      active = false;
    };
  }, [community?.id, selectedModeFilter, isUserEnrolledInCity]);

  // Adjust default fare based on mode & distance
  const handleModeChange = (mode) => {
    setRideFormMode(mode);
    if (mode === 'Cab') {
      const distNum = parseInt(community?.distanceFromThapar, 10) || 200;
      setRideFormTotalFare(Math.round(distNum * 12));
      setRideFormMaxCapacity(4);
      setRideFormTransitDetails('Sedan AC Cab via Highway');
    } else if (mode === 'Train') {
      setRideFormTotalFare(300);
      setRideFormMaxCapacity(6);
      setRideFormTransitDetails('Shatabdi / Intercity Express');
    }
  };

  const handleCreateRideSubmit = async (e) => {
    e.preventDefault();
    if (!rideFormDate || !rideFormTime) {
      setRideFormError('Please select departure date and time.');
      return;
    }

    try {
      setIsSubmittingRide(true);
      setRideFormError('');

      await api.createCityRide(community.id, {
        date: rideFormDate,
        time: rideFormTime,
        mode: rideFormMode,
        destination: rideFormDestination,
        pickupPoint: rideFormPickup,
        totalFare: Number(rideFormTotalFare) || 0,
        maxCapacity: Number(rideFormMaxCapacity) || (rideFormMode === 'Cab' ? 4 : 6),
        transitDetails: rideFormTransitDetails,
        notes: rideFormNotes
      });

      if (triggerToast) {
        triggerToast({
          id: `ride_created_${rideFormMode}_${rideFormDate}`,
          type: 'success',
          title: 'Ride Posted!',
          message: `Your ${rideFormMode} ride to ${community.name} is now open for students.`
        });
      }

      setIsCreateRideModalOpen(false);
      refreshRides();
      if (onRefreshGroups) {
        onRefreshGroups();
      }
    } catch (err) {
      setRideFormError(err.message || 'Failed to create ride');
    } finally {
      setIsSubmittingRide(false);
    }
  };

  const handleJoinRide = async (ride) => {
    try {
      setActionLoadingRideId(ride.id);
      const res = await api.joinCityRide(community.id, ride.id);
      if (triggerToast) {
        triggerToast({
          id: `ride_joined_${ride.id}`,
          type: 'success',
          title: 'Joined Ride!',
          message: res?.message || `You joined the ${ride.mode} ride to ${community.name}.`
        });
      }
      refreshRides();
      if (onRefreshGroups) {
        onRefreshGroups();
      }
    } catch (err) {
      if (triggerToast) {
        triggerToast({
          id: `ride_join_err_${ride.id}`,
          type: 'error',
          title: 'Could Not Join',
          message: err.message
        });
      }
    } finally {
      setActionLoadingRideId(null);
    }
  };

  const handleLeaveRideConfirm = async () => {
    if (!rideToLeave) return;
    try {
      setActionLoadingRideId(rideToLeave.id);
      const res = await api.leaveCityRide(community.id, rideToLeave.id);
      if (triggerToast) {
        triggerToast({
          id: `ride_left_${rideToLeave.id}`,
          type: 'info',
          title: 'Left Ride',
          message: res?.message || 'You left this ride.'
        });
      }
      setRideToLeave(null);
      refreshRides();
      if (onRefreshGroups) {
        onRefreshGroups();
      }
    } catch (err) {
      if (triggerToast) {
        triggerToast({
          id: `ride_leave_err_${rideToLeave.id}`,
          type: 'error',
          title: 'Could Not Leave',
          message: err.message
        });
      }
    } finally {
      setActionLoadingRideId(null);
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
      await onAddPost({
        communityId: community.id,
        title: postTitle.trim(),
        content: postContent.trim(),
        category: postCategory || 'Carpool Request'
      });
      setPostTitle('');
      setPostContent('');
      setIsPosting(false);
      if (onRefreshPosts) {
        onRefreshPosts(community.id);
      }
    } catch (err) {
      setPostError(err.message || 'Failed to post notice. Verify you are an enrolled member of this hub.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleCommentSubmit = async (postId) => {
    if (!replyInputText.trim()) return;
    try {
      await onAddComment(postId, replyInputText.trim());
      setReplyInputText('');
      setOpenReplyPostId(null);
      if (onRefreshPosts) {
        onRefreshPosts(community.id);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const filteredPosts = (posts || []).filter((p) => (p.communityId || p.community_id) === community?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation & Community Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All City Communities</span>
        </button>
      </div>

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
                  {community?.description || `Connecting students traveling between Thapar & ${community?.name}.`}
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
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Distance</span>
            <span className="text-slate-100 font-bold text-sm mt-0.5 block">{community?.distanceFromThapar || '250 km'}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Cab Fare Split</span>
            <span className="text-slate-100 font-bold text-sm mt-0.5 block">Split 4-ways (Save 75%)</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Train Cohort</span>
            <span className="text-slate-100 font-bold text-sm mt-0.5 block">Group Transit Safety</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Enrolled Students</span>
            <span className="text-slate-100 font-bold text-sm mt-0.5 block">{community?.membersCount || 0} Students</span>
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
          <span>Thapar ➔ {community?.name} Rides (Cab, Train)</span>
          {isUserEnrolledInCity && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {rides.length}
            </span>
          )}
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
          <span>City Notice Board & Carpool Requests</span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">
            {filteredPosts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: RIDES & COHORTS (Cab, Train) */}
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
              To view scheduled rides, divide cab fares, or coordinate train travel cohorts for {community?.name}, you must be an enrolled member of this hometown hub.
            </p>
            {user?.joinedCommunity && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                You are currently enrolled in another community hub. The Single-Community policy allows membership in one hometown hub at a time.
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

      {activeTab === 'rides' && isUserEnrolledInCity && (
        <div className="space-y-6">
          {/* Controls: Mode Filter & Offer Ride Button */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Mode Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-xs font-bold text-slate-600 shrink-0">Transport Mode:</span>
              <button
                onClick={() => setSelectedModeFilter('All')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedModeFilter === 'All'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Modes ({rides.length})
              </button>

              <button
                onClick={() => setSelectedModeFilter('Cab')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedModeFilter === 'Cab'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Shared Cabs (Fare Split)</span>
              </button>

              <button
                onClick={() => setSelectedModeFilter('Train')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedModeFilter === 'Train'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <Train className="w-3.5 h-3.5" />
                <span>Trains (Shatabdi & Cohorts)</span>
              </button>
            </div>

            {/* Create Ride Action */}
            <button
              onClick={() => {
                handleModeChange('Cab');
                setIsCreateRideModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Offer / Create Ride to {community?.name}</span>
            </button>
          </div>

          {/* Rides Grid */}
          {loadingRides ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 animate-pulse">
                  <div className="h-6 w-32 bg-slate-200 rounded-full" />
                  <div className="h-8 w-3/4 bg-slate-200 rounded-lg" />
                  <div className="h-16 w-full bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : ridesError ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{ridesError}</span>
            </div>
          ) : rides.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200 mx-auto flex items-center justify-center">
                <Car className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-slate-900">
                  No {selectedModeFilter !== 'All' ? selectedModeFilter : ''} Rides Scheduled Yet
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Be the first student to schedule a ride from Thapar campus to {community?.name}. Others can join you to divide cab fares or travel safely together!
                </p>
              </div>
              <button
                onClick={() => {
                  handleModeChange(selectedModeFilter !== 'All' ? selectedModeFilter : 'Cab');
                  setIsCreateRideModalOpen(true);
                }}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Ride to {community?.name}</span>
              </button>
            </div>
          ) : (
            /* Ride Cards */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {rides.map((ride) => {
                const modeCfg = MODE_CONFIG[ride.mode] || MODE_CONFIG.Cab;
                const ModeIcon = modeCfg.icon;
                const isMember = ride.isMember;
                const isFull = ride.isFull;

                return (
                  <div
                    key={ride.id}
                    className="bg-white rounded-3xl border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${modeCfg.badgeBg}`}
                        >
                          <ModeIcon className="w-3.5 h-3.5" />
                          <span>{modeCfg.label}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isMember && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Joined
                            </span>
                          )}

                          {isFull ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Ride Full ({ride.maxCapacity}/{ride.maxCapacity})
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {ride.seatsLeft} {ride.seatsLeft === 1 ? 'seat left' : 'seats left'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Route & Destination */}
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <span>Origin:</span>
                          <span className="text-slate-600">{ride.origin}</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mt-0.5 leading-tight">
                          ➔ {ride.destination}
                        </h3>
                      </div>

                      {/* Date, Time & Pickup Point */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-semibold">{ride.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-semibold">{ride.time} IST</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Pickup: <strong>{ride.pickupPoint}</strong></span>
                        </div>
                      </div>

                      {/* SPECIFIC MODE CALLOUTS */}
                      {ride.mode === 'Cab' ? (
                        /* CAB FARE DIVISION BOX */
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5" />
                              Cab Fare Split (Equally Divided)
                            </span>
                            <span className="text-xs text-slate-500">
                              Total: <strong>₹{ride.totalFare}</strong>
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1">
                            <div>
                              <span className="text-2xl font-black text-blue-900">
                                ₹{ride.farePerPerson}
                              </span>
                              <span className="text-xs text-blue-700 font-semibold ml-1">
                                / student ({ride.currentMembersCount} riders)
                              </span>
                            </div>

                            {ride.seatsLeft > 0 && (
                              <div className="text-[11px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-lg">
                                Drops to ₹{Math.round(ride.totalFare / (ride.currentMembersCount + 1))} if another joins!
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* TRAIN COHORT BOX */
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">
                              {ride.transitDetails || `${ride.mode} Group Cohort`}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              Travel Together Cohort
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {ride.notes || 'Traveling together for safety, campus taxi sharing, and company during journey.'}
                          </p>
                        </div>
                      )}

                      {/* Members Roster / Avatars */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="flex items-center -space-x-1.5">
                          {(ride.members || []).map((m, idx) => (
                            <div key={idx} className="ring-2 ring-white rounded-full" title={`${m.name} (${m.hostel})`}>
                              <Avatar
                                src={m.avatar}
                                name={m.name}
                                size="w-7 h-7"
                                textSize="text-[10px]"
                                rounded="rounded-full"
                              />
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          Created by <strong className="text-slate-700">{ride.creatorName}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-400">
                        {ride.notes && ride.mode === 'Cab' && (
                          <span className="truncate max-w-[200px] block" title={ride.notes}>
                            Note: {ride.notes}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isMember ? (
                          <button
                            onClick={() => setRideToLeave(ride)}
                            disabled={actionLoadingRideId === ride.id}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Leave Ride
                          </button>
                        ) : isFull ? (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
                          >
                            Ride Full
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinRide(ride)}
                            disabled={actionLoadingRideId === ride.id}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {ride.mode === 'Cab'
                                ? `Join & Pay ₹${Math.round(ride.totalFare / (ride.currentMembersCount + 1))}`
                                : 'Join Travel Group'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <h3 className="font-bold text-slate-900 text-sm">Create New Notice / Carpool Request</h3>
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
                  <label className="text-xs font-bold text-slate-700 shrink-0">Notice Category:</label>
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
              <p className="text-sm font-bold text-slate-700">No notices posted for {community?.name} yet.</p>
              <p className="text-xs text-slate-400">Join this community hub to post the first update!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const authorName = post.author || post.authorName || 'Student';
                const authorHostel = post.authorHostel || '';
                const authorAvatar = post.authorAvatar || 'ST';
                const isLiked = Boolean(post.isLiked);
                const likesCount = typeof post.likes === 'number' ? post.likes : (Array.isArray(post.likes) ? post.likes.length : 0);
                const commentsList = Array.isArray(post.comments) ? post.comments : [];
                const hasReplies = commentsList.length > 0;

                return (
                  <div key={post.id} className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar src={authorAvatar} name={authorName} size="w-9 h-9" textSize="text-xs" rounded="rounded-full" />
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
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{post.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs">
                      <button
                        onClick={() => onLikePost && onLikePost(post.id)}
                        className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                          isLiked ? 'text-rose-600' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-600' : ''}`} />
                        <span>{likesCount}</span>
                      </button>

                      <button
                        onClick={() => setOpenReplyPostId(openReplyPostId === post.id ? null : post.id)}
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
                          <div key={comm.id} className="bg-slate-50 p-2.5 rounded-2xl text-xs space-y-1">
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                              <span>{comm.author || comm.authorName || 'Student'}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {comm.createdAt ? new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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

      {/* CREATE RIDE MODAL */}
      {isCreateRideModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  <Sparkles className="w-3 h-3" />
                  Campus Transit to {community?.name}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Schedule Ride to {community?.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Divide cab fares or coordinate train travel cohorts.
                </p>
              </div>
              <button
                onClick={() => setIsCreateRideModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rideFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rideFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRideSubmit} className="space-y-4 text-xs sm:text-sm">
              {/* Transport Mode Selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Transport Mode *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Cab', label: 'Shared Cab', icon: Car },
                    { id: 'Train', label: 'Train Cohort', icon: Train }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isActive = rideFormMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModeChange(m.id)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Departure Date *</label>
                  <input
                    type="date"
                    value={rideFormDate}
                    onChange={(e) => setRideFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Departure Time *</label>
                  <input
                    type="time"
                    value={rideFormTime}
                    onChange={(e) => setRideFormTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Drop-off Destination */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">City Drop-off Area *</label>
                <input
                  type="text"
                  value={rideFormDestination}
                  onChange={(e) => setRideFormDestination(e.target.value)}
                  placeholder="e.g. Kashmiri Gate ISBT, South Extension, Sector 17..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Pickup Point on Campus */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Campus Pickup Point *</label>
                <select
                  value={rideFormPickup}
                  onChange={(e) => setRideFormPickup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Main Gate (Near Executive Mess)">Main Gate (Near Executive Mess)</option>
                  <option value="Campus Gate 2 (Near Library)">Campus Gate 2 (Near Library)</option>
                  <option value="Hostel-J / Tejas Hall Gate">Hostel-J / Tejas Hall Gate</option>
                  <option value="Hostel-B / Amritam Hall Entrance">Hostel-B / Amritam Hall Entrance</option>
                  <option value="Patiala Railway Station (Sharing cab to station)">Patiala Railway Station</option>
                  <option value="Patiala Bus Stand (Sharing cab to bus terminal)">Patiala Bus Stand</option>
                </select>
              </div>

              {/* Mode-Specific Settings: Cab Fare or Train Info */}
              {rideFormMode === 'Cab' ? (
                <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-blue-900 text-xs">Total Cab Fare (₹) *</label>
                    <input
                      type="number"
                      value={rideFormTotalFare}
                      onChange={(e) => setRideFormTotalFare(e.target.value)}
                      placeholder="e.g. 2400"
                      min={100}
                      className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-blue-900 focus:border-blue-500 focus:outline-hidden"
                      required
                    />
                    <span className="text-[10px] text-blue-600 block">Divided equally among riders</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-blue-900 text-xs">Total Seats in Cab *</label>
                    <select
                      value={rideFormMaxCapacity}
                      onChange={(e) => setRideFormMaxCapacity(e.target.value)}
                      className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-blue-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="3">3 Seats (Spacious Sedan)</option>
                      <option value="4">4 Seats (Standard Cab)</option>
                      <option value="6">6 Seats (SUV / Ertiga)</option>
                    </select>
                    <span className="text-[10px] text-blue-600 block">
                      ~₹{Math.round((Number(rideFormTotalFare) || 2400) / Number(rideFormMaxCapacity))} per student
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="block font-bold text-slate-800 text-xs">
                    Train Name / Number
                  </label>
                  <input
                    type="text"
                    value={rideFormTransitDetails}
                    onChange={(e) => setRideFormTransitDetails(e.target.value)}
                    placeholder="e.g. Kalka Shatabdi #12006 (Ambala Cantt -> NDLS)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Helps students book the same train coach or coordinate shared station cabs.
                  </span>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Notes / Luggage Details</label>
                <input
                  type="text"
                  value={rideFormNotes}
                  onChange={(e) => setRideFormNotes(e.target.value)}
                  placeholder="e.g. Leaving right after lab, max 1 trolley bag each, splitting station auto..."
                  maxLength={500}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateRideModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRide}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRide ? 'Scheduling...' : 'Post Ride'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAVE RIDE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(rideToLeave)}
        title={`Leave ${rideToLeave?.mode} ride to ${rideToLeave?.destination}?`}
        message="Are you sure you want to leave this ride? Your reserved seat will be reopened for other students, and the fare will be recalculated among remaining riders."
        confirmLabel="Leave Ride"
        cancelLabel="Stay in Ride"
        isDestructive={true}
        onConfirm={handleLeaveRideConfirm}
        onCancel={() => setRideToLeave(null)}
      />
    </div>
  );
}
