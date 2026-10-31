// Central API service for Thapar Journey Connect
import { io } from 'socket.io-client';

const API_BASE = '/api';
const TOKEN_KEY = 'tiet_token';

let socketInstance = null;
const unauthorizedListeners = new Set();

export function onUnauthorized(callback) {
  unauthorizedListeners.add(callback);
  return () => unauthorizedListeners.delete(callback);
}

function notifyUnauthorized() {
  for (const cb of unauthorizedListeners) {
    try {
      cb();
    } catch {
      // ignore
    }
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getSocket() {
  if (typeof window === 'undefined') return null;
  const token = getToken();

  if (!socketInstance) {
    socketInstance = io({
      transports: ['websocket', 'polling'],
      auth: { token }
    });
  } else if (token && socketInstance.auth?.token !== token) {
    socketInstance.auth = { token };
    socketInstance.disconnect().connect();
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (res.status === 401) {
    clearToken();
    notifyUnauthorized();
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Config & Metadata (Public)
  getConfig: () => request('/config'),
  getDestinations: () => request('/destinations'),
  getHostels: () => request('/hostels'),
  getStats: () => request('/stats'),

  // Auth
  googleLogin: (credential) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  setPassword: (password) =>
    request('/auth/password', {
      method: 'POST',
      body: JSON.stringify({ password })
    }),

  getMe: () => request('/auth/me'),

  updateProfile: (profileData) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),

  // Journeys & Matching
  createJourney: (journeyData) =>
    request('/journeys', {
      method: 'POST',
      body: JSON.stringify(journeyData)
    }),

  getMyJourneys: () => request('/journeys/mine'),

  // Groups
  getMyGroups: () => request('/groups/mine'),

  getGroupHistory: () => request('/groups/history/mine'),

  getGroupById: (id) => request(`/groups/${id}`),

  createGroup: ({ journeyId, pickupPoint }) =>
    request('/groups', {
      method: 'POST',
      body: JSON.stringify({ journeyId, pickupPoint })
    }),

  joinGroup: (id, { journeyId } = {}) =>
    request(`/groups/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ journeyId })
    }),

  leaveGroup: (id) =>
    request(`/groups/${id}/leave`, {
      method: 'POST'
    }),

  confirmGroup: (id) =>
    request(`/groups/${id}/confirm`, {
      method: 'POST'
    }),

  completeGroup: (id) =>
    request(`/groups/${id}/complete`, {
      method: 'POST'
    }),

  changePickupPoint: (id, pickupPoint) =>
    request(`/groups/${id}/pickup-point`, {
      method: 'PATCH',
      body: JSON.stringify({ pickupPoint })
    }),

  rateGroup: (id, rating) =>
    request(`/groups/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating })
    }),

  calculateFareSplit: (id, totalAmount, tip = 0) =>
    request(`/groups/${id}/fare-split`, {
      method: 'POST',
      body: JSON.stringify({ totalAmount, tip })
    }),

  // Chat
  getMessages: (groupId) => request(`/groups/${groupId}/messages`),

  sendMessage: (groupId, text) =>
    request(`/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    }),

  // Communities
  getCommunities: () => request('/communities'),

  createCommunity: (data) =>
    request('/communities', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  joinCommunity: (communityId) =>
    request(`/communities/${communityId}/join`, {
      method: 'POST'
    }),

  leaveCommunity: (communityId) =>
    request(`/communities/${communityId}/leave`, {
      method: 'POST'
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

  addComment: (postId, text) =>
    request(`/communities/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text })
    })
};
