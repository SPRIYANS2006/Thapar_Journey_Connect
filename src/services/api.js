// API client service for Thapar Journey Connect
import { io } from 'socket.io-client';

const API_BASE = '/api';

let socketInstance = null;
export function getSocket() {
  if (!socketInstance && typeof window !== 'undefined') {
    socketInstance = io({
      transports: ['websocket', 'polling']
    });
  }
  return socketInstance;
}

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server request failed');
    }
    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  googleLogin: (googleData) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData)
    }),

  getMe: (userId) =>
    request(`/auth/me${userId ? `?userId=${userId}` : ''}`),

  updateProfile: (profileData) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),

  // Metadata
  getDestinations: () => request('/destinations'),
  getHostels: () => request('/hostels'),
  getStats: () => request('/stats'),

  // Journeys & Matching
  createJourney: (journeyData) =>
    request('/journeys', {
      method: 'POST',
      body: JSON.stringify(journeyData)
    }),

  // Groups
  getGroups: () => request('/groups'),
  getGroupById: (id) => request(`/groups/${id}`),

  createGroup: (groupData) =>
    request('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData)
    }),

  joinGroup: (id, memberData) =>
    request(`/groups/${id}/join`, {
      method: 'POST',
      body: JSON.stringify(memberData)
    }),

  leaveGroup: (id, userId) =>
    request(`/groups/${id}/leave`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),

  confirmGroup: (id) =>
    request(`/groups/${id}/confirm`, {
      method: 'POST'
    }),

  resetGroup: (id) =>
    request(`/groups/${id}/reset`, {
      method: 'POST'
    }),

  calculateFareSplit: (id, totalAmount, tip = 0) =>
    request(`/groups/${id}/fare-split`, {
      method: 'POST',
      body: JSON.stringify({ totalAmount, tip })
    }),

  // Chat
  getMessages: (groupId) => request(`/groups/${groupId}/messages`),

  sendMessage: (groupId, messageData) =>
    request(`/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    }),

  // Communities
  getCommunities: () => request('/communities'),

  createCommunity: (data) =>
    request('/communities', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  joinCommunity: (communityId, userId) =>
    request(`/communities/${communityId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),

  leaveCommunity: (communityId, userId) =>
    request(`/communities/${communityId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),

  getCommunityPosts: (communityId) =>
    request(`/communities/${communityId}/posts`),

  createCommunityPost: (communityId, postData) =>
    request(`/communities/${communityId}/posts`, {
      method: 'POST',
      body: JSON.stringify(postData)
    }),

  likePost: (postId) =>
    request(`/communities/posts/${postId}/like`, {
      method: 'POST'
    }),

  addComment: (postId, commentData) =>
    request(`/communities/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(commentData)
    })
};
