import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';
import { X, Send, Users, MapPin, AlertCircle } from 'lucide-react';
import { api, getSocket } from '../services/api';

function formatMsgTime(timeStr) {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch {
    // fallback
  }
  return timeStr;
}

export default function GroupChatModal({ group, currentUser, onClose, onSendMessage }) {
  const [messages, setMessages] = useState(group?.chatMessages || []);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Initial messages fetch
  useEffect(() => {
    let active = true;
    if (!group?.id) return;

    api.getMessages(group.id)
      .then((msgs) => {
        if (active && Array.isArray(msgs)) {
          setMessages(msgs);
        }
      })
      .catch((err) => {
        console.warn('Failed to load messages:', err.message);
      });

    return () => {
      active = false;
    };
  }, [group?.id]);

  // 2. Real-time Socket.io Room & Live Message Sync
  useEffect(() => {
    if (!group?.id) return;
    const socket = getSocket();
    if (!socket) return;

    const sGroupId = String(group.id);

    const joinRoom = () => {
      socket.emit('join_group', sGroupId);
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    const handleNewMessage = (data) => {
      if (!data) return;
      if (String(data.groupId) === sGroupId) {
        if (data.message) {
          setMessages((prev) => {
            const exists = prev.some(
              (m) =>
                (m.id && m.id === data.message.id) ||
                (m._tempId && m.text === data.message.text && (m.senderId === data.message.senderId || m.sender_id === data.message.sender_id))
            );
            if (exists) {
              return prev.map((m) =>
                m.id === data.message.id ||
                (m._tempId && m.text === data.message.text && (m.senderId === data.message.senderId || m.sender_id === data.message.sender_id))
                  ? data.message
                  : m
              );
            }
            return [...prev, data.message];
          });
        } else if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.emit('leave_group', sGroupId);
      socket.off('connect', joinRoom);
      socket.off('new_message', handleNewMessage);
    };
  }, [group?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const optimisticMsg = {
      id: tempId,
      _tempId: tempId,
      groupId: group.id,
      senderId: currentUser?.id,
      senderName: currentUser?.name || 'You',
      avatar: currentUser?.avatar || 'ST',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Pop the message into UI immediately without any network wait!
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setTimeout(scrollToBottom, 20);

    try {
      let res;
      if (onSendMessage) {
        res = await onSendMessage(group.id, { text: trimmed });
      } else {
        res = await api.sendMessage(group.id, trimmed);
      }

      const confirmedMsg = res?.message || res;
      if (confirmedMsg && (confirmedMsg.id || confirmedMsg._id)) {
        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === tempId
              ? { ...confirmedMsg, _tempId: undefined }
              : m
          )
        );
      }
    } catch (err) {
      console.warn('Send message error:', err.message);
      setMessages((prev) =>
        prev.map((m) =>
          m._tempId === tempId ? { ...m, failed: true, error: err.message } : m
        )
      );
    }
  };

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-2xl h-[95vh] sm:h-[650px] max-h-[96vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-3.5 px-4 sm:p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
              #{group.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Group #{group.id} Chat
                </h3>
                <span className="text-[10px] uppercase font-extrabold bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-md">
                  {(group.members || []).length}/{group.maxMembers || group.capacity || 4} Members
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>
                  {group.destinationName || 'TIET Shared Journey'} {group.pickupPoint ? `• Pickup: ${group.pickupPoint}` : ''}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Members Ribbon */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-700">Members:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(group.members || []).map((m) => (
                <span
                  key={m.userId || m.user_id || m.id}
                  className="bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-700 font-medium"
                >
                  {m.name?.split(' ')[0]} ({m.hostel || 'Campus'})
                </span>
              ))}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            🔒 Members-Only Ride Chat
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-200/60 flex items-center justify-center text-slate-500">
                💬
              </div>
              <div className="font-bold text-slate-700 text-sm">No Messages Yet</div>
              <p className="text-xs text-slate-500 max-w-xs">
                Say hi to your co-riders to coordinate meeting time, pickup point, and luggage!
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe =
                (msg.senderId && msg.senderId === currentUser?.id) ||
                (msg.sender_id && msg.sender_id === currentUser?.id);
              return (
                <div
                  key={msg.id || msg._id || `${msg.time}_${idx}`}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar
                    src={msg.avatar}
                    name={msg.senderName || msg.sender_name}
                    size="w-8 h-8"
                    textSize="text-xs"
                    rounded="rounded-full"
                    bg={isMe ? 'bg-indigo-600' : 'bg-slate-700'}
                  />

                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-semibold text-slate-700">
                        {isMe ? 'You' : msg.senderName || msg.sender_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatMsgTime(msg.time || msg.createdAt)}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {msg.failed && (
                      <div className="text-[10px] text-rose-500 font-medium flex items-center gap-1 mt-1 justify-end">
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed to send. Please check your connection.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Coordinate meeting point, cab split, timing..."
              className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-2xl font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
