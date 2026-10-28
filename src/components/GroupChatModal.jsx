import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';
import { X, Send, ShieldCheck, Users, MapPin, Phone } from 'lucide-react';

export default function GroupChatModal({ group, currentUser, onClose, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [group?.chatMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: `m_${Date.now()}`,
      senderId: currentUser?.id || 'user_main',
      senderName: currentUser?.name || 'Student',
      avatar: currentUser?.avatar || 'ST',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onSendMessage(group.id, newMessage);
    setInputText('');
  };

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl h-[650px] max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 px-6 border-b border-slate-800 flex items-center justify-between shrink-0">
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
                  {group.members.length}/{group.maxMembers} Members
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>{group.destinationName} • Pickup: {group.pickupPoint}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
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
              {group.members.map((m) => (
                <span key={m.id} className="bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-700 font-medium">
                  {m.name.split(' ')[0]} ({m.hostel})
                </span>
              ))}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            🔒 End-to-End TIET Student Chat
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {group.chatMessages.map((msg) => {
            const isMe = (msg.senderId && msg.senderId === currentUser?.id) || (currentUser?.name && msg.senderName === currentUser?.name);
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <Avatar
                  src={msg.avatar}
                  name={msg.senderName}
                  size="w-8 h-8"
                  textSize="text-xs"
                  rounded="rounded-full"
                  bg={isMe ? 'bg-indigo-600' : 'bg-slate-700'}
                />

                {/* Message Bubble */}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-semibold text-slate-700">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {msg.time}
                    </span>
                  </div>
                  
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
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
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-2xl font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
