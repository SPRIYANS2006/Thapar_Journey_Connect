import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';

export function useCommunities() {
  const { user, refreshUser } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [activeCommunityId, setActiveCommunityId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCommunities = useCallback(async () => {
    try {
      const list = await api.getCommunities();
      const safe = Array.isArray(list) ? list : [];
      setCommunities(safe);
      return safe;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPosts = useCallback(async (communityId) => {
    if (!communityId) {
      setPosts([]);
      return [];
    }
    try {
      const p = await api.getCommunityPosts(communityId);
      const safe = Array.isArray(p) ? p : [];
      setPosts(safe);
      return safe;
    } catch {
      setPosts([]);
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.getCommunities()
      .then((list) => {
        if (!active) return;
        const safe = Array.isArray(list) ? list : [];
        setCommunities(safe);
        if (safe.length > 0) {
          setActiveCommunityId((prev) => prev || user?.joinedCommunity || safe[0].id);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    if (activeCommunityId) {
      api.getCommunityPosts(activeCommunityId)
        .then((p) => {
          if (!active) return;
          setPosts(Array.isArray(p) ? p : []);
        })
        .catch(() => {
          if (!active) return;
          setPosts([]);
        });
    }

    return () => {
      active = false;
    };
  }, [activeCommunityId]);

  const activeCommunity =
    communities.find((c) => c.id === activeCommunityId) || communities[0] || null;

  const createCommunity = async (commData) => {
    const res = await api.createCommunity(commData);
    await fetchCommunities();
    if (res?.community?.id) {
      setActiveCommunityId(res.community.id);
    }
    return res;
  };

  const joinCommunity = async (communityId) => {
    const res = await api.joinCommunity(communityId);
    await Promise.all([fetchCommunities(), refreshUser(), fetchPosts(communityId)]);
    return res;
  };

  const leaveCommunity = async (communityId) => {
    const res = await api.leaveCommunity(communityId);
    await Promise.all([fetchCommunities(), refreshUser(), fetchPosts(communityId)]);
    return res;
  };

  const createPost = async (communityId, postData) => {
    const res = await api.createCommunityPost(communityId, postData);
    await fetchPosts(communityId);
    return res;
  };

  const toggleLike = async (postId) => {
    const res = await api.likePost(postId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likes: res.likes, isLiked: res.isLiked }
          : p
      )
    );
    return res;
  };

  const addComment = async (postId, text) => {
    const res = await api.addComment(postId, text);
    if (activeCommunityId) {
      await fetchPosts(activeCommunityId);
    }
    return res;
  };

  return {
    communities,
    activeCommunity,
    activeCommunityId,
    setActiveCommunityId,
    posts,
    loading,
    error,
    fetchCommunities,
    fetchPosts,
    createCommunity,
    joinCommunity,
    leaveCommunity,
    createPost,
    toggleLike,
    addComment
  };
}
