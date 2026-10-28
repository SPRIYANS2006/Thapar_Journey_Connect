import React, { useState, useEffect } from 'react';
import { Users, Compass } from 'lucide-react';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import MatchingResultsPage from './pages/MatchingResultsPage';
import GroupDetailsPage from './pages/GroupDetailsPage';
import MyJourneysPage from './pages/MyJourneysPage';
import ProfilePage from './pages/ProfilePage';
import CommunitiesPage from './pages/CommunitiesPage';

import JourneyFormModal from './components/JourneyFormModal';
import GroupChatModal from './components/GroupChatModal';

import { 
  INITIAL_USER_PROFILE, 
  INITIAL_GROUPS, 
  MOCK_STUDENTS,
  INITIAL_COMMUNITIES,
  INITIAL_COMMUNITY_POSTS 
} from './data/mockData';
import { calculateMatchScore } from './utils/matchingEngine';
import { api, getSocket } from './services/api';

export default function App() {
  // Check local storage for persistent session
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('tiet_logged_in') === 'true';
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tiet_user');
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
  });

  const [activePage, setActivePage] = useState('dashboard');

  // Journey & Matching State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [currentJourneyReq, setCurrentJourneyReq] = useState(null);
  const [matchedStudents, setMatchedStudents] = useState([]);

  // Groups & Chat State
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatGroupId, setChatGroupId] = useState(null);

  // Communities State
  const [communities, setCommunities] = useState(INITIAL_COMMUNITIES);
  const [communityPosts, setCommunityPosts] = useState(INITIAL_COMMUNITY_POSTS);

  // Initial Data Fetching from Backend API
  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedGroups, fetchedCommunities, fetchedPosts] = await Promise.all([
          api.getGroups().catch(() => INITIAL_GROUPS),
          api.getCommunities().catch(() => INITIAL_COMMUNITIES),
          api.getCommunityPosts('jal').catch(() => INITIAL_COMMUNITY_POSTS)
        ]);

        if (fetchedGroups && fetchedGroups.length > 0) setGroups(fetchedGroups);
        if (fetchedCommunities && fetchedCommunities.length > 0) setCommunities(fetchedCommunities);
        if (fetchedPosts && fetchedPosts.length > 0) setCommunityPosts(fetchedPosts);
      } catch (err) {
        console.warn('Initial data load warning:', err.message);
      }
    }
    loadData();
  }, []);

  // Real-time WebSockets synchronization for groups & members
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleGroupsUpdated = async () => {
      try {
        const latestGroups = await api.getGroups();
        if (latestGroups) setGroups(latestGroups);
      } catch (e) {}
    };

    const handleMemberUpdate = (updatedGroup) => {
      if (updatedGroup) {
        setGroups((prev) =>
          prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
        );
      }
    };

    socket.on('groups_updated', handleGroupsUpdated);
    socket.on('member_joined', handleMemberUpdate);
    socket.on('member_left', handleMemberUpdate);
    socket.on('group_confirmed', handleMemberUpdate);

    return () => {
      socket.off('groups_updated', handleGroupsUpdated);
      socket.off('member_joined', handleMemberUpdate);
      socket.off('member_left', handleMemberUpdate);
      socket.off('group_confirmed', handleMemberUpdate);
    };
  }, []);

  // Real-time Chat via WebSockets when chat modal is open
  useEffect(() => {
    if (!isChatOpen || !chatGroupId) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('join_group', chatGroupId);

      const handleNewMessage = (data) => {
        if (data.groupId === chatGroupId && data.messages) {
          setGroups((prevGroups) =>
            prevGroups.map((g) =>
              g.id === chatGroupId ? { ...g, chatMessages: data.messages } : g
            )
          );
        }
      };

      socket.on('new_message', handleNewMessage);

      // Initial message fetch
      api.getMessages(chatGroupId).then((msgs) => {
        if (msgs && msgs.length > 0) {
          setGroups((prevGroups) =>
            prevGroups.map((g) => (g.id === chatGroupId ? { ...g, chatMessages: msgs } : g))
          );
        }
      }).catch(() => {});

      return () => {
        socket.emit('leave_group', chatGroupId);
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [isChatOpen, chatGroupId]);

  // Auth Handlers
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('tiet_logged_in', 'true');
    localStorage.setItem('tiet_user', JSON.stringify(userData));
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('tiet_logged_in');
    localStorage.removeItem('tiet_user');
    setActivePage('dashboard');
  };

  // Destination Selection & Journey Creation
  const handleOpenJourneyForm = (destObj) => {
    setSelectedDestination(destObj);
    setIsFormOpen(true);
  };

  const handleSubmitJourney = async (journeyData) => {
    setCurrentJourneyReq(journeyData);

    try {
      // Call backend API to persist journey and retrieve algorithmic matches
      const res = await api.createJourney({
        userId: user.id || 'user_main',
        destinationId: journeyData.destinationId,
        destinationName: journeyData.destinationName,
        hostel: journeyData.hostel,
        departureTime: journeyData.departureTime,
        date: journeyData.date,
        flexibility: journeyData.flexibility,
        transport: journeyData.transport,
        notes: journeyData.notes
      });

      if (res && res.matchedStudents) {
        setMatchedStudents(res.matchedStudents);
      }
    } catch (err) {
      console.warn('Backend match fallback:', err.message);
      const matchedResults = MOCK_STUDENTS.map((student) => {
        const matchInfo = calculateMatchScore(journeyData, student);
        return { student, matchInfo };
      })
        .filter((item) => item.matchInfo.score > 0)
        .sort((a, b) => b.matchInfo.score - a.matchInfo.score);

      setMatchedStudents(matchedResults);
    }

    setIsFormOpen(false);
    setActivePage('matching');
  };

  // Group Handlers
  const handleJoinGroup = async (groupId) => {
    try {
      const res = await api.joinGroup(groupId, {
        userId: user.id,
        name: user.name,
        avatar: user.avatar || 'ST',
        hostel: user.hostel,
        departureTime: currentJourneyReq?.departureTime || '17:00',
        phone: user.phone
      });

      if (res && res.group) {
        setGroups((prev) => prev.map((g) => (g.id === groupId ? res.group : g)));
      }
    } catch (err) {
      console.warn('Fallback join group:', err.message);
      setGroups((prevGroups) =>
        prevGroups.map((g) => {
          if (g.id === groupId) {
            const exists = g.members.some((m) => (m.id && m.id === user.id) || (m.user_id && m.user_id === user.id));
            if (exists || g.members.length >= g.maxMembers) return g;
            const userMember = {
              id: user.id,
              user_id: user.id,
              name: user.name,
              avatar: user.avatar || 'ST',
              hostel: user.hostel,
              departureTime: currentJourneyReq?.departureTime || '17:00',
              role: 'Member',
              phone: user.phone
            };
            return {
              ...g,
              members: [...g.members, userMember]
            };
          }
          return g;
        })
      );
    }

    setSelectedGroupId(groupId);
    setActivePage('group-details');
  };

  const handleCreateGroupWithStudent = async (candidateStudent) => {
    const newGroupPayload = {
      destinationId: currentJourneyReq?.destinationId || 'railway',
      destinationName: currentJourneyReq?.destinationName || 'Patiala Railway Station',
      departureTime: candidateStudent.departureTime,
      date: currentJourneyReq?.date || 'Today',
      pickupPoint: 'Main Gate (Near Executive Mess)',
      matchScore: candidateStudent?.id === 'me_open' ? 100 : 96,
      initialMembers: [
        {
          id: user.id,
          user_id: user.id,
          name: user.name,
          avatar: user.avatar || 'ST',
          hostel: user.hostel,
          departureTime: currentJourneyReq?.departureTime || candidateStudent?.departureTime,
          role: 'Group Admin',
          phone: user.phone || '+91 98765 00000'
        },
        ...(candidateStudent && candidateStudent.id !== 'me_open' ? [
          {
            id: candidateStudent.id,
            user_id: candidateStudent.id,
            name: candidateStudent.name,
            avatar: candidateStudent.avatar || 'ST',
            hostel: candidateStudent.hostel,
            departureTime: candidateStudent.departureTime,
            role: 'Member',
            phone: candidateStudent.phone || '+91 98765 00000'
          }
        ] : [])
      ]
    };

    try {
      const res = await api.createGroup(newGroupPayload);
      if (res && res.group) {
        setGroups((prev) => [res.group, ...prev.filter(g => g.id !== res.group.id)]);
        setSelectedGroupId(res.group.id);
      }
    } catch (err) {
      console.warn('Fallback create group:', err.message);
      const newGroupId = `${Math.floor(100 + Math.random() * 900)}`;
      const fallbackGroup = {
        id: newGroupId,
        ...newGroupPayload,
        status: 'Open',
        maxMembers: 4,
        members: newGroupPayload.initialMembers,
        chatMessages: [
          {
            id: `m_init_${Date.now()}`,
            senderId: candidateStudent.id,
            senderName: candidateStudent.name,
            avatar: candidateStudent.avatar,
            text: `Hey ${user.name.split(' ')[0]}! Glad we matched for ${currentJourneyReq?.destinationName || 'our trip'}. Let's coordinate pickup time!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
      setGroups((prev) => [fallbackGroup, ...prev]);
      setSelectedGroupId(newGroupId);
    }

    setActivePage('group-details');
  };

  const handleLeaveGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to leave this travel group?')) return;

    try {
      await api.leaveGroup(groupId, user.id);
      const updated = await api.getGroups();
      setGroups(updated || []);
    } catch (err) {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              members: g.members.filter((m) => m.id !== user.id && m.user_id !== user.id)
            };
          }
          return g;
        })
      );
    }
    setActivePage('dashboard');
  };

  // Dynamic Group Joining Simulation
  const handleSimulateJoin = (groupId, newStudent) => {
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.id === groupId && g.members.length < g.maxMembers) {
          const exists = g.members.some((m) => m.id === newStudent.id);
          if (exists) return g;
          return {
            ...g,
            members: [...g.members, newStudent],
            chatMessages: [
              ...g.chatMessages,
              {
                id: `m_sim_${Date.now()}`,
                senderId: newStudent.id,
                senderName: newStudent.name,
                avatar: newStudent.avatar,
                text: `Hi everyone! Just joined Group #${groupId}. Excited to travel together from ${newStudent.hostel}!`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]
          };
        }
        return g;
      })
    );
  };

  const handleResetGroup = async (groupId) => {
    try {
      await api.resetGroup(groupId);
    } catch (e) {}

    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            members: g.members.filter((m) => m.id !== 's4_simulated')
          };
        }
        return g;
      })
    );
  };

  const handleSendMessage = async (groupId, messageObj) => {
    try {
      const res = await api.sendMessage(groupId, {
        senderId: user.id || 'user_main',
        senderName: user.name,
        avatar: user.avatar || 'KA',
        text: messageObj.text
      });

      if (res && res.messages) {
        setGroups((prevGroups) =>
          prevGroups.map((g) => (g.id === groupId ? { ...g, chatMessages: res.messages } : g))
        );
        return;
      }
    } catch (err) {
      console.warn('Fallback send message:', err.message);
    }

    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            chatMessages: [...g.chatMessages, messageObj]
          };
        }
        return g;
      })
    );
  };

  const handleConfirmJourney = async (groupId) => {
    try {
      await api.confirmGroup(groupId);
    } catch (e) {}

    setGroups((prevGroups) =>
      prevGroups.map((g) => (g.id === groupId ? { ...g, status: 'Confirmed' } : g))
    );
  };

  const handleOpenChatModal = (groupId) => {
    setChatGroupId(groupId);
    setIsChatOpen(true);
  };

  // Communities Handlers
  const handleJoinCommunity = async (communityId) => {
    const target = communities.find((c) => c.id === communityId);
    if (user?.joinedCommunity && user.joinedCommunity !== communityId) {
      const current = communities.find((c) => c.id === user.joinedCommunity);
      alert(`Notice: You are currently a member of ${current?.name || 'another'} Community. In this system, you can belong to only one official hometown community at a time. Please leave your current community first!`);
      return;
    }

    try {
      await api.joinCommunity(communityId, user.id || 'user_main');
      const [updatedComm, updatedPosts] = await Promise.all([
        api.getCommunities(),
        api.getCommunityPosts(communityId)
      ]);
      setCommunities(updatedComm);
      setCommunityPosts(updatedPosts);
    } catch (err) {
      console.warn('Fallback join community:', err.message);
    }

    const updatedUser = { ...user, joinedCommunity: communityId, hometown: target?.name || user.hometown };
    setUser(updatedUser);
    localStorage.setItem('tiet_user', JSON.stringify(updatedUser));
  };

  const handleLeaveCommunity = async (communityId) => {
    if (!window.confirm('Are you sure you want to leave this hometown community?')) return;

    try {
      await api.leaveCommunity(communityId, user.id || 'user_main');
      const updatedComm = await api.getCommunities();
      setCommunities(updatedComm);
    } catch (err) {
      console.warn('Fallback leave community:', err.message);
    }

    const updatedUser = { ...user, joinedCommunity: null };
    setUser(updatedUser);
    localStorage.setItem('tiet_user', JSON.stringify(updatedUser));
  };

  const handleAddCommunityPost = async (newPost) => {
    try {
      const res = await api.createCommunityPost(newPost.communityId, {
        authorId: user.id || 'user_main',
        authorName: user.name,
        authorAvatar: user.avatar || 'KA',
        authorHostel: user.hostel,
        category: newPost.category,
        title: newPost.title,
        content: newPost.content
      });

      if (res && res.post) {
        setCommunityPosts((prev) => [res.post, ...prev]);
        return;
      }
    } catch (err) {
      console.warn('Fallback add community post:', err.message);
    }

    setCommunityPosts((prev) => [newPost, ...prev]);
  };

  const handleLikePost = async (postId) => {
    try {
      const res = await api.likePost(postId);
      setCommunityPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: res.likes } : p))
      );
    } catch (err) {
      setCommunityPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
      );
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      const res = await api.addComment(postId, {
        authorId: user.id || 'user_main',
        authorName: user.name,
        authorAvatar: user.avatar || 'KA',
        authorHostel: user.hostel,
        text
      });

      if (res && res.comments) {
        setCommunityPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, comments: res.comments, repliesCount: res.count }
              : p
          )
        );
      }
    } catch (err) {
      console.warn('Fallback add comment:', err.message);
    }
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

  const selectedGroupObj = groups.find((g) => g.id === selectedGroupId) || (groups.length > 0 ? groups[0] : null);
  const activeChatGroupObj = groups.find((g) => g.id === chatGroupId);

  // If user is not logged in, render AuthPage
  if (!isLoggedIn) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Top Navbar Header */}
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          if (page === 'my-groups') {
            const currentUid = user?.id;
            const myGroup = groups.find((g) => g.members && g.members.some((m) => (m.id && m.id === currentUid) || (m.user_id && m.user_id === currentUid)));
            if (myGroup) {
              setSelectedGroupId(myGroup.id);
              setActivePage('group-details');
              return;
            }
          }
          setActivePage(page);
        }}
        user={user}
        onLogout={handleLogout}
        myGroupsCount={groups.filter((g) => g.members && g.members.some((m) => (m.id && m.id === user?.id) || (m.user_id && m.user_id === user?.id))).length}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activePage === 'dashboard' && (
          <DashboardPage
            user={user}
            communities={communities}
            onNavigateToCommunities={() => setActivePage('communities')}
            onSelectDestination={handleOpenJourneyForm}
            activeGroups={groups}
            onViewGroupDetails={(gId) => {
              setSelectedGroupId(gId);
              setActivePage('group-details');
            }}
          />
        )}

        {activePage === 'matching' && (
          <MatchingResultsPage
            journeyReq={currentJourneyReq}
            matchedStudents={matchedStudents}
            activeGroups={groups}
            currentUser={user}
            onBack={() => setActivePage('dashboard')}
            onJoinGroup={handleJoinGroup}
            onCreateGroupWithStudent={handleCreateGroupWithStudent}
          />
        )}

        {activePage === 'group-details' && (
          <GroupDetailsPage
            group={selectedGroupObj}
            currentUser={user}
            onBack={() => setActivePage('dashboard')}
            onOpenChat={handleOpenChatModal}
            onSimulateJoin={handleSimulateJoin}
            onResetGroup={() => handleResetGroup(selectedGroupObj?.id)}
            onConfirmJourney={handleConfirmJourney}
            onLeaveGroup={handleLeaveGroup}
            onShareToChat={(groupId, fareText) => {
              handleSendMessage(groupId, {
                id: `msg_fare_${Date.now()}`,
                senderId: user.id,
                senderName: user.name,
                avatar: user.avatar || 'ST',
                text: fareText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
              handleOpenChatModal(groupId);
            }}
          />
        )}

        {activePage === 'my-groups' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center border border-blue-200/60 shadow-sm">
              <Users className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">No Active Travel Groups Yet</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                You haven't formed or joined any travel groups yet. Pick your transit destination on the dashboard to match with fellow Thapar students and form your first ride group!
              </p>
            </div>
            <button
              onClick={() => setActivePage('dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2"
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
            onJoinCommunity={handleJoinCommunity}
            onLeaveCommunity={handleLeaveCommunity}
            onAddPost={handleAddCommunityPost}
            onSelectCommunityTravel={handleSelectCommunityTravel}
            onLikePost={handleLikePost}
            onAddComment={handleAddComment}
          />
        )}

        {activePage === 'profile' && (
          <ProfilePage
            user={user}
            communities={communities}
            onUpdateProfile={(updated) => {
              setUser(updated);
              localStorage.setItem('tiet_user', JSON.stringify(updated));
              api.updateProfile(updated).catch(() => {});
            }}
          />
        )}
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
          onSendMessage={handleSendMessage}
        />
      )}

      {/* Persistent Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Thapar Journey Connect</span>
            <span>•</span>
            <span className="text-blue-600 font-semibold">Full-Stack Edition</span>
            <span>•</span>
            <span>Node.js / Express + SQLite</span>
          </div>
          <p className="text-slate-400">
            Designed exclusively for Thapar Institute of Engineering & Technology (TIET) students.
          </p>
        </div>
      </footer>

    </div>
  );
}
