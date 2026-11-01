import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  MapPin,
  Search,
  Plus,
  ArrowLeft,
  Send,
  Lock,
  CheckCircle2,
  Sparkles,
  X,
  Clock,
  ShieldCheck,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';

const CATEGORIES = [
  'Commute Cohort',
  'Weekend Trips',
  'Festivals & Events',
  'General Meetups',
  'Study & Projects',
  'Hostel Connect'
];

const CATEGORY_STYLES = {
  'Commute Cohort': {
    badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dot: 'bg-blue-600',
    pill: 'hover:border-blue-300'
  },
  'Weekend Trips': {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-600',
    pill: 'hover:border-emerald-300'
  },
  'Festivals & Events': {
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-600',
    pill: 'hover:border-amber-300'
  },
  'General Meetups': {
    badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
    dot: 'bg-purple-600',
    pill: 'hover:border-purple-300'
  },
  'Study & Projects': {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    dot: 'bg-indigo-600',
    pill: 'hover:border-indigo-300'
  },
  'Hostel Connect': {
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-600',
    pill: 'hover:border-rose-300'
  }
};

export default function CommunityGroupsPage({
  communities = [],
  groups = [],
  selectedGroup,
  messages = [],
  loading = false,
  messagesLoading = false,
  filterCommunity = 'All',
  filterCategory = 'All',
  searchQuery = '',
  currentUser,
  onSelectGroup,
  onBackToList,
  onFilterCommunityChange,
  onFilterCategoryChange,
  onSearchChange,
  onCreateGroup,
  onJoinGroup,
  onLeaveGroup,
  onSendMessage
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('discussion'); // 'discussion' | 'members'
  const [messageText, setMessageText] = useState('');
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // New Group Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    communityId: '',
    category: 'Commute Cohort'
  });
  const [formError, setFormError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (activeTab === 'discussion') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleOpenCreateModal = () => {
    const defaultCommId =
      currentUser?.joinedCommunity || (communities.length > 0 ? communities[0].id : '');
    setFormData({
      name: '',
      description: '',
      communityId: defaultCommId,
      category: 'Commute Cohort'
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setFormError('Please enter a group name of at least 3 characters.');
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      setFormError('Please enter a description of at least 5 characters.');
      return;
    }
    if (!formData.communityId) {
      setFormError('Please select a hometown community.');
      return;
    }

    try {
      setIsCreating(true);
      setFormError('');
      await onCreateGroup(formData);
      setIsCreateModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinClick = async (groupId, e) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(groupId);
      await onJoinGroup(groupId);
    } catch (err) {
      console.error('Error joining group:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLeaveConfirm = async () => {
    if (!selectedGroup) return;
    try {
      setActionLoadingId(selectedGroup.id);
      await onLeaveGroup(selectedGroup.id);
      setIsLeaveDialogOpen(false);
    } catch (err) {
      console.error('Error leaving group:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedGroup?.id || isSubmittingMessage) return;

    try {
      setIsSubmittingMessage(true);
      const textToSend = messageText.trim();
      setMessageText('');
      await onSendMessage(selectedGroup.id, textToSend);
    } catch (err) {
      console.error('Error sending message:', err);
      // Restore message text on error
      setMessageText(messageText);
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  // ==========================================
  // RENDER: Group Details & Discussion View
  // ==========================================
  if (selectedGroup) {
    const isMember = selectedGroup.isMember;
    const catStyle = CATEGORY_STYLES[selectedGroup.category] || CATEGORY_STYLES['Commute Cohort'];
    const myRole = selectedGroup.members?.find((m) => m.userId === currentUser?.id)?.role;

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
        {/* Navigation & Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToList}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Groups</span>
          </button>

          <div className="flex items-center gap-2">
            {isMember ? (
              <button
                onClick={() => setIsLeaveDialogOpen(true)}
                disabled={actionLoadingId === selectedGroup.id}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-colors cursor-pointer disabled:opacity-50"
              >
                Leave Group
              </button>
            ) : (
              <button
                onClick={(e) => handleJoinClick(selectedGroup.id, e)}
                disabled={actionLoadingId === selectedGroup.id}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Join Group</span>
              </button>
            )}
          </div>
        </div>

        {/* Group Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${catStyle.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${catStyle.dot}`} />
              {selectedGroup.category}
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              {selectedGroup.communityName}
            </span>

            {isMember && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {myRole === 'Admin' ? 'Admin & Member' : 'Enrolled Member'}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {selectedGroup.name}
            </h1>
            <p className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed max-w-4xl">
              {selectedGroup.description}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Created by <strong className="text-slate-700">{selectedGroup.creatorName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {selectedGroup.createdAt
                    ? new Date(selectedGroup.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Recently'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{selectedGroup.membersCount} active student {selectedGroup.membersCount === 1 ? 'member' : 'members'}</span>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl px-3 pt-2 shadow-2xs">
          <button
            onClick={() => setActiveTab('discussion')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'discussion'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Group Discussion</span>
            {isMember && messages.length > 0 && (
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                {messages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members Roster</span>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {selectedGroup.members?.length || selectedGroup.membersCount}
            </span>
          </button>
        </div>

        {/* Tab 1: Discussion / Chat */}
        {activeTab === 'discussion' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[560px]">
            {isMember ? (
              <>
                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium">Loading discussion history...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-base">No messages yet</h4>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                        Start the conversation! Coordinate pickup spots, compare train/bus timings, or plan weekend meetups.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 max-w-xl ${
                            isOwn ? 'ml-auto flex-row-reverse text-right' : ''
                          }`}
                        >
                          <Avatar
                            src={msg.senderAvatar}
                            name={msg.senderName}
                            size="w-8 h-8"
                            textSize="text-xs"
                            rounded="rounded-full"
                          />
                          <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-slate-800">
                                {isOwn ? 'You' : msg.senderName}
                              </span>
                              {msg.senderHostel && (
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  {msg.senderHostel}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">{msg.time}</span>
                            </div>
                            <div
                              className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isOwn
                                  ? 'bg-blue-600 text-white rounded-tr-xs shadow-2xs'
                                  : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-2xs'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={handleSendMessageSubmit}
                  className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message ${selectedGroup.name}...`}
                    maxLength={1000}
                    className="flex-1 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-2xl px-4 py-3 border border-transparent focus:border-blue-500 focus:outline-hidden transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || isSubmittingMessage}
                    className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-xs cursor-pointer"
                    title="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              /* Members-Only Lock Screen */
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 bg-slate-50/50">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-xl font-bold text-slate-900">Members-Only Group Discussion</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Join <strong className="text-slate-800">{selectedGroup.name}</strong> to view discussion history, ask questions, and coordinate travel details with student members.
                  </p>
                </div>
                <button
                  onClick={(e) => handleJoinClick(selectedGroup.id, e)}
                  disabled={actionLoadingId === selectedGroup.id}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Join Group to Enter Discussion</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Members Roster */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Enrolled Members</h3>
                <p className="text-xs text-slate-500">Verified TIET students currently in this cohort</p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                {selectedGroup.members?.length || 0} Members
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(selectedGroup.members || []).map((m) => {
                const isSelf = m.userId === currentUser?.id;
                return (
                  <div
                    key={m.userId}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-all"
                  >
                    <Avatar
                      src={m.avatar}
                      name={m.name}
                      size="w-10 h-10"
                      textSize="text-sm"
                      rounded="rounded-2xl"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-sm truncate">
                          {m.name} {isSelf && '(You)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{m.hostel || 'Hostel Campus'}</span>
                      </div>
                    </div>
                    <div>
                      {m.role === 'Admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <ShieldCheck className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                          Member
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leave Dialog */}
        <ConfirmDialog
          isOpen={isLeaveDialogOpen}
          title={`Leave ${selectedGroup.name}?`}
          message="Are you sure you want to leave this community group? You will lose access to its members-only discussion board until you rejoin."
          confirmLabel="Leave Group"
          cancelLabel="Stay in Group"
          isDestructive={true}
          onConfirm={handleLeaveConfirm}
          onCancel={() => setIsLeaveDialogOpen(false)}
        />
      </div>
    );
  }

  // ==========================================
  // RENDER: Groups List & Directory View
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-200 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>TIET Hometown & Travel Networks</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Community Groups
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Join student-run cohorts from your hometown for daily commutes, weekend transit, festival getaways, and campus meetups.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-blue-950 font-bold px-5 py-3.5 rounded-2xl shadow-lg hover:bg-blue-50 transition-all cursor-pointer group"
          >
            <Plus className="w-5 h-5 text-blue-600 group-hover:rotate-90 transition-transform" />
            <span>Create Community Group</span>
          </button>
        </div>

        {/* Decorative corner circles */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-2xl" />
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search groups by keyword, hometown, or category (e.g. Delhi Volvo, Weekend, GT Road)..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 text-sm rounded-2xl border border-slate-200 focus:border-blue-500 focus:outline-hidden transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Rows */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
          {/* Hometown Community Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="font-bold text-slate-600 shrink-0">Hometown:</span>
            <button
              onClick={() => onFilterCommunityChange('All')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all cursor-pointer ${
                filterCommunity === 'All'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Hometowns
            </button>
            {communities.map((c) => (
              <button
                key={c.id}
                onClick={() => onFilterCommunityChange(c.id)}
                className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all cursor-pointer ${
                  filterCommunity === c.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Category Dropdown/Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="font-bold text-slate-600 shrink-0">Category:</span>
            <button
              onClick={() => onFilterCategoryChange('All')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all cursor-pointer ${
                filterCategory === 'All'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onFilterCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Group Directory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 animate-pulse"
            >
              <div className="flex gap-2">
                <div className="h-5 w-24 bg-slate-200 rounded-full" />
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
              <div className="h-12 w-full bg-slate-100 rounded-lg" />
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <div className="h-8 w-20 bg-slate-200 rounded-xl" />
                <div className="h-8 w-24 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200/80 mx-auto flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-slate-900">No Community Groups Found</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              No active student groups match your current filters. Try resetting the search or be the first to create one!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {(filterCommunity !== 'All' || filterCategory !== 'All' || searchQuery) && (
              <button
                onClick={() => {
                  onFilterCommunityChange('All');
                  onFilterCategoryChange('All');
                  onSearchChange('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Group</span>
            </button>
          </div>
        </div>
      ) : (
        /* Groups Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => {
            const isMember = group.isMember;
            const catStyle = CATEGORY_STYLES[group.category] || CATEGORY_STYLES['Commute Cohort'];

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between cursor-pointer group"
              >
                <div className="space-y-3.5">
                  {/* Category & Hometown Tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catStyle.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                      {group.category}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      {group.communityName}
                    </span>
                    {isMember && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-auto">
                        <UserCheck className="w-3 h-3" />
                        Joined
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
                      {group.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {group.description}
                    </p>
                  </div>

                  {/* Members count & avatars pile */}
                  <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                    <div className="flex items-center -space-x-1.5">
                      {(group.members || []).slice(0, 4).map((m, idx) => (
                        <div key={idx} className="ring-2 ring-white rounded-full">
                          <Avatar
                            src={m.avatar}
                            name={m.name}
                            size="w-6 h-6"
                            textSize="text-[10px]"
                            rounded="rounded-full"
                          />
                        </div>
                      ))}
                      {group.membersCount > 4 && (
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                          +{group.membersCount - 4}
                        </div>
                      )}
                    </div>
                    <span className="font-semibold text-slate-600">
                      {group.membersCount} {group.membersCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate">
                    by {group.creatorName}
                  </span>

                  <div className="flex items-center gap-2">
                    {isMember ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectGroup(group);
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat & View</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGroup(group);
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={(e) => handleJoinClick(group.id, e)}
                          disabled={actionLoadingId === group.id}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Join</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  <Sparkles className="w-3 h-3" />
                  New Student Cohort
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Create Community Group
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Start a group for your hometown to coordinate travel, rides, or meetups.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs sm:text-sm">
              {/* Hometown Selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">
                  Hometown Community Hub *
                </label>
                <select
                  value={formData.communityId}
                  onChange={(e) => setFormData({ ...formData, communityId: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-3.5 py-2.5 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  required
                >
                  <option value="" disabled>
                    Select hometown community...
                  </option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Name */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Group Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Delhi Friday Volvo Cohort, GT Road Travellers"
                  maxLength={100}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-3.5 py-2.5 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-3.5 py-2.5 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain what this cohort is for (e.g., preferred travel timings, pickup spots, weekly trips)..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-3.5 py-2.5 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  required
                />
                <div className="text-right text-[10px] text-slate-400">
                  {formData.description.length}/500 characters
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Creating Group...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
