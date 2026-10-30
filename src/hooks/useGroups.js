import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, getSocket } from '../services/api';
import { useAuth } from '../context/useAuth';

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return [];
    }
    try {
      const data = await api.getMyGroups();
      const list = Array.isArray(data) ? data : [];
      setGroups(list);
      setError(null);
      return list;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchGroupById = useCallback(async (id) => {
    if (!id) return null;
    try {
      const data = await api.getGroupById(id);
      setSelectedGroupDetails(data);
      return data;
    } catch (err) {
      console.warn('Failed to fetch group details:', err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (user) {
      api.getMyGroups()
        .then((data) => {
          if (!active) return;
          setGroups(Array.isArray(data) ? data : []);
          setError(null);
        })
        .catch((err) => {
          if (!active) return;
          setError(err.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    if (selectedGroupId) {
      api.getGroupById(selectedGroupId)
        .then((data) => {
          if (!active) return;
          setSelectedGroupDetails(data);
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [selectedGroupId]);

  // Listen to socket room updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const handleUpdated = () => {
      fetchGroups();
      if (selectedGroupId) {
        fetchGroupById(selectedGroupId);
      }
    };

    socket.on('group_updated', handleUpdated);
    socket.on('member_joined', handleUpdated);
    socket.on('member_left', handleUpdated);
    socket.on('group_confirmed', handleUpdated);

    return () => {
      socket.off('group_updated', handleUpdated);
      socket.off('member_joined', handleUpdated);
      socket.off('member_left', handleUpdated);
      socket.off('group_confirmed', handleUpdated);
    };
  }, [user, fetchGroups, fetchGroupById, selectedGroupId]);

  const activeGroup = useMemo(() => {
    if (!user) return null;
    return (
      groups.find(
        (g) =>
          (g.status === 'Open' || g.status === 'Confirmed') &&
          (g.members || []).some((m) => m.userId === user.id || m.id === user.id)
      ) || null
    );
  }, [groups, user]);

  const selectedGroup = useMemo(() => {
    if (selectedGroupDetails && selectedGroupDetails.id === selectedGroupId) {
      return selectedGroupDetails;
    }
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [selectedGroupDetails, selectedGroupId, groups]);

  const createGroup = async ({ journeyId, pickupPoint }) => {
    const res = await api.createGroup({ journeyId, pickupPoint });
    await fetchGroups();
    if (res?.group) {
      setSelectedGroupId(res.group.id);
      setSelectedGroupDetails(res.group);
    }
    return res;
  };

  const joinGroup = async (groupId, { journeyId } = {}) => {
    const res = await api.joinGroup(groupId, { journeyId });
    await fetchGroups();
    setSelectedGroupId(groupId);
    return res;
  };

  const leaveGroup = async (groupId) => {
    const res = await api.leaveGroup(groupId);
    await fetchGroups();
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
      setSelectedGroupDetails(null);
    }
    return res;
  };

  const confirmGroup = async (groupId) => {
    const res = await api.confirmGroup(groupId);
    await fetchGroups();
    if (selectedGroupId === groupId) {
      await fetchGroupById(groupId);
    }
    return res;
  };

  const completeGroup = async (groupId) => {
    const res = await api.completeGroup(groupId);
    await fetchGroups();
    return res;
  };

  const changePickupPoint = async (groupId, pickupPoint) => {
    const res = await api.changePickupPoint(groupId, pickupPoint);
    await fetchGroups();
    if (selectedGroupId === groupId) {
      await fetchGroupById(groupId);
    }
    return res;
  };

  const rateGroup = async (groupId, rating) => {
    const res = await api.rateGroup(groupId, rating);
    await fetchGroups();
    return res;
  };

  return {
    groups,
    activeGroup,
    selectedGroup,
    selectedGroupId,
    setSelectedGroupId,
    loading,
    error,
    fetchGroups,
    fetchGroupById,
    createGroup,
    joinGroup,
    leaveGroup,
    confirmGroup,
    completeGroup,
    changePickupPoint,
    rateGroup
  };
}
