let ioInstance = null;

export function setSocketIO(io) {
  ioInstance = io;
}

export function getSocketIO() {
  return ioInstance;
}

export function notifyUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user_${userId}`).emit(event, payload);
}

export function notifyGroup(groupId, event, payload) {
  if (!ioInstance || !groupId) return;
  ioInstance.to(`group_${groupId}`).emit(event, payload);
}

export function notifyGroupMembersUpdated(group) {
  if (!ioInstance || !group) return;
  const memberUserIds = (group.members || []).map((m) => m.user_id);
  for (const uid of memberUserIds) {
    ioInstance.to(`user_${uid}`).emit('groups_updated', {
      groupId: group.id,
      status: group.status
    });
  }
}
