import { useModalFocus } from '../hooks/useModalFocus';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Train, 
  Bus, 
  Users, 
  Calendar, 
  Clock, 
  Info 
} from 'lucide-react';
import { api, getSocket } from '../services/api';

export default function TravelGroupChatModal({
  group,
  isOpen,
  onClose,
  currentUser,
  triggerToast
}) {
  const dialogRef = useModalFocus(isOpen, onClose);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [revision, setRevision] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !group?.id) return;
    let active = true;

    const loadHistory = () => api.getTravelGroupMessages(group.id)
      .then((data) => {
        if (active) {
          setMessages(previous => [...new Map([...(Array.isArray(data) ? data : []), ...previous].map(message => [message.id, message])).values()].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))));
          setChatError('');
          setLoading(false);
          setTimeout(scrollToBottom, 100);
        }
      })
      .catch((err) => {
        console.warn('Failed to load travel group messages:', err);
        if (active) { setLoading(false); setChatError(err.message || 'Could not load messages. Please try again.'); }
      });

    // Socket.IO real-time connection
    const socket = getSocket();
    if (socket) {
      const joinRoom = () => { socket.emit('join_travel_group', group.id); loadHistory(); };
      if (socket.connected) joinRoom();
      else loadHistory();
      socket.on('connect', joinRoom);

      const handleNewMessage = (payload) => {
        if (payload?.groupId === group.id && payload?.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.message.id)) return prev;
            return [...prev, payload.message];
          });
          setTimeout(scrollToBottom, 50);
        }
      };

      socket.on('new_travel_group_message', handleNewMessage);

      return () => {
        active = false;
        socket.emit('leave_travel_group', group.id);
        socket.off('new_travel_group_message', handleNewMessage);
        socket.off('connect', joinRoom);
      };
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, [isOpen, group?.id, revision]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setChatError('');
    setSending(true);

    try {
      const res = await api.sendTravelGroupMessage(group.id, textToSend);
      if (res?.message) {
        setInputText(current => current === inputText ? '' : current);
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      setChatError(err.message || 'Message not sent. Your draft is still here.');
      if (triggerToast) {
        triggerToast({
          id: `chat_err_${Date.now()}`,
          type: 'error',
          title: 'Could not send message',
          message: err.message || 'Failed to post message in group chat.'
        });
      }
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !group) return null;

  const isTrain = group.type === 'Train';

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full h-[600px] max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isTrain
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                : 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
            }`}>
              {isTrain ? <Train className="w-5 h-5" /> : <Bus className="w-5 h-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  {group.title}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isTrain
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}>
                  {group.type}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                <span>{group.boardingPoint} ➔ {group.destination}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{group.membersCount || group.members?.length || 1} members</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Travel Details Ribbon */}
        <div className="px-5 py-2 bg-blue-50/50 dark:bg-blue-950/30 border-b border-blue-100/60 dark:border-blue-900/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{group.date}</span>
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{group.departureTime}</span>
            </span>
            {isTrain && group.trainNumber && (
              <span className="text-[11px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                🚆 {group.trainNumber} {group.travelClass ? `(${group.travelClass})` : ''}
              </span>
            )}
            {!isTrain && group.busOperator && (
              <span className="text-[11px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                🚌 {group.busOperator}
              </span>
            )}
          </div>

          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>Self-booked tickets</span>
          </span>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/40 dark:bg-slate-900/60">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Loading group chat...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                {isTrain ? <Train className="w-6 h-6" /> : <Bus className="w-6 h-6" />}
              </div>
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                Welcome to {group.title} Chat!
              </h4>
              <p className="text-xs max-w-sm">
                Coordinate boarding points, coach/seat meetups, and travel updates with your co-riders here.
              </p>
            </div>
          ) : (
            messages.filter(m => !(currentUser?.mutedUsers || []).includes(m.senderId || m.sender_id)).map((m) => {
              const isMe = m.senderId === currentUser?.id;
              const senderInitial = (m.senderName?.charAt(0) || 'S').toUpperCase();

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Sender Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none ${
                    isMe
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}>
                    {senderInitial}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end text-right' : ''}`}>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {isMe ? 'You' : m.senderName}
                      </span>
                      {m.senderHostel && (
                        <span>({m.senderHostel.split(' ')[0]})</span>
                      )}
                      <span>•</span>
                      <span>{m.time || 'Now'}</span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-xs shadow-2xs'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        {chatError && <div role="alert" className="text-xs text-red-600 px-4 py-2 flex justify-between gap-2"><span>{chatError}</span><button className="underline" onClick={() => { setChatError(''); setLoading(true); setRevision(value => value + 1); }}>Reload messages</button></div>}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to your travel cohort..."
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            aria-label="Send message"
            disabled={!inputText.trim() || sending}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

      </div>
    </div>
  );
}
