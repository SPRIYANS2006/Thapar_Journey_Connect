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
    credentials: 'include',
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

  logout: () =>
    request('/auth/logout', {
      method: 'POST'
    }),

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
      method: 'POST',
      body: JSON.stringify({ pickupPoint })
    }),

  rateGroup: (id, targetUserId, rating) =>
    request(`/groups/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId, rating })
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
    }),

  // Community Groups (Hometown cohorts, discussions & chats)
  getCommunityGroups: (params = {}) => {
    const query = new URLSearchParams();
    if (params.communityId && params.communityId !== 'All') query.append('communityId', params.communityId);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return request(`/community-groups${qs ? `?${qs}` : ''}`);
  },

  getCommunityGroupById: (id) => request(`/community-groups/${id}`),

  createCommunityGroup: (data) =>
    request('/community-groups', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  joinCommunityGroup: (id) =>
    request(`/community-groups/${id}/join`, {
      method: 'POST'
    }),

  leaveCommunityGroup: (id) =>
    request(`/community-groups/${id}/leave`, {
      method: 'POST'
    }),

  getCommunityGroupMessages: (id) => request(`/community-groups/${id}/messages`),

  sendCommunityGroupMessage: (id, text) =>
    request(`/community-groups/${id}/messages`, {
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

  getCityCommunitySlots: (communityId, { destination, date, mode } = {}) => {
    const query = new URLSearchParams();
    if (destination) query.append('destination', destination);
    if (date) query.append('date', date);
    if (mode && mode !== 'All' && mode !== 'Either') query.append('mode', mode);
    const qs = query.toString();
    return request(`/communities/${communityId}/slots${qs ? `?${qs}` : ''}`);
  },

  joinCityCommunitySlot: (communityId, slotData) =>
    request(`/communities/${communityId}/slots/join`, {
      method: 'POST',
      body: JSON.stringify(slotData)
    }),

  // Slot-Based Travel Booking
  getSlots: ({ destinationId, date, vehicle } = {}) => {
    const query = new URLSearchParams();
    if (destinationId) query.append('destinationId', destinationId);
    if (date) query.append('date', date);
    if (vehicle && vehicle !== 'Either') query.append('vehicle', vehicle);
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
    }),

  // Luggage Transport (Porter / Rapido Parcel style)
  getLuggageQuote: ({ destination, date, time, vehicleType, items }) => {
    const q = new URLSearchParams();
    if (destination) q.append('destination', destination);
    if (date) q.append('date', date);
    if (time) q.append('time', time);
    if (vehicleType) q.append('vehicleType', vehicleType);
    if (items) q.append('items', JSON.stringify(items));
    return request(`/luggage/quote?${q.toString()}`);
  },

  getLuggageSlots: ({ destination, date, vehicleType } = {}) => {
    const q = new URLSearchParams();
    if (destination) q.append('destination', destination);
    if (date) q.append('date', date);
    if (vehicleType) q.append('vehicleType', vehicleType);
    return request(`/luggage/slots?${q.toString()}`);
  },

  createLuggageRequest: (data) =>
    request('/luggage', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMyLuggageRequests: () => request('/luggage/mine'),

  getLuggageDetails: (id) => request(`/luggage/${id}`),

  cancelLuggageRequest: (id) =>
    request(`/luggage/${id}/cancel`, {
      method: 'POST'
    }),

  rescheduleLuggageRequest: (id, data) =>
    request(`/luggage/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Vendor & Admin Hub
  getVendorRequests: ({ date, status } = {}) => {
    const q = new URLSearchParams();
    if (date) q.append('date', date);
    if (status) q.append('status', status);
    return request(`/vendor/requests?${q.toString()}`);
  },

  assignVendorDriver: (id, data) =>
    request(`/vendor/requests/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  verifyLuggagePickup: (id, otp) =>
    request(`/vendor/requests/${id}/verify-pickup`, {
      method: 'POST',
      body: JSON.stringify({ otp })
    }),

  updateVendorLuggageStatus: (id, status, note) =>
    request(`/vendor/requests/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note })
    }),

  getVendorConfig: () => request('/vendor/config')
};
