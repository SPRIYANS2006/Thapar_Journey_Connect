import React, { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';
import { 
  Users, 
  MapPin, 
  Search, 
  Plus, 
  MessageSquare, 
  Heart, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Send, 
  Compass,
  Building2,
  Calendar,
  CornerDownRight,
  X,
  Car,
  Info,
  Lock
} from 'lucide-react';

export default function CommunitiesPage({ 
  communities, 
  posts, 
  user, 
  onJoinCommunity, 
  onLeaveCommunity, 
  onCreateCommunity,
  onAddPost, 
  onSelectCommunityTravel,
  onLikePost,
  onAddComment,
  onSelectCommunity
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunityId, setSelectedCommunityId] = useState(user?.joinedCommunity || (communities && communities[0]?.id) || 'del');
  const [filterState, setFilterState] = useState('All');
  
  // Create New Community Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newState, setNewState] = useState('');
  const [newIcon, setNewIcon] = useState('🏙️');
  const [newDistance, setNewDistance] = useState('');
  const [newTransport, setNewTransport] = useState('Trains, Shared Cabs, Express Buses');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmittingCommunity, setIsSubmittingCommunity] = useState(false);
  const [createCommunityError, setCreateCommunityError] = useState('');
  const [createCommunitySuccess, setCreateCommunitySuccess] = useState('');

  // Post Creator State
  const [isPosting, setIsPosting] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('Ride Sharing');

  // Comment Thread State (post ID that currently has open reply box)
  const [openReplyPostId, setOpenReplyPostId] = useState(null);
  const [replyInputText, setReplyInputText] = useState('');

  // Filtered communities
  const filteredCommunities = (communities || []).filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.tags && c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    
    if (filterState === 'All') return matchesSearch;
    return matchesSearch && c.state.toLowerCase().includes(filterState.toLowerCase());
  });

  const activeCommunity = (communities || []).find((c) => c.id === selectedCommunityId) || communities[0] || {
    id: 'del',
    name: 'Delhi NCR',
    state: 'Delhi / NCR',
    icon: '🚇',
    membersCount: 0,
    distanceFromThapar: '250 km',
    popularTransport: 'Shatabdi Express, Long Cabs, Volvos',
    description: 'Largest student origin community covering South Delhi, Noida, Gurgaon & West Delhi.',
    tags: ['Holiday Rush', 'Shatabdi Cohort', 'IGI Airport']
  };

  const activePosts = (posts || []).filter((p) => p.communityId === activeCommunity?.id);
  const isUserJoined = user?.joinedCommunity === activeCommunity?.id;

  // Auto-sync posts when active community selection changes
  useEffect(() => {
    if (onSelectCommunity && selectedCommunityId) {
      onSelectCommunity(selectedCommunityId);
    }
  }, [selectedCommunityId, onSelectCommunity]);

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!isUserJoined) {
      alert(`Access Restricted: Under Thapar hometown privacy policy, only verified members of ${activeCommunity.name} community can create posts or ride notices.`);
      return;
    }
    if (!postTitle.trim() || !postContent.trim()) return;

    const newPost = {
      id: `post-${Date.now()}`,
      communityId: activeCommunity.id,
      author: user?.name || 'TIET Student',
      authorAvatar: user?.avatar || (user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'),
      authorHostel: user?.hostel || 'Hostel',
      timeAgo: 'Just now',
      category: postCategory,
      title: postTitle.trim(),
      content: postContent.trim(),
      likes: 0,
      repliesCount: 0,
      comments: []
    };

    onAddPost(newPost);
    setPostTitle('');
    setPostContent('');
    setIsPosting(false);
  };

  const handleCommentSubmit = (postId, e) => {
    e.preventDefault();
    if (!isUserJoined) {
      alert(`Access Restricted: Only members of ${activeCommunity.name} community can reply to notices.`);
      return;
    }
    if (!replyInputText.trim()) return;

    if (onAddComment) {
      onAddComment(postId, replyInputText.trim());
    }
    setReplyInputText('');
  };

  const handleCreateCommunitySubmit = async (e) => {
    e.preventDefault();
    setCreateCommunityError('');
    setCreateCommunitySuccess('');

    if (!newCityName.trim()) {
      setCreateCommunityError('Please enter a City or Region name.');
      return;
    }

    try {
      setIsSubmittingCommunity(true);
      const created = await onCreateCommunity({
        name: newCityName.trim(),
        state: newState.trim() || 'North India',
        icon: newIcon.trim() || '🏙️',
        distanceFromThapar: newDistance.trim() ? `${newDistance.trim()} km` : '250 km',
        popularTransport: newTransport.trim() || 'Trains, Shared Cabs, Express Buses',
        description: newDesc.trim() || `Official student community for Thapar students hailing from ${newCityName.trim()}. Coordinate rides and campus meetups!`,
        tags: [newCityName.trim(), 'Campus Carpool', 'Weekend Trip']
      });

      setCreateCommunitySuccess(`Community "${created.name}" created successfully!`);
      if (created?.id) {
        setSelectedCommunityId(created.id);
      }
      setTimeout(() => {
        setShowCreateModal(false);
        setNewCityName('');
        setNewState('');
        setNewDistance('');
        setNewDesc('');
        setCreateCommunitySuccess('');
        setCreateCommunityError('');
      }, 1000);
    } catch (err) {
      setCreateCommunityError(err.message || 'Failed to create community. Please try again.');
    } finally {
      setIsSubmittingCommunity(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-blue-200 text-xs font-semibold mb-3 border border-white/10">
            <Users className="w-3.5 h-3.5 text-blue-300" />
            <span>Thapar City Communities</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Connect with your hometown peers.
          </h1>

          <p className="text-slate-200 text-sm sm:text-base mt-2 font-normal leading-relaxed">
            Join your hometown city community to coordinate weekend carpools, train co-passengers, holiday departures, and campus meetups with peers from your district.
          </p>

          {/* User's current community status pill */}
          <div className="mt-5 inline-flex items-center gap-3 bg-white/15 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs">
            <span className="text-blue-200">Your Active Community:</span>
            {user?.joinedCommunity ? (
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {communities.find(c => c.id === user.joinedCommunity)?.name || 'Hometown'} Community
              </span>
            ) : (
              <span className="text-amber-200 font-medium">None joined yet (Pick one below)</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Directory + Active Community Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Community Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Search & State Filters */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search city, state or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
              {['All', 'Punjab', 'Haryana', 'Delhi', 'Rajasthan'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterState(st)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    filterState === st 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Add Custom Community Hub Trigger Button */}
            <button
              onClick={() => {
                setNewCityName(searchQuery.trim());
                setShowCreateModal(true);
              }}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Can't find your city? Add Community Hub</span>
            </button>
          </div>

          {/* Communities List */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredCommunities.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-3">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-700">No community found for "{searchQuery}"</p>
                  <p className="text-xs text-slate-400 mt-1">Be the first to start a hub for your hometown!</p>
                </div>
                <button
                  onClick={() => {
                    setNewCityName(searchQuery.trim());
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add "{searchQuery || 'New City'}" as Hub</span>
                </button>
              </div>
            ) : (
              filteredCommunities.map((c) => {
                const isSelected = c.id === selectedCommunityId;
                const isUserMember = user?.joinedCommunity === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCommunityId(c.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 shadow-sm ring-1 ring-blue-400/50'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-xl shrink-0">
                          {c.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-sm text-slate-900">{c.name}</h4>
                            {isUserMember && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                Joined
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{c.state} • {c.distanceFromThapar}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3 text-slate-500" />
                          {c.membersCount}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {(c.tags || []).map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Community Hub & Forum (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Community Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-center text-3xl shadow-sm">
                  {activeCommunity.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {activeCommunity.name} Community
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {activeCommunity.state} • Approx {activeCommunity.distanceFromThapar} from TIET Patiala
                  </p>
                </div>
              </div>

              {/* Join / Leave Buttons */}
              <div>
                {isUserJoined ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Member
                    </span>
                    <button
                      onClick={() => onLeaveCommunity(activeCommunity.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                    >
                      Leave
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onJoinCommunity(activeCommunity.id)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Join Community
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics & Travel Action */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Enrolled</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">{activeCommunity.membersCount} Students</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Popular Commute Mode</span>
                <p className="text-xs font-bold text-slate-800 mt-1 truncate">{activeCommunity.popularTransport}</p>
              </div>
            </div>

            {/* One-Click Matching Button */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Single-Community Rule: Students can belong to 1 official hometown hub at a time.
              </p>
              <button
                onClick={() => onSelectCommunityTravel(activeCommunity)}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors"
              >
                <span>Find Rides to {activeCommunity.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Discussion Notice Board */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900">
                  Community Board & Ride Requests
                </h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                  {activePosts.length} posts
                </span>
              </div>

              {isUserJoined ? (
                !isPosting && (
                  <button
                    onClick={() => setIsPosting(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Post Notice / Carpool</span>
                  </button>
                )
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Members Only</span>
                </div>
              )}
            </div>

            {/* Post Creator Box */}
            {isUserJoined && isPosting && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Post in {activeCommunity.name} Community
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPosting(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Short Title (e.g. Innova cab to Jalandhar)"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                    className="sm:col-span-2 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ride Sharing">Ride Sharing</option>
                    <option value="Travel Tip">Travel Tip</option>
                    <option value="Train / Bus Cohort">Train / Bus Cohort</option>
                    <option value="General Query">General Query</option>
                  </select>
                </div>

                <textarea
                  placeholder="Describe your departure time, number of empty seats, cost split, or questions..."
                  rows={3}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPosting(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Post</span>
                  </button>
                </div>
              </form>
            )}

            {/* Posts Stream or Locked Screen */}
            {!isUserJoined ? (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white text-center shadow-xl border border-indigo-900/50 space-y-6 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8 text-indigo-300" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {activeCommunity.name} Community Hub is Private
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Under Thapar Hometown Privacy Policy, community discussion boards, carpools, and train cohort notices are restricted exclusively to enrolled members of <strong>{activeCommunity.name}</strong>.
                  </p>
                </div>

                {user?.joinedCommunity ? (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 max-w-md mx-auto border border-white/15 text-xs text-slate-200 space-y-3">
                    <p className="leading-relaxed">
                      You are currently enrolled in the <strong>{communities.find(c => c.id === user.joinedCommunity)?.name || 'another'} Community</strong>.
                    </p>
                    <p className="text-[11px] text-amber-300 font-medium">
                      Single-Community Policy: You can belong to 1 official hometown hub at a time. Leave your current community if you wish to switch here.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Switch hometown hub to ${activeCommunity.name}? You will leave ${communities.find(c => c.id === user.joinedCommunity)?.name || 'your current community'}.`)) {
                          onLeaveCommunity(user.joinedCommunity);
                          setTimeout(() => onJoinCommunity(activeCommunity.id), 250);
                        }
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Switch to {activeCommunity.name} Community</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onJoinCommunity(activeCommunity.id)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/30 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Join {activeCommunity.name} to Unlock Board & Notices</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {activePosts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">No community notices yet</p>
                    <p className="text-xs text-slate-400">
                      Be the first student to post a travel plan or carpool request for {activeCommunity.name}!
                    </p>
                    <button
                      onClick={() => setIsPosting(true)}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl hover:bg-blue-100"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create First Post
                    </button>
                  </div>
                ) : (
                  activePosts.map((post) => {
                    const isReplyBoxOpen = openReplyPostId === post.id;
                    const commentsList = post.comments || [];

                    return (
                      <div key={post.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={post.authorAvatar}
                              name={post.author}
                              size="w-9 h-9"
                              textSize="text-xs"
                              rounded="rounded-full"
                              bg="bg-blue-600"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{post.author}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  {post.authorHostel}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">{post.timeAgo || 'Recently'}</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                            {post.category}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-900 mb-1">{post.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{post.content}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => onLikePost && onLikePost(post.id)}
                              className="flex items-center gap-1 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Heart className={`w-3.5 h-3.5 ${post.likes > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                              <span>{post.likes}</span>
                            </button>
                            
                            <button
                              onClick={() => setOpenReplyPostId(isReplyBoxOpen ? null : post.id)}
                              className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{commentsList.length || post.repliesCount || 0} replies</span>
                            </button>
                          </div>

                          <button 
                            onClick={() => setOpenReplyPostId(isReplyBoxOpen ? null : post.id)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isReplyBoxOpen ? 'Close Replies' : 'Reply / Coordinate'}</span>
                            <span>&rarr;</span>
                          </button>
                        </div>

                        {/* Comments & Reply Thread */}
                        {isReplyBoxOpen && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 bg-slate-50/60 p-3 rounded-xl animate-in fade-in">
                            {commentsList.length > 0 && (
                              <div className="space-y-2">
                                {commentsList.map((c) => (
                                  <div key={c.id} className="flex items-start gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                                    <CornerDownRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                        <span>{c.author}</span>
                                        <span className="text-[10px] text-slate-400 font-normal">({c.authorHostel})</span>
                                      </div>
                                      <p className="text-slate-600 text-[11px] mt-0.5">{c.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply Input Form */}
                            <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={replyInputText}
                                onChange={(e) => setReplyInputText(e.target.value)}
                                placeholder={`Reply to ${post.author}...`}
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                type="submit"
                                className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors shrink-0 cursor-pointer"
                              >
                                Send
                              </button>
                            </form>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal: Create New Community Hub */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>TIET City Network</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Add Hometown Community Hub
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Start an official hub for students traveling between Thapar & your hometown.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
              
              {/* City / Hub Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  City or Region Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lucknow, Shimla, Dehradun, Jammu, Jaipur"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State / Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uttar Pradesh, Himachal Pradesh, Jammu & Kashmir"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                {/* State Quick Picks */}
                <div className="flex flex-wrap gap-1.5">
                  {['Uttar Pradesh', 'Himachal Pradesh', 'Jammu & Kashmir', 'Uttarakhand', 'Punjab', 'Haryana', 'Rajasthan', 'Delhi / NCR'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewState(st)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        newState === st
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon / Emoji Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Community Badge / Emoji
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl shrink-0">
                    {newIcon || '🏙️'}
                  </div>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {['🏙️', '🏔️', '🏰', '🌴', '🚂', '🚗', '✈️', '🌊', '🏛️', '🌄', '🌳', '🕌'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewIcon(emoji)}
                        className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                          newIcon === emoji 
                            ? 'bg-blue-100 ring-2 ring-blue-500 scale-105' 
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Distance from Thapar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Distance from TIET Patiala
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 350"
                      value={newDistance}
                      onChange={(e) => setNewDistance(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      km
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Popular Commute Route
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Trains, Shared Cabs"
                    value={newTransport}
                    onChange={(e) => setNewTransport(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Community Description / Welcome Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Connect with Thapar students from Lucknow for holiday cab sharing, Shatabdi rides, and campus meetups."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Error / Success Feedback */}
              {createCommunityError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{createCommunityError}</span>
                </div>
              )}
              {createCommunitySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{createCommunitySuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCommunity}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center gap-2"
                >
                  {isSubmittingCommunity ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Hub...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Community Hub</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
