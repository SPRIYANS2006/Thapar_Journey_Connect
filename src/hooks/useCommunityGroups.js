import { useState, useEffect, useCallback } from 'react';
import { api, getSocket } from '../services/api';
import { useAuth } from '../context/useAuth';

export function useCommunityGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterCommunity, setFilterCommunity] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGroups = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const queryParams = {
        communityId: params.communityId !== undefined ? params.communityId : filterCommunity,
        category: params.category !== undefined ? params.category : filterCategory,
        search: params.search !== undefined ? params.search : searchQuery
      };
      const list = await api.getCommunityGroups(queryParams);
      const safe = Array.isArray(list) ? list : [];
      setGroups(safe);
      setError(null);
      return safe;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [filterCommunity, filterCategory, searchQuery]);

  const fetchGroupById = useCallback(async (id) => {
    if (!id) return null;
    try {
      const data = await api.getCommunityGroupById(id);
      setSelectedGroup(data);
      return data;
    } catch (err) {
      console.warn('Failed to fetch community group detail:', err.message);
      return null;
    }
  }, []);

  const fetchMessages = useCallback(async (groupId) => {
    if (!groupId) {
      setMessages([]);
      return [];
    }
    try {
      setMessagesLoading(true);
      const list = await api.getCommunityGroupMessages(groupId);
      const safe = Array.isArray(list) ? list : [];
      setMessages(safe);
      return safe;
    } catch {
      // Non-member or unauthorized gets 403; clear messages
      setMessages([]);
      return [];
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const selectGroup = useCallback((grp) => {
    setSelectedGroup(grp);
    if (!grp || !grp.isMember) {
      setMessages([]);
    }
  }, []);

  const createGroup = async (groupData) => {
    const res = await api.createCommunityGroup(groupData);
    await fetchGroups();
    if (res?.group) {
      selectGroup(res.group);
    }
    return res;
  };

  const joinGroup = async (id) => {
    const res = await api.joinCommunityGroup(id);
    await fetchGroups();
    if (res?.group) {
      selectGroup(res.group);
      fetchMessages(id);
    }
    return res;
  };

  const leaveGroup = async (id) => {
    const res = await api.leaveCommunityGroup(id);
    await fetchGroups();
    if (selectedGroup?.id === id) {
      if (res?.group) {
        selectGroup(res.group);
      } else {
        selectGroup(null);
      }
    }
    return res;
  };

  const sendMessage = async (groupId, text) => {
    const res = await api.sendCommunityGroupMessage(groupId, text);
    if (res?.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
    }
    return res;
  };

  // Initial load and whenever filters change
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const list = await api.getCommunityGroups({
          communityId: filterCommunity,
          category: filterCategory,
          search: searchQuery
        });
        if (active) {
          setGroups(Array.isArray(list) ? list : []);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [filterCommunity, filterCategory, searchQuery]);

  // Handle selected group messages & socket room joining
  useEffect(() => {
    const groupId = selectedGroup?.id;
    if (!groupId) return;

    let active = true;
    const socket = getSocket();
    if (socket) {
      socket.emit('join_community_group', groupId);
    }

    if (selectedGroup.isMember) {
      api.getCommunityGroupMessages(groupId)
        .then((list) => {
          if (!active) return;
          setMessages(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (!active) return;
          setMessages([]);
        })
        .finally(() => {
          if (active) setMessagesLoading(false);
        });
    }

    const handleNewMessage = (payload) => {
      if (payload?.groupId === groupId && payload?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      }
    };

    if (socket) {
      socket.on('new_community_group_message', handleNewMessage);
    }

    return () => {
      active = false;
      if (socket) {
        socket.emit('leave_community_group', groupId);
        socket.off('new_community_group_message', handleNewMessage);
      }
    };
  }, [selectedGroup?.id, selectedGroup?.isMember]);

  return {
    groups,
    selectedGroup,
    setSelectedGroup: selectGroup,
    messages,
    loading,
    messagesLoading,
    error,
    filterCommunity,
    setFilterCommunity,
    filterCategory,
    setFilterCategory,
    searchQuery,
    setSearchQuery,
    fetchGroups,
    fetchGroupById,
    fetchMessages,
    createGroup,
    joinGroup,
    leaveGroup,
    sendMessage,
    currentUser: user
  };
}
