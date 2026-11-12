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
  const memberUserIds = (group.members || []).map((m) => m.user_id || m.userId || m.id);
  for (const uid of memberUserIds) {
    if (uid) {
      ioInstance.to(`user_${uid}`).emit('groups_updated', {
        groupId: group.id,
        status: group.status
      });
      ioInstance.to(`user_${uid}`).emit('group_updated', {
        groupId: group.id,
        status: group.status
      });
    }
  }
}

export function evictUserFromRoom(userId, roomName) {
  if (!ioInstance || !userId || !roomName) return;
  try {
    const userRoom = ioInstance.sockets?.adapter?.rooms?.get(`user_${userId}`);
    if (userRoom) {
      for (const socketId of userRoom) {
        const socket = ioInstance.sockets?.sockets?.get(socketId);
        if (socket) {
          socket.leave(roomName);
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to evict user ${userId} from room ${roomName}:`, err.message);
  }
}
