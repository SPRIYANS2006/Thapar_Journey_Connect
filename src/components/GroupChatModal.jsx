import { useModalFocus } from '../hooks/useModalFocus';
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
  const dialogRef = useModalFocus(true, onClose);
  const [messages, setMessages] = useState(group?.chatMessages || []);
  const [inputText, setInputText] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [revision, setRevision] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!group?.id) return;
    let active = true;
    const socket = getSocket();
    const groupId = String(group.id);
    const mergeMessages = (incoming) => {
      if (!active) return;
      setMessages(previous => {
        const byId = new Map(previous.map(message => [message.id, message]));
        for (const message of incoming) byId.set(message.id, message);
        return [...byId.values()].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      });
    };
    const joinRoom = () => {
      if (socket?.connected) socket.emit('join_group', groupId);
      api.getMessages(groupId).then(history => {
        if (active) setHistoryError('');
        mergeMessages(history);
      }).catch(error => {
        if (active) setHistoryError(error.message);
      });
    };
    const receive = data => {
      if (String(data?.groupId) !== groupId) return;
      if (data.message) mergeMessages([data.message]);
      else if (Array.isArray(data.messages)) mergeMessages(data.messages);
    };
    socket?.on('connect', joinRoom);
    socket?.on('new_message', receive);
    joinRoom();
    return () => {
      active = false;
      if (socket?.connected) socket.emit('leave_group', groupId);
      socket?.off('connect', joinRoom);
      socket?.off('new_message', receive);
    };
  }, [group?.id, revision]);

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
      createdAt: new Date().toISOString(),
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
        setMessages(previous => {
          if (previous.some(message => message.id === confirmedMsg.id)) {
            return previous.filter(message => message._tempId !== tempId);
          }
          return previous.map(message => message._tempId === tempId ? confirmedMsg : message);
        });
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
    <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[95vh] sm:h-[650px] max-h-[96vh] sm:max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        {/* Header */}
        <div className="bg-[#10264E] dark:bg-[#0c1e3d] text-white p-3.5 px-4 sm:p-4 sm:px-6 border-b border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-xs">
              #{group.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Group #{group.id} chat
                </h3>
                <span className="text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/20 px-2.5 py-0.5 rounded-full">
                  {(group.members || []).length}/{group.maxMembers || group.capacity || 4} members
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-blue-300" />
                <span>
                  {group.destinationName || 'TIET Shared Journey'} {group.pickupPoint ? `• Pickup: ${group.pickupPoint}` : ''}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Members Ribbon */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Members:</span>
            <div className="flex items-center gap-1.5">
              {(group.members || []).map((m) => (
                <span
                  key={m.userId || m.user_id || m.id}
                  className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap"
                >
                  {m.name?.split(' ')[0]} ({m.hostel ? m.hostel.split(' ')[0] : 'Campus'})
                </span>
              ))}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline shrink-0">
            🔒 Private ride chat
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/60 dark:bg-slate-950/60">
          {historyError && <p role="alert">Could not load chat history. <button onClick={() => setRevision(value => value + 1)}>Retry</button></p>}
          {messages.length === 0 && !historyError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xl">
                💬
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">No messages yet</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Say hello to your co-riders to coordinate meeting time and pickup point.
              </p>
            </div>
          ) : (
            messages.filter(msg => !(currentUser?.mutedUsers || []).includes(msg.senderId || msg.sender_id)).map((msg, idx) => {
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
                    bg={isMe ? 'bg-blue-600' : 'bg-slate-700'}
                  />

                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isMe ? 'You' : msg.senderName || msg.sender_name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatMsgTime(msg.time || msg.createdAt)}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {msg.failed && (
                      <div className="text-[10px] text-rose-500 font-medium flex items-center gap-1 mt-1 justify-end">
                        <AlertCircle className="w-3 h-3" />
                        <span>{msg.error || 'Failed to send. Check your connection.'}</span>
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
        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              aria-label="Message"
              maxLength={500}
              placeholder="Coordinate meeting point, cab split, timing..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!inputText.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
