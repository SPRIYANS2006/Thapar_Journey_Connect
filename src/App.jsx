import React, { useState, useEffect, useCallback } from 'react';
import { Users, Compass } from 'lucide-react';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import MatchingResultsPage from './pages/MatchingResultsPage';
import GroupDetailsPage from './pages/GroupDetailsPage';
import MyJourneysPage from './pages/MyJourneysPage';
import ProfilePage from './pages/ProfilePage';
import CommunitiesPage from './pages/CommunitiesPage';
import ErrorBoundary from './components/ErrorBoundary';

import JourneyFormModal from './components/JourneyFormModal';
import GroupChatModal from './components/GroupChatModal';
import NotificationToast from './components/NotificationToast';

import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { useGroups } from './hooks/useGroups';
import { useCommunities } from './hooks/useCommunities';
import { useJourneys } from './hooks/useJourneys';
import { getSocket } from './services/api';

function AppContent() {
  const { user, token, logout, updateProfile, refreshUser } = useAuth();
  const {
    groups,
    activeGroup,
    selectedGroup,
    setSelectedGroupId,
    createGroup,
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
    fetchPosts
  } = useCommunities();

  const {
    activeJourney,
    matchedStudents,
    matchingGroups,
    submitJourney
  } = useJourneys();

  const [activePage, setActivePage] = useState('dashboard');

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

  // Journey & Matching Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);

  // Chat Modal State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatGroupId, setChatGroupId] = useState(null);

  // Real-time WebSockets synchronization
  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket();
    if (!socket) return;

    // Chat Message In-App Popup on Screen
    const handleNewChatMessage = (msgData) => {
      if (!msgData) return;
      if (msgData.senderId === user.id) return;

      if (!(isChatOpen && chatGroupId === msgData.groupId)) {
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
      triggerToast({
        id: `found_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'match',
        title: '🎉 Travel Group Found!',
        message: `Group #${data.groupId} for ${data.destinationName} matches your departure.`,
        actionLabel: 'View Group',
        onAction: () => {
          setSelectedGroupId(data.groupId);
          setActivePage('group-details');
        }
      });
    };

    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('group_found', handleGroupFound);

    return () => {
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('group_found', handleGroupFound);
    };
  }, [token, user, isChatOpen, chatGroupId, triggerToast, setSelectedGroupId]);

  // Destination Selection & Journey Creation
  const handleOpenJourneyForm = (destObj) => {
    setSelectedDestination(destObj);
    setIsFormOpen(true);
  };

  const handleSubmitJourney = async (journeyData) => {
    try {
      const res = await submitJourney(journeyData);
      setIsFormOpen(false);

      if (res.matchingGroups && res.matchingGroups.length > 0) {
        const topMatch = res.matchingGroups[0];
        triggerToast({
          id: `match_${Date.now()}`,
          type: 'match',
          title: '🎉 Matching Groups Found!',
          message: `Active Group #${topMatch.group.id} for ${topMatch.group.destinationName} has open seats.`,
          actionLabel: `View Group #${topMatch.group.id}`,
          onAction: () => {
            setSelectedGroupId(topMatch.group.id);
            setActivePage('group-details');
          }
        });
      } else if (res.matchedStudents && res.matchedStudents.length > 0) {
        triggerToast({
          id: `students_${Date.now()}`,
          type: 'success',
          title: 'Matching Co-Riders Found!',
          message: `Found ${res.matchedStudents.length} co-passengers departing around ${journeyData.departureTime}. Form a new group!`,
          actionLabel: 'View Matches',
          onAction: () => {
            setActivePage('matching');
          }
        });
      }

      setActivePage('matching');
    } catch (err) {
      triggerToast({
        id: `err_${Date.now()}`,
        type: 'error',
        title: 'Journey Request Failed',
        message: err.message || 'Could not record journey'
      });
    }
  };

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
      await joinGroup(groupId, { journeyId: activeJourney?.id });
      triggerToast({
        id: `joined_${Date.now()}`,
        type: 'success',
        title: 'Joined Group!',
        message: `You have successfully joined Group #${groupId}.`
      });
      setSelectedGroupId(groupId);
      setActivePage('group-details');
    } catch (err) {
      triggerToast({
        id: `join_err_${Date.now()}`,
        type: 'error',
        title: 'Could Not Join Group',
        message: err.message || 'Unable to join group'
      });
    }
  };

  const handleCreateGroupWithStudent = async (candidateStudent) => {
    // Single-Ride Policy
    if (activeGroup) {
      triggerToast({
        id: `single_ride_create_${Date.now()}`,
        type: 'warning',
        title: 'Single-Ride Policy Active',
        message: `You are already a member of active Group #${activeGroup.id}. Leave that group first before forming a new one.`
      });
      setSelectedGroupId(activeGroup.id);
      setActivePage('group-details');
      return;
    }

    try {
      const journeyIdToUse = candidateStudent.journeyId || activeJourney?.id;
      const res = await createGroup({
        journeyId: journeyIdToUse,
        pickupPoint: 'Main Gate (Near Executive Mess)'
      });

      triggerToast({
        id: `created_${Date.now()}`,
        type: 'success',
        title: 'New Ride Group Created!',
        message: `Group #${res.group.id} formed for ${res.group.destinationName}.`
      });

      setSelectedGroupId(res.group.id);
      setActivePage('group-details');
    } catch (err) {
      triggerToast({
        id: `create_err_${Date.now()}`,
        type: 'error',
        title: 'Group Creation Failed',
        message: err.message || 'Could not form group'
      });
    }
  };

  const handleCreateGroupForJourney = async () => {
    if (activeGroup) {
      triggerToast({
        id: `single_ride_open_${Date.now()}`,
        type: 'warning',
        title: 'Single-Ride Policy Active',
        message: `You already have active Group #${activeGroup.id}. Leave that group before forming another.`
      });
      setSelectedGroupId(activeGroup.id);
      setActivePage('group-details');
      return;
    }

    try {
      const res = await createGroup({
        journeyId: activeJourney?.id,
        pickupPoint: 'Main Gate (Near Executive Mess)'
      });

      triggerToast({
        id: `created_${Date.now()}`,
        type: 'success',
        title: 'Open Group Formed!',
        message: `Group #${res.group.id} is now open for students to join.`
      });

      setSelectedGroupId(res.group.id);
      setActivePage('group-details');
    } catch (err) {
      triggerToast({
        id: `create_err_${Date.now()}`,
        type: 'error',
        title: 'Could Not Create Group',
        message: err.message || 'Error creating group'
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

  const handleSelectCommunityTravel = (community) => {
    const syntheticDest = {
      id: `comm_${community.id}`,
      name: `${community.name} (Hometown Trip)`,
      icon: community.icon,
      description: `Travel with fellow Thapar students to ${community.name}, ${community.state}.`,
      popularTime: 'Peak: Friday evening & Weekends',
      distance: community.distanceFromThapar,
      avgCabFare: `Carpool / ${community.popularTransport}`
    };
    handleOpenJourneyForm(syntheticDest);
  };

  const activeChatGroupObj =
    groups.find((g) => g.id === chatGroupId) ||
    (selectedGroup && selectedGroup.id === chatGroupId ? selectedGroup : null);

  // If not logged in, render AuthPage
  if (!token || !user) {
    return <AuthPage onLoginSuccess={() => setActivePage('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navbar Header */}
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          if (page === 'my-groups') {
            if (activeGroup) {
              setSelectedGroupId(activeGroup.id);
              setActivePage('group-details');
              return;
            }
          }
          setActivePage(page);
        }}
        user={user}
        onLogout={logout}
        myGroupsCount={groups.length}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        <ErrorBoundary onReset={() => setActivePage('dashboard')}>
          {activePage === 'dashboard' && (
            <DashboardPage
              user={user}
              communities={communities}
              onNavigateToCommunities={() => setActivePage('communities')}
              onSelectDestination={handleOpenJourneyForm}
              activeGroups={groups}
              onJoinGroup={handleJoinGroup}
              onViewGroupDetails={(gId) => {
                setSelectedGroupId(gId);
                setActivePage('group-details');
              }}
            />
          )}

          {activePage === 'matching' && (
            <MatchingResultsPage
              journeyReq={activeJourney}
              matchedStudents={matchedStudents}
              matchingGroups={matchingGroups}
              currentUser={user}
              onBack={() => setActivePage('dashboard')}
              onJoinGroup={handleJoinGroup}
              onViewGroupDetails={(gId) => {
                setSelectedGroupId(gId);
                setActivePage('group-details');
              }}
              onCreateGroupWithStudent={handleCreateGroupWithStudent}
              onCreateGroupForJourney={handleCreateGroupForJourney}
            />
          )}

          {activePage === 'group-details' && (
            <GroupDetailsPage
              group={selectedGroup}
              currentUser={user}
              onBack={() => setActivePage('dashboard')}
              onOpenChat={handleOpenChatModal}
              onConfirmJourney={handleConfirmJourney}
              onLeaveGroup={handleLeaveGroup}
              onJoinGroup={handleJoinGroup}
              onChangePickupPoint={handleChangePickupPoint}
            />
          )}

          {activePage === 'my-groups' && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center border border-blue-200/60 shadow-sm">
                <Users className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">
                  No Active Travel Groups
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  You are not currently enrolled in any open ride groups. Pick your transit destination on the dashboard to match with fellow Thapar students!
                </p>
              </div>
              <button
                onClick={() => setActivePage('dashboard')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Destinations</span>
              </button>
            </div>
          )}

          {activePage === 'my-journeys' && (
            <MyJourneysPage
              activeGroups={groups}
              currentUser={user}
              onViewGroupDetails={(gId) => {
                setSelectedGroupId(gId);
                setActivePage('group-details');
              }}
              onOpenChat={handleOpenChatModal}
            />
          )}

          {activePage === 'communities' && (
            <CommunitiesPage
              communities={communities}
              posts={communityPosts}
              user={user}
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
              onCreateCommunity={async (data) => {
                try {
                  const res = await createCommunity(data);
                  triggerToast({
                    id: `comm_created_${Date.now()}`,
                    type: 'success',
                    title: 'Community Created!',
                    message: `${data.name} hub is now active on campus.`
                  });
                  return res;
                } catch (err) {
                  triggerToast({
                    id: `comm_create_err_${Date.now()}`,
                    type: 'error',
                    title: 'Creation Failed',
                    message: err.message
                  });
                  throw err;
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
                }
              }}
              onSelectCommunityTravel={handleSelectCommunityTravel}
              onLikePost={handleLikePost}
              onAddComment={handleAddComment}
              onSelectCommunity={(commId) => {
                fetchPosts(commId);
              }}
            />
          )}

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
                    title: 'Profile Updated',
                    message: 'Preferences saved.'
                  });
                } catch (err) {
                  triggerToast({
                    id: `prof_err_${Date.now()}`,
                    type: 'error',
                    title: 'Update Failed',
                    message: err.message
                  });
                }
              }}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Modals */}
      {isFormOpen && (
        <JourneyFormModal
          destination={selectedDestination}
          user={user}
          onClose={() => setIsFormOpen(false)}
          onSubmitJourney={handleSubmitJourney}
        />
      )}

      {isChatOpen && activeChatGroupObj && (
        <GroupChatModal
          group={activeChatGroupObj}
          currentUser={user}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Toast Notifications Overlay */}
      <NotificationToast notifications={notifications} onDismiss={dismissToast} />

      {/* Persistent Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Thapar Journey Connect</span>
            <span>•</span>
            <span className="text-blue-600 font-semibold">MongoDB Atlas Cloud Edition</span>
            <span>•</span>
            <span>Node 22 + Express 5</span>
          </div>
          <p className="text-slate-400">
            Designed exclusively for Thapar Institute of Engineering & Technology (TIET) students.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
