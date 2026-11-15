import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import GroupDetailsPage from './pages/GroupDetailsPage';
import MyJourneysPage from './pages/MyJourneysPage';
import ProfilePage from './pages/ProfilePage';
import SafetyPage from './pages/SafetyPage';
import CommunitiesPage from './pages/CommunitiesPage';
import CityCommunityHubPage from './pages/CityCommunityHubPage';
import ErrorBoundary from './components/ErrorBoundary';

import GroupChatModal from './components/GroupChatModal';
import NotificationToast from './components/NotificationToast';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/useAuth';
import { useGroups } from './hooks/useGroups';
import { useCommunities } from './hooks/useCommunities';
import { getSocket } from './services/api';

function AppContent() {
  const { user, token, logout, updateProfile, refreshUser } = useAuth();
  const {
    groups,
    activeGroup,
    selectedGroup,
    setSelectedGroupId,
    fetchGroups,
    fetchGroupById,
    joinGroup,
    leaveGroup,
    confirmGroup,
    changePickupPoint
  } = useGroups();

  const {
    communities,
    posts: communityPosts,
    createCommunity,
    joinCommunity,
    leaveCommunity,
    createPost: handleAddCommunityPost,
    toggleLike: handleLikePost,
    addComment: handleAddComment,
    openBoard
  } = useCommunities();

  const [activePage, setActivePage] = useState('dashboard');
  const [selectedCityHub, setSelectedCityHub] = useState(null);

  const userCommunity = useMemo(() => {
    const commId = user?.joinedCommunity;
    if (!commId || !communities || communities.length === 0) return null;
    return communities.find((c) => c.id === commId) || null;
  }, [user?.joinedCommunity, communities]);

  const activeCommunityHub = selectedCityHub || userCommunity;

  // Notifications State for Real-Time Toast Popups
  const [notifications, setNotifications] = useState([]);
  const triggerToast = useCallback((toastObj) => {
    setNotifications((prev) => [
      toastObj,
      ...prev.filter((n) => n.id !== toastObj.id).slice(0, 4)
    ]);
  }, []);

  const dismissToast = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Chat Modal State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatGroupId, setChatGroupId] = useState(null);
  const boardId = activePage === 'city-hub' && activeCommunityHub?.id === user?.joinedCommunity
    ? activeCommunityHub?.id : null;
  useEffect(() => { openBoard(boardId); }, [boardId, openBoard]);

  // Real-time WebSockets synchronization
  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket();
    if (!socket) return;

    // Chat Message In-App Popup on Screen
    const handleNewChatMessage = (msgData) => {
      if (!msgData) return;
      if (msgData.senderId === user.id) return;
      if ((user.mutedUsers || []).includes(msgData.senderId)) return;

      if (!(isChatOpen && String(chatGroupId) === String(msgData.groupId))) {
        triggerToast({
          id: `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          type: 'chat',
          title: `Group #${msgData.groupId} (${msgData.destinationName || 'Ride Chat'})`,
          sender: msgData.senderName,
          avatar: msgData.avatar,
          text: msgData.text,
          time: msgData.time || 'Just now',
          actionLabel: 'Reply',
          onAction: () => {
            setChatGroupId(msgData.groupId);
            setIsChatOpen(true);
          }
        });
      }
    };

    const handleGroupFound = (data) => {
      if (user.rideNotifications === false) return;
      triggerToast({
        id: `found_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'match',
        title: 'Group found',
        message: `Group #${data.groupId} for ${data.destinationName} matches your departure.`,
        actionLabel: 'View group',
        onAction: () => {
          setSelectedGroupId(data.groupId);
          setActivePage('group-details');
        }
      });
    };

    const handleMemberJoined = (data) => {
      if (user.rideNotifications === false) { fetchGroups(); return; }
      if (!data) return;
      if (data.joinerId === user.id) return;

      triggerToast({
        id: `join_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'success',
        title: 'New rider joined',
        message: `${data.joinerName} (${data.joinerHostel}) joined your ride to ${data.destinationName}. (${data.membersCount}/${data.maxMembers} seats filled)`,
        actionLabel: 'Open chat',
        onAction: () => {
          setChatGroupId(data.groupId);
          setIsChatOpen(true);
        }
      });
      fetchGroups();
    };

    const handleMemberLeft = (data) => {
      if (user.rideNotifications === false) { fetchGroups(); return; }
      if (!data) return;
      if (data.leaverId === user.id) return;

      triggerToast({
        id: `leave_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'warning',
        title: 'Rider left',
        message: `${data.leaverName} left your ride to ${data.destinationName}. (${data.remainingMembersCount}/${data.maxMembers} seats filled)`,
        actionLabel: 'Open chat',
        onAction: () => {
          setChatGroupId(data.groupId);
          setIsChatOpen(true);
        }
      });
      fetchGroups();
    };

    const handleGroupConfirmed = (data) => {
      if (!data) return;
      triggerToast({
        id: `confirmed_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'success',
        title: 'Group confirmed',
        message: `Your journey to ${data.destinationName} was confirmed. Contact numbers are now visible.`,
        actionLabel: 'View details',
        onAction: () => {
          setSelectedGroupId(data.groupId);
          setActivePage('group-details');
        }
      });
      fetchGroups();
    };

    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('group_found', handleGroupFound);
    socket.on('member_joined', handleMemberJoined);
    socket.on('member_left', handleMemberLeft);
    socket.on('group_confirmed', handleGroupConfirmed);

    return () => {
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('group_found', handleGroupFound);
      socket.off('member_joined', handleMemberJoined);
      socket.off('member_left', handleMemberLeft);
      socket.off('group_confirmed', handleGroupConfirmed);
    };
  }, [token, user, isChatOpen, chatGroupId, triggerToast, setSelectedGroupId, fetchGroups]);

  useEffect(() => {
    if (activePage === 'my-journeys') {
      fetchGroups().catch(() => {});
    }
  }, [activePage, fetchGroups]);

  useEffect(() => {
    if (activePage === 'profile') refreshUser();
  }, [activePage, refreshUser]);

  // Group Handlers
  const handleJoinGroup = async (groupId) => {
    // 1. If already a member of this group, navigate directly
    const targetGroup = (groups || []).find((g) => g.id === groupId);
    const isAlreadyMember = (targetGroup?.members || []).some(
      (m) => (m.userId && m.userId === user?.id) || (m.id && m.id === user?.id)
    );
    if (isAlreadyMember) {
      triggerToast({
        id: `already_${Date.now()}`,
        type: 'info',
        title: 'Already a Member',
        message: `You are already part of Group #${groupId}. Opening ride details.`
      });
      setSelectedGroupId(groupId);
      setActivePage('group-details');
      return;
    }

    // 2. Single-Ride Policy check
    if (activeGroup && activeGroup.id !== groupId) {
      triggerToast({
        id: `single_ride_${Date.now()}`,
        type: 'warning',
        title: 'Single-Ride Policy Active',
        message: `You are already enrolled in Group #${activeGroup.id} for ${activeGroup.destinationName}. Leave that ride before joining another.`
      });
      setSelectedGroupId(activeGroup.id);
      setActivePage('group-details');
      return;
    }

    try {
      await joinGroup(groupId);
      triggerToast({
        id: `joined_${Date.now()}`,
        type: 'success',
        title: 'Joined group',
        message: `You joined Group #${groupId}.`
      });
      setSelectedGroupId(groupId);
      setActivePage('group-details');
    } catch (err) {
      triggerToast({
        id: `join_err_${Date.now()}`,
        type: 'error',
        title: 'Could not join group',
        message: err.message || 'Unable to join group'
      });
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      const res = await leaveGroup(groupId);
      if (res && res.penaltyApplied) {
        await refreshUser();
        triggerToast({
          id: `penalty_${Date.now()}`,
          type: 'warning',
          title: 'Reliability Rating Decreased',
          message: `Late cancellation penalty: -${res.penaltyAmount}⭐. New Rating: ${res.newReliability}⭐.`
        });
      } else {
        triggerToast({
          id: `leave_${Date.now()}`,
          type: 'info',
          title: 'Left Group',
          message: `You left Group #${groupId}.`
        });
      }
      setActivePage('dashboard');
    } catch (err) {
      triggerToast({
        id: `leave_err_${Date.now()}`,
        type: 'error',
        title: 'Could Not Leave Group',
        message: err.message || 'Error leaving group'
      });
    }
  };

  const handleConfirmJourney = async (groupId) => {
    try {
      await confirmGroup(groupId);
      triggerToast({
        id: `confirm_${Date.now()}`,
        type: 'success',
        title: 'Journey Confirmed! 🎉',
        message: `Group #${groupId} is confirmed. Member phone numbers are now visible.`
      });
    } catch (err) {
      triggerToast({
        id: `confirm_err_${Date.now()}`,
        type: 'error',
        title: 'Confirmation Failed',
        message: err.message || 'Only group admin can confirm'
      });
    }
  };

  const handleChangePickupPoint = async (groupId, newPoint) => {
    try {
      await changePickupPoint(groupId, newPoint);
      triggerToast({
        id: `pickup_${Date.now()}`,
        type: 'success',
        title: 'Pickup Point Updated',
        message: `Meeting location set to ${newPoint}.`
      });
    } catch (err) {
      triggerToast({
        id: `pickup_err_${Date.now()}`,
        type: 'error',
        title: 'Could Not Update Pickup Point',
        message: err.message || 'Only admin can change pickup point'
      });
    }
  };

  const handleOpenChatModal = (groupId) => {
    setChatGroupId(groupId);
    setIsChatOpen(true);
  };

  const activeChatGroupObj =
    groups.find((g) => String(g.id) === String(chatGroupId)) ||
    (selectedGroup && String(selectedGroup.id) === String(chatGroupId) ? selectedGroup : null) ||
    (chatGroupId ? { id: chatGroupId, destinationName: 'Ride Group', members: [] } : null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar Header */}
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          if (page !== 'communities') {
            setSelectedCityHub(null);
          }
          setActivePage(page);
        }}
        user={user}
        onLogout={async () => {
          try {
            await logout();
          } catch (error) {
            triggerToast({ id: 'logout-error', type: 'error', title: 'Could not sign out', message: error.message });
          }
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        <ErrorBoundary onReset={() => setActivePage('dashboard')}>
          {activePage === 'safety' && <SafetyPage user={user} />}
          {activePage === 'dashboard' && (
            <DashboardPage
              user={user}
              communities={communities}
              onNavigateToCommunities={() => setActivePage('communities')}
              triggerToast={triggerToast}
              onRefreshGroups={fetchGroups}
              onNavigateMyJourneys={() => setActivePage('my-journeys')}
            />
          )}

          {activePage === 'group-details' && (
            <GroupDetailsPage
              group={selectedGroup}
              currentUser={user}
              onBack={() => setActivePage('my-journeys')}
              onOpenChat={handleOpenChatModal}
              onConfirmJourney={handleConfirmJourney}
              onLeaveGroup={handleLeaveGroup}
              onJoinGroup={handleJoinGroup}
              onChangePickupPoint={handleChangePickupPoint}
              onRescheduleSuccess={async (updatedGroup) => {
                await fetchGroups();
                if (updatedGroup?.id) {
                  setSelectedGroupId(updatedGroup.id);
                  await fetchGroupById(updatedGroup.id);
                }
              }}
              triggerToast={(msg, type) =>
                triggerToast({
                  id: `resched_${Date.now()}`,
                  type: type || 'info',
                  title: 'Travel Reschedule',
                  message: msg
                })
              }
            />
          )}

          {activePage === 'my-journeys' && (
            <MyJourneysPage
              currentUser={user}
              onRefresh={fetchGroups}
              onFindRide={() => setActivePage('dashboard')}
              onViewGroupDetails={(gId) => {
                setSelectedGroupId(gId);
                setActivePage('group-details');
              }}
              onOpenChat={handleOpenChatModal}
              triggerToast={(msg, type) =>
                triggerToast({
                  id: `resched_${Date.now()}`,
                  type: type || 'info',
                  title: 'Travel Reschedule',
                  message: msg
                })
              }
            />
          )}

          {activePage === 'city-hub' && activeCommunityHub ? (
            <CityCommunityHubPage
              key={activeCommunityHub.id}
              onNavigateMyJourneys={() => setActivePage('my-journeys')}
              community={activeCommunityHub}
              user={user}
              posts={communityPosts}
              onBack={() => setActivePage('communities')}
              onRefreshGroups={fetchGroups}
              onJoinCommunity={async (commId) => {
                try {
                  await joinCommunity(commId);
                  triggerToast({
                    id: `comm_join_${Date.now()}`,
                    type: 'success',
                    title: 'Joined Community!',
                    message: 'You are now an enrolled member of this hometown hub.'
                  });
                } catch (err) {
                  triggerToast({
                    id: `comm_err_${Date.now()}`,
                    type: 'error',
                    title: 'Could Not Join',
                    message: err.message
                  });
                }
              }}
              onLeaveCommunity={async (commId) => {
                try {
                  await leaveCommunity(commId);
                  setSelectedCityHub(null);
                  setActivePage('communities');
                  triggerToast({
                    id: `comm_leave_${Date.now()}`,
                    type: 'info',
                    title: 'Left Community',
                    message: 'You left this hometown hub.'
                  });
                } catch (err) {
                  triggerToast({
                    id: `comm_err_${Date.now()}`,
                    type: 'error',
                    title: 'Error Leaving Community',
                    message: err.message
                  });
                }
              }}
              onAddPost={async (newPost) => {
                try {
                  await handleAddCommunityPost(newPost.communityId, newPost);
                  triggerToast({
                    id: `post_add_${Date.now()}`,
                    type: 'success',
                    title: 'Post Published',
                    message: 'Your notice has been posted to the community board.'
                  });
                } catch (err) {
                  triggerToast({
                    id: `post_err_${Date.now()}`,
                    type: 'error',
                    title: 'Could Not Post',
                    message: err.message
                  });
                  throw err;
                }
              }}
              onLikePost={handleLikePost}
              onAddComment={(postId, text) => handleAddComment(postId, text, activeCommunityHub?.id)}
              triggerToast={triggerToast}
            />
          ) : activePage === 'communities' ? (
            <CommunitiesPage
              communities={communities}
              user={user}
              onOpenCityHub={(community) => {
                setSelectedCityHub(community);
                setActivePage('city-hub');
              }}
              onCreateCommunity={createCommunity}
            />
          ) : null}

          {activePage === 'profile' && (
            <ProfilePage
              user={user}
              communities={communities}
              onUpdateProfile={async (updated) => {
                try {
                  await updateProfile(updated);
                  triggerToast({
                    id: `prof_${Date.now()}`,
                    type: 'success',
                    title: 'Profile updated',
                    message: 'Preferences saved.'
                  });
                } catch (err) {
                  triggerToast({
                    id: `prof_err_${Date.now()}`,
                    type: 'error',
                    title: 'Update failed',
                    message: err.message
                  });
                  throw err;
                }
              }}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Modals */}
      {isChatOpen && activeChatGroupObj && (
        <GroupChatModal
          key={chatGroupId}
          group={activeChatGroupObj}
          currentUser={user}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Toast Notifications Overlay */}
      <NotificationToast notifications={notifications} onDismiss={dismissToast} />

      {/* Persistent Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Thapar Journey Connect</span>
            <span>•</span>
            <span>Made for TIET students</span>
          </div>
          <p className="text-slate-400 dark:text-slate-500">
            Shared rides for TIET students.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SessionView() {
  const { user, token, loading } = useAuth();
  if (loading) return <div role="status" className="min-h-screen grid place-items-center">Loading your session…</div>;
  if (!token || !user) return <AuthPage />;
  return <AppContent key={user.id} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SessionView />
      </AuthProvider>
    </ThemeProvider>
  );
}
