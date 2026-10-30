// Serializers to convert snake_case MongoDB models to camelCase frontend objects
// and enforce strict privacy rules (e.g. phone numbers only to confirmed group members).

export function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hostel: user.hostel || '',
    avatar: user.avatar || (user.name ? user.name.slice(0, 2).toUpperCase() : 'ST'),
    phone: user.phone || '',
    degree: user.degree || '',
    year: user.year || '',
    hometown: user.hometown || '',
    reliability: typeof user.reliability === 'number' ? +(user.reliability.toFixed(1)) : 5.0,
    tripsCompleted: user.trips_completed || 0,
    joinedCommunity: user.joined_community || null
  };
}

export function serializeMember(member, canSeePhone = false) {
  return {
    id: member.id || member.user_id,
    userId: member.user_id,
    name: member.name,
    avatar: member.avatar || 'ST',
    hostel: member.hostel || '',
    departureTime: member.departure_time,
    role: member.role || 'Member',
    phone: canSeePhone ? (member.phone || '') : '',
    joinedAt: member.joined_at ? new Date(member.joined_at).toISOString() : new Date().toISOString()
  };
}

export function serializeGroup(group, viewingUserId = null) {
  if (!group) return null;

  // Check if viewing user is a member of this group
  const isMember = Boolean(
    viewingUserId &&
    group.members &&
    group.members.some((m) => m.user_id === viewingUserId)
  );

  // Phone numbers are revealed ONLY to fellow members and ONLY when group is Confirmed or Completed
  const canSeePhones = isMember && (group.status === 'Confirmed' || group.status === 'Completed');

  const members = (group.members || []).map((m) => serializeMember(m, canSeePhones));

  return {
    id: group.id,
    destinationId: group.destination_id,
    destinationName: group.destination_name,
    departureTime: group.departure_time,
    date: group.date,
    status: group.status || 'Open',
    transport: group.transport || 'Shared Cab',
    maxMembers: group.max_members || 4,
    pickupPoint: group.pickup_point,
    matchScore: group.match_score ?? 95,
    adminId: group.admin_id,
    members,
    createdAt: group.created_at ? new Date(group.created_at).toISOString() : new Date().toISOString()
  };
}

export function serializeMessage(msg) {
  return {
    id: msg.id,
    groupId: msg.group_id,
    senderId: msg.sender_id,
    senderName: msg.sender_name,
    avatar: msg.avatar || 'ST',
    text: msg.text,
    time: msg.created_at
      ? new Date(msg.created_at).toISOString()
      : new Date().toISOString(),
    createdAt: msg.created_at
      ? new Date(msg.created_at).toISOString()
      : new Date().toISOString()
  };
}

export function serializeJourney(journey) {
  if (!journey) return null;
  return {
    id: journey.id,
    userId: journey.user_id,
    destinationId: journey.destination_id,
    destinationName: journey.destination_name,
    hostel: journey.hostel,
    departureTime: journey.departure_time,
    date: journey.date,
    flexibility: journey.flexibility,
    transport: journey.transport,
    notes: journey.notes || '',
    status: journey.status,
    createdAt: journey.created_at ? new Date(journey.created_at).toISOString() : new Date().toISOString()
  };
}

export function serializeCommunity(comm) {
  if (!comm) return null;
  return {
    id: comm.id,
    name: comm.name,
    state: comm.state,
    icon: comm.icon,
    membersCount: comm.members_count || 0,
    distanceFromThapar: comm.distance_from_thapar || '',
    popularTransport: comm.popular_transport || '',
    description: comm.description || '',
    tags: comm.tags || []
  };
}

export function serializePost(post, viewingUserId = null) {
  if (!post) return null;
  const likesArr = Array.isArray(post.likes) ? post.likes : [];
  const commentsArr = Array.isArray(post.comments) ? post.comments : [];

  return {
    id: post.id,
    communityId: post.community_id,
    authorId: post.author_id,
    author: post.author_name,
    authorAvatar: post.author_avatar || 'ST',
    authorHostel: post.author_hostel || 'Hostel',
    category: post.category,
    title: post.title,
    content: post.content,
    likes: likesArr.length,
    isLiked: viewingUserId ? likesArr.includes(viewingUserId) : false,
    repliesCount: commentsArr.length,
    comments: commentsArr.map((c) => ({
      id: c.id,
      postId: c.post_id || post.id,
      authorId: c.author_id,
      author: c.author_name,
      authorAvatar: c.author_avatar || 'ST',
      authorHostel: c.author_hostel || 'Hostel',
      text: c.text,
      createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString()
    })),
    createdAt: post.created_at ? new Date(post.created_at).toISOString() : new Date().toISOString()
  };
}
