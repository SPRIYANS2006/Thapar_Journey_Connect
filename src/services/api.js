// Central API service for Thapar Journey Connect
import { io } from 'socket.io-client';

const API_BASE = '/api';
let sessionToken = null;
// Migrate away from persistent browser-readable tokens. Reloads restore the
// session through the server's HttpOnly cookie instead.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tiet_token');
  } catch {
    // Storage can be disabled in private browsing.
  }
}

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
  return sessionToken;
}

export function setToken(token) {
  sessionToken = token || null;
}

export function clearToken() {
  sessionToken = null;
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
    credentials: 'include',
    ...options,
    headers
  });

  if (res.status === 401 && token === getToken()) {
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
  setAutoCapacity: (id, maxMembers) => request('/groups/' + id + '/capacity', {method: 'POST', body: JSON.stringify({maxMembers})}),
  setCabFare: (id, totalFare) => request('/groups/' + id + '/fare', { method: 'POST', body: JSON.stringify({ totalFare }) }),
  getMyJourneyFeed: options => request('/my-journeys', options),
  submitSafetyReport: data => request('/safety/reports', { method: 'POST', body: JSON.stringify(data) }),
  getSafetyReports: () => request('/safety/reports'),
  reviewSafetyReport: id => request(`/safety/reports/${id}`, { method: 'PATCH' }),
  muteUser: (userId, muted) => request('/safety/mute', { method: 'PUT', body: JSON.stringify({ userId, muted }) }),
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

  setPassword: (password, currentPassword) =>
    request('/auth/password', {
      method: 'POST',
      body: JSON.stringify(currentPassword ? { password, currentPassword } : { password })
    }),

  getMe: () => request('/auth/me'),

  logout: () =>
    request('/auth/logout', {
      method: 'POST'
    }),

  updateProfile: (profileData) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),

  // Ride chat uses the same endpoint for campus and community cab groups.
  getMessages: (id) => request('/groups/' + encodeURIComponent(id) + '/messages'),

  sendMessage: (id, text) => request('/groups/' + encodeURIComponent(id) + '/messages', {
    method: 'POST',
    body: JSON.stringify({ text })
  }),

  // Groups
  getMyGroups: () => request('/groups/mine'),

  getGroupHistory: () => request('/groups/history/mine'),

  getGroupById: (id) => request(`/groups/${id}`),

  joinGroup: (id) =>
    request(`/groups/${id}/join`, {
      method: 'POST',
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
      method: 'POST',
      body: JSON.stringify({ pickupPoint })
    }),

  rateGroup: (id, targetUserId, rating) =>
    request(`/groups/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId, rating })
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
    }),

  // Travel Groups (Train & Bus Travel Groups for City Hubs)
  getTravelGroups: (params = {}) => {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.communityId && params.communityId !== 'All') query.append('communityId', params.communityId);
    if (params.search) query.append('search', params.search);
    if (params.date && params.date !== 'All') query.append('date', params.date);
    if (params.excludeJoined) query.append('excludeJoined', 'true');
    const qs = query.toString();
    return request(`/travel-groups${qs ? `?${qs}` : ''}`);
  },

  getMyTravelGroups: () => request('/travel-groups/mine'),

  getTravelGroupById: (id) => request(`/travel-groups/${id}`),

  createTravelGroup: (data) =>
    request('/travel-groups', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  joinTravelGroup: (id) =>
    request(`/travel-groups/${id}/join`, {
      method: 'POST'
    }),

  leaveTravelGroup: (id) =>
    request(`/travel-groups/${id}/leave`, {
      method: 'POST'
    }),

  getTravelGroupMessages: (id) => request(`/travel-groups/${id}/messages`),

  sendTravelGroupMessage: (id, text) =>
    request(`/travel-groups/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    }),

  // City Community Rides (Cab, Bus, Train from Thapar to City)
  getCityRides: (communityId, params = {}) => {
    const query = new URLSearchParams();
    if (params.mode && params.mode !== 'All') query.append('mode', params.mode);
    if (params.date) query.append('date', params.date);
    const qs = query.toString();
    return request(`/communities/${communityId}/rides${qs ? `?${qs}` : ''}`);
  },

  createCityRide: (communityId, data) =>
    request(`/communities/${communityId}/rides`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  joinCityRide: (communityId, rideId) =>
    request(`/communities/${communityId}/rides/${rideId}/join`, {
      method: 'POST'
    }),

  leaveCityRide: (communityId, rideId) =>
    request(`/communities/${communityId}/rides/${rideId}/leave`, {
      method: 'POST'
    }),

  getCityCommunitySlots: (communityId, { destination, date, mode, direction } = {}) => {
    const query = new URLSearchParams();
    if (destination) query.append('destination', destination);
    if (date) query.append('date', date);
    if (mode && mode !== 'All' && mode !== 'Either') query.append('mode', mode);
    if (direction) query.append('direction', direction);
    const qs = query.toString();
    return request(`/communities/${communityId}/slots${qs ? `?${qs}` : ''}`);
  },

  joinCityCommunitySlot: (communityId, slotData) =>
    request(`/communities/${communityId}/slots/join`, {
      method: 'POST',
      body: JSON.stringify(slotData)
    }),

  // Slot-Based Travel Booking
  getSlots: ({ destinationId, date, vehicle, direction } = {}) => {
    const query = new URLSearchParams();
    if (destinationId) query.append('destinationId', destinationId);
    if (date) query.append('date', date);
    if (vehicle && vehicle !== 'Either') query.append('vehicle', vehicle);
    if (direction) query.append('direction', direction);
    const qs = query.toString();
    return request(`/slots${qs ? `?${qs}` : ''}`);
  },

  joinSlot: (slotData) =>
    request('/slots/join', {
      method: 'POST',
      body: JSON.stringify(slotData)
    }),

  previewRescheduleSlot: (oldGroupId) =>
    request('/slots/reschedule/preview', {
      method: 'POST',
      body: JSON.stringify({ oldGroupId })
    }),

  rescheduleSlot: (data) =>
    request('/slots/reschedule', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Friends / Companions in Slots
  addFriendToGroup: (groupId, data) =>
    request(`/groups/${groupId}/friends`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  removeFriendFromGroup: (groupId, friendId) =>
    request(`/groups/${groupId}/friends/${friendId}`, {
      method: 'DELETE'
    }),

  addFriendToCityRide: (communityId, rideId, data) =>
    request(`/communities/${communityId}/rides/${rideId}/friends`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  removeFriendFromCityRide: (communityId, rideId, friendId) =>
    request(`/communities/${communityId}/rides/${rideId}/friends/${friendId}`, {
      method: 'DELETE'
    })
};
