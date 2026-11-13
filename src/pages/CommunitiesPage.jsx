import React, { useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import ConfirmDialog from '../components/ConfirmDialog';
import { 
  Users, 
  Search, 
  Plus, 
  MessageSquare, 
  Check, 
  Info, 
  Send, 
  MapPin, 
  ArrowLeftRight, 
  Image as ImageIcon, 
  MoreVertical, 
  ThumbsUp, 
  ChevronDown, 
  X,
  Compass
} from 'lucide-react';
import { 
  POPULAR_STATES 
} from '../data/indiaLocations';

export default function CommunitiesPage({ 
  communities = [], 
  posts = [], 
  user, 
  onJoinCommunity, 
  onLeaveCommunity, 
  onCreateCommunity,
  onAddPost, 
  onSelectCommunityTravel: _onSelectCommunityTravel,
  onOpenCityHub,
  onLikePost,
  onAddComment,
  onSelectCommunity
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('All');
  
  // Selected community ID
  const initialCommId = user?.joinedCommunity || (communities && communities[0]?.id) || 'del';
  const [selectedCommunityId, setSelectedCommunityId] = useState(initialCommId);

  // Switch Community confirmation dialog
  const [targetCommunityToJoin, setTargetCommunityToJoin] = useState(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  // Post Creator State
  const [postContent, setPostContent] = useState('');
  const [showPhotoAlert, setShowPhotoAlert] = useState(false);
  const [showTripDetailsInput, setShowTripDetailsInput] = useState(false);
  const [tripDetailsText, setTripDetailsText] = useState('');
  const [boardNotice, setBoardNotice] = useState('');

  // Comment Thread State (postId that currently has open reply box)
  const [openReplyPostId, setOpenReplyPostId] = useState(null);
  const [replyInputText, setReplyInputText] = useState('');

  // Create Community Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newState, setNewState] = useState('Punjab');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCityName, setCustomCityName] = useState('');
  const [newDistance, setNewDistance] = useState('');
  const [newTransport, setNewTransport] = useState('Shared Cabs, Express Buses');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmittingCommunity, setIsSubmittingCommunity] = useState(false);
  const [createCommunityError, setCreateCommunityError] = useState('');

  // Switch Community dropdown toggle in header
  const [showSwitchDropdown, setShowSwitchDropdown] = useState(false);

  // Filtered communities
  const filteredCommunities = (communities && communities.length > 0 ? communities : [
    { id: 'del', name: 'Delhi NCR', state: 'Delhi', membersCount: 842, description: 'Delhi, Noida, Gurugram, Ghaziabad' },
    { id: 'chd', name: 'Chandigarh', state: 'Punjab', membersCount: 516, description: 'Chandigarh, Mohali, Panchkula' },
    { id: 'ldh', name: 'Ludhiana', state: 'Punjab', membersCount: 327, description: 'Ludhiana & nearby areas' },
    { id: 'jai', name: 'Jaipur', state: 'Rajasthan', membersCount: 214, description: 'Jaipur & nearby areas' },
    { id: 'asr', name: 'Amritsar', state: 'Punjab', membersCount: 193, description: 'Amritsar & nearby areas' }
  ]).filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.state && c.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterState === 'All') return matchesSearch;
    return matchesSearch && c.state && c.state.toLowerCase().includes(filterState.toLowerCase());
  });

  const activeCommunity = (communities || []).find((c) => c.id === selectedCommunityId) || {
    id: 'del',
    name: 'Delhi NCR',
    state: 'Delhi',
    membersCount: 842,
    description: 'Delhi, Noida, Gurugram, Ghaziabad'
  };

  const isUserJoined = user?.joinedCommunity === activeCommunity.id;

  // Filter real posts for this community
  const dbPosts = (posts || []).filter((p) => p.communityId === activeCommunity.id);

  // Fallback featured discussions if no database posts exist yet (matches Image 5)
  const defaultDiscussions = [
    {
      id: 'mock_post_1',
      authorName: 'Aarav Sharma',
      authorInitial: 'A',
      authorColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
      meta: 'B.Tech CSE • 2 hours ago',
      content: 'Ride sharing: Going from Delhi (Dwarka) to campus tomorrow (Nov 14) around 1:00 PM. 2 seats available. DM if you want to join!',
      likesCount: 14,
      repliesCount: 5,
      replies: [
        { id: 'r1', authorName: 'Rohan Gupta', meta: '1 hour ago', text: 'Hey Aarav, do you still have a seat left?' }
      ]
    },
    {
      id: 'mock_post_2',
      authorName: 'Khushi Verma',
      authorInitial: 'K',
      authorColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
      meta: 'B.Tech ECE • 6 hours ago',
      content: 'Looking for a roommate for next semester (Jan–May). Preferably from Delhi NCR. DM if interested!',
      likesCount: 9,
      repliesCount: 7,
      replies: []
    },
    {
      id: 'mock_post_3',
      authorName: 'Raghav Mehta',
      authorInitial: 'R',
      authorColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
      meta: 'B.Tech ME • 11 hours ago',
      content: 'Travel plans: Planning to leave from Gurugram on Nov 17 (Sun) around 3:00 PM. Have space for 3 more. Let me know if you\'re coming!',
      likesCount: 18,
      repliesCount: 4,
      replies: []
    }
  ];

  const displayedPosts = dbPosts.length > 0 ? dbPosts : defaultDiscussions;

  // Handle Post Creation
  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!isUserJoined) {
      setBoardNotice(`Only verified members of ${activeCommunity.name} community can create posts.`);
      setTimeout(() => setBoardNotice(''), 4000);
      return;
    }
    if (!postContent.trim()) return;

    let fullContent = postContent.trim();
    if (tripDetailsText.trim()) {
      fullContent = `${fullContent}\n\n📍 Trip details: ${tripDetailsText.trim()}`;
    }

    if (onAddPost) {
      onAddPost({
        communityId: activeCommunity.id,
        category: 'Ride Sharing',
        title: postContent.slice(0, 50),
        content: fullContent
      });
    }

    setPostContent('');
    setTripDetailsText('');
    setShowTripDetailsInput(false);
  };

  // Handle Join click
  const handleJoinClick = (comm) => {
    if (user?.joinedCommunity && user.joinedCommunity !== comm.id) {
      // User is already in another community -> trigger confirmation dialog
      setTargetCommunityToJoin(comm);
      setShowSwitchConfirm(true);
      return;
    }

    if (onJoinCommunity) {
      onJoinCommunity(comm.id);
      setSelectedCommunityId(comm.id);
      if (onSelectCommunity) onSelectCommunity(comm.id);
    }
  };

  // Confirm Switch Community
  const handleConfirmSwitch = async () => {
    if (!targetCommunityToJoin) return;
    try {
      if (user?.joinedCommunity && onLeaveCommunity) {
        await onLeaveCommunity(user.joinedCommunity);
      }
      if (onJoinCommunity) {
        await onJoinCommunity(targetCommunityToJoin.id);
      }
      setSelectedCommunityId(targetCommunityToJoin.id);
      if (onSelectCommunity) onSelectCommunity(targetCommunityToJoin.id);
    } finally {
      setShowSwitchConfirm(false);
      setTargetCommunityToJoin(null);
    }
  };

  // Handle Like
  const handleLikeClick = (post) => {
    if (!isUserJoined) {
      setBoardNotice(`Join ${activeCommunity.name} community to react to notices.`);
      setTimeout(() => setBoardNotice(''), 4000);
      return;
    }
    if (onLikePost && post.id && !post.id.startsWith('mock_')) {
      onLikePost(post.id);
    }
  };

  // Handle Comment Submit
  const handleCommentSubmit = (postId, e) => {
    e.preventDefault();
    if (!isUserJoined) {
      setBoardNotice(`Join ${activeCommunity.name} community to reply to notices.`);
      setTimeout(() => setBoardNotice(''), 4000);
      return;
    }
    if (!replyInputText.trim()) return;

    if (onAddComment && !postId.startsWith('mock_')) {
      onAddComment(postId, replyInputText.trim());
    }
    setReplyInputText('');
  };

  // Handle Create Community
  const handleCreateCommunitySubmit = async (e) => {
    e.preventDefault();
    const finalCityName = selectedCity === '__custom__' ? customCityName.trim() : selectedCity;
    if (!finalCityName) {
      setCreateCommunityError('Please select or specify a city name.');
      return;
    }

    setIsSubmittingCommunity(true);
    setCreateCommunityError('');

    try {
      if (onCreateCommunity) {
        const newComm = await onCreateCommunity({
          name: finalCityName,
          state: newState,
          distanceFromThapar: newDistance ? `${newDistance} km` : '120 km',
          popularTransport: newTransport || 'Shared Cabs, Express Buses',
          description: newDesc || `Student community for Thapar students from ${finalCityName}, ${newState}.`,
          icon: '🏙️'
        });
        if (newComm?.id) {
          setSelectedCommunityId(newComm.id);
        }
      }
      setShowCreateModal(false);
    } catch (err) {
      setCreateCommunityError(err.message || 'Failed to create community.');
    } finally {
      setIsSubmittingCommunity(false);
    }
  };

  const userInitial = (user?.name?.charAt(0) || 'P').toUpperCase();

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Top Banner Matching Image 5 */}
      <HeroBanner
        tag="YOUR CAMPUS. YOUR COMMUNITY."
        title="City Communities"
        subtitle="Join your hometown community, find travel partners, and connect with fellow Thapar students."
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Notice alert toast if any */}
        {boardNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{boardNotice}</span>
            </div>
            <button onClick={() => setBoardNotice('')} className="text-amber-600 hover:text-amber-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2-Column Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Community Directory (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            
            {/* Header: Title + Create Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Community Directory
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Find and join your hometown community.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Community</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search communities (e.g., Delhi, Chandigarh)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* State Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['All', 'Punjab', 'Haryana', 'Delhi', 'Rajasthan'].map((stateName) => {
                const isActive = filterState.toLowerCase() === stateName.toLowerCase();
                return (
                  <button
                    key={stateName}
                    type="button"
                    onClick={() => setFilterState(stateName)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {stateName}
                  </button>
                );
              })}

              {/* Extra states dropdown */}
              <div className="relative shrink-0">
                <select
                  value={['All', 'Punjab', 'Haryana', 'Delhi', 'Rajasthan'].includes(filterState) ? '' : filterState}
                  onChange={(e) => {
                    if (e.target.value) setFilterState(e.target.value);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-xs font-bold appearance-none cursor-pointer pr-6 focus:outline-none"
                >
                  <option value="">+ More ▾</option>
                  {POPULAR_STATES.filter(s => !['Punjab', 'Haryana', 'Delhi', 'Rajasthan'].includes(s)).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Communities List */}
            <div className="space-y-2.5 pt-1">
              {filteredCommunities.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching communities found. Try another search.
                </div>
              ) : (
                filteredCommunities.map((c) => {
                  const isSelected = activeCommunity.id === c.id;
                  const isMember = user?.joinedCommunity === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCommunityId(c.id);
                        if (onSelectCommunity) onSelectCommunity(c.id);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-400 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Icon & Names */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {c.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {c.membersCount || 842} members • {c.description || `${c.name} & nearby areas`}
                          </p>
                        </div>
                      </div>

                      {/* Right: Join / Joined Button */}
                      <div className="shrink-0">
                        {isMember ? (
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Joined</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinClick(c);
                            }}
                            className="px-4 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-blue-200/80 dark:border-blue-800 transition-colors cursor-pointer"
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Column: Active Community Hub & Discussions (7 cols) */}
          <div className="lg:col-span-7 space-y-4">

            {/* Active Community Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3.5">
              
              <div className="flex items-center justify-between gap-4">
                {/* Left: MapPin Icon + Title */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {activeCommunity.name} Community
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeCommunity.membersCount || 842} members • {activeCommunity.description || `${activeCommunity.name} & nearby areas`}
                    </p>
                  </div>
                </div>

                {/* Right: Switch Community Dropdown */}
                <div className="relative shrink-0 flex items-center gap-2">
                  {onOpenCityHub && isUserJoined && (
                    <button
                      type="button"
                      onClick={() => onOpenCityHub(activeCommunity)}
                      className="hidden sm:inline-flex px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 rounded-xl text-xs font-bold items-center gap-1.5 cursor-pointer"
                      title="Open ride departures and slot bookings for this community"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Departures</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowSwitchDropdown(!showSwitchDropdown)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Switch Community</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {/* Switch dropdown menu */}
                  {showSwitchDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-20 animate-in fade-in duration-150">
                      <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Select a Community
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {communities.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCommunityId(c.id);
                              if (onSelectCommunity) onSelectCommunity(c.id);
                              setShowSwitchDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                              activeCommunity.id === c.id ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>{c.name}</span>
                            {user?.joinedCommunity === c.id && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">Joined</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Single-community Policy Alert */}
              <div className="bg-blue-50/70 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 rounded-xl px-3.5 py-2.5 text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  You can be a member of only one city community at a time. To join another, leave your current community first.
                </span>
              </div>
            </div>

            {/* Post Creator Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3">
              <form onSubmit={handlePostSubmit} className="space-y-3">
                <div className="flex items-start gap-3">
                  {/* User Initial Avatar in Magenta */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-xs select-none">
                    {userInitial}
                  </div>

                  {/* Input field */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Share a ride plan, find a roommate, or ask a travel-related query..."
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />

                    {/* Optional Trip Details field when toggled */}
                    {showTripDetailsInput && (
                      <input
                        type="text"
                        value={tripDetailsText}
                        onChange={(e) => setTripDetailsText(e.target.value)}
                        placeholder="e.g. Departing Friday 4:00 PM from Gate 1 to Dwarka, 2 seats free"
                        className="w-full px-3.5 py-1.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Photo alert popup when clicked */}
                {showPhotoAlert && (
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
                    <span>Photo uploads are enabled for verified travel receipts and meeting points.</span>
                    <button type="button" onClick={() => setShowPhotoAlert(false)} className="text-blue-500 hover:text-blue-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPhotoAlert(!showPhotoAlert)}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      <span>Add photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTripDetailsInput(!showTripDetailsInput)}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>Add trip details (optional)</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section Heading: Community Discussions */}
            <div className="flex items-center gap-2 pt-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Community Discussions
              </h3>
            </div>

            {/* Discussions List */}
            <div className="space-y-3">
              {displayedPosts.map((post) => {
                const postId = post.id || post._id;
                const authorInitial = (post.authorName || post.author?.name || 'S').charAt(0).toUpperCase();
                const authorName = post.authorName || post.author?.name || 'Student';
                const metaText = post.meta || `${post.category || 'Ride Notice'} • Just now`;
                const isRepliesOpen = openReplyPostId === postId;

                return (
                  <div
                    key={postId}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    {/* Header Row: Author & Meta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 select-none ${
                          post.authorColor || 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                        }`}>
                          {authorInitial}
                        </div>

                        {/* Name & Time */}
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {authorName}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {metaText}
                          </p>
                        </div>
                      </div>

                      {/* Three-dots menu */}
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Post Content */}
                    <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </div>

                    {/* Reactions Row */}
                    <div className="flex items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleLikeClick(post)}
                        className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="font-semibold">{post.likesCount || post.likes?.length || 14}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpenReplyPostId(isRepliesOpen ? null : postId)}
                        className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="font-semibold">
                          {post.repliesCount || post.comments?.length || 5} replies
                        </span>
                      </button>
                    </div>

                    {/* Expanded Replies View */}
                    {isRepliesOpen && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {/* Existing replies */}
                        {((post.replies || post.comments) || []).map((rep, idx) => (
                          <div key={rep.id || idx} className="pl-3 border-l-2 border-blue-200 dark:border-blue-800 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{rep.authorName || rep.author?.name || 'Fellow Student'}</span>
                              <span className="text-[10px] text-slate-400">{rep.meta || '1h ago'}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{rep.text || rep.content}</p>
                          </div>
                        ))}

                        {/* Reply Input */}
                        <form onSubmit={(e) => handleCommentSubmit(postId, e)} className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={replyInputText}
                            onChange={(e) => setReplyInputText(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Reply
                          </button>
                        </form>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

      {/* Confirmation Dialog: Leaving community to join another */}
      {showSwitchConfirm && (
        <ConfirmDialog
          isOpen={showSwitchConfirm}
          title="Switch Hometown Community?"
          message={`You are currently enrolled in a city community. Under Thapar community rules, you can only belong to one hometown hub at a time. Do you want to leave and join ${targetCommunityToJoin?.name}?`}
          confirmLabel="Switch Community"
          onConfirm={handleConfirmSwitch}
          onCancel={() => {
            setShowSwitchConfirm(false);
            setTargetCommunityToJoin(null);
          }}
        />
      )}

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Create New Hometown Community
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set up a city hub for students from your region
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createCommunityError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                {createCommunityError}
              </div>
            )}

            <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  State / Region
                </label>
                <select
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {POPULAR_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  City Name
                </label>
                <input
                  type="text"
                  value={customCityName}
                  onChange={(e) => {
                    setCustomCityName(e.target.value);
                    setSelectedCity('__custom__');
                  }}
                  placeholder="e.g. Dehradun, Shimla, Varanasi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Distance from Campus (km)
                  </label>
                  <input
                    type="number"
                    value={newDistance}
                    onChange={(e) => setNewDistance(e.target.value)}
                    placeholder="120"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Transit
                  </label>
                  <input
                    type="text"
                    value={newTransport}
                    onChange={(e) => setNewTransport(e.target.value)}
                    placeholder="Trains, Cabs, Buses"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Short Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Areas covered and popular holiday travel routes..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCommunity}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {isSubmittingCommunity ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
