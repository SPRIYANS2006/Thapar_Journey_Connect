import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';

export function useCommunities() {
  const { user, refreshUser } = useAuth();
  const [communities, setCommunities] = useState([]);
  const selectedBoard = useRef(null);
  const latestRequest = useRef(0);
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
    if (communityId !== selectedBoard.current) return [];
    const request = ++latestRequest.current;
    if (!communityId) {
      setPosts([]);
      return [];
    }
    try {
      const p = await api.getCommunityPosts(communityId);
      const safe = Array.isArray(p) ? p : [];
      if (request === latestRequest.current) setPosts(safe);
      return safe;
    } catch {
      if (request === latestRequest.current) setPosts([]);
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

  const openBoard = useCallback((communityId) => {
    selectedBoard.current = communityId;
    return fetchPosts(communityId);
  }, [fetchPosts]);

  const createCommunity = async (commData) => {
    const res = await api.createCommunity(commData);
    await fetchCommunities();
    return res;
  };

  const joinCommunity = async (communityId) => {
    const res = await api.joinCommunity(communityId);
    await Promise.all([fetchCommunities(), refreshUser()]);
    return res;
  };

  const leaveCommunity = async (communityId) => {
    const res = await api.leaveCommunity(communityId);
    await Promise.all([fetchCommunities(), refreshUser()]);
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

  const addComment = async (postId, text, communityId) => {
    const res = await api.addComment(postId, text);
    const targetCommId = communityId || selectedBoard.current;
    if (targetCommId) {
      await fetchPosts(targetCommId);
    } else if (res?.comment) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...(p.comments || []), res.comment],
                repliesCount: (p.repliesCount || 0) + 1
              }
            : p
        )
      );
    }
    return res;
  };

  return {
    communities,
    openBoard,
    posts,
    loading,
    error,
    fetchCommunities,
    createCommunity,
    joinCommunity,
    leaveCommunity,
    createPost,
    toggleLike,
    addComment
  };
}
