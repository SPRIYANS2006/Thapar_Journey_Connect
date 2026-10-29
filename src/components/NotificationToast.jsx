import React, { useEffect } from 'react';
import Avatar from './Avatar';
import { 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X, 
  Users, 
  Car, 
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';

export default function NotificationToast({ notifications = [], onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ notification, onDismiss }) {
  const {
    id,
    type = 'info',
    title,
    message,
    text,
    sender,
    avatar,
    time,
    actionLabel,
    onAction,
    duration = 6000
  } = notification;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const handleActionClick = () => {
    if (onAction) {
      onAction();
    }
    onDismiss(id);
  };

  // Color schemes based on type
  const isChat = type === 'chat';
  const isMatch = type === 'match' || type === 'group_found';
  const isWarning = type === 'warning';
  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      className={`pointer-events-auto w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border p-4 transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
        isChat
          ? 'border-blue-400/70 shadow-blue-500/15 ring-1 ring-blue-400/30'
          : isMatch
          ? 'border-indigo-400/80 shadow-indigo-500/20 ring-2 ring-indigo-500/20 bg-gradient-to-br from-white via-indigo-50/40 to-white'
          : isWarning
          ? 'border-amber-400/80 shadow-amber-500/15 bg-amber-50/40'
          : isSuccess
          ? 'border-emerald-400/80 shadow-emerald-500/15 bg-emerald-50/30'
          : 'border-slate-200 shadow-slate-400/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Left Icon or Sender Avatar */}
        {isChat && avatar ? (
          <div className="relative shrink-0">
            <Avatar
              src={avatar}
              name={sender || 'Student'}
              size="w-10 h-10"
              textSize="text-xs"
              rounded="rounded-2xl"
              bg="bg-blue-600"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px]">
              <MessageSquare className="w-2.5 h-2.5" />
            </span>
          </div>
        ) : isMatch ? (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        ) : isWarning ? (
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-5 h-5" />
          </div>
        ) : isSuccess ? (
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Info className="w-5 h-5" />
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-extrabold text-xs text-slate-900 truncate">
              {title || (isChat ? `Chat • ${sender}` : 'Notification')}
            </h5>
            {time && (
              <span className="text-[10px] text-slate-400 shrink-0 font-medium flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {time}
              </span>
            )}
          </div>

          {/* Subtext */}
          {isChat ? (
            <p className="text-xs text-slate-700 font-medium mt-1 line-clamp-2 leading-snug">
              <span className="font-bold text-blue-700 mr-1">{sender}:</span>
              {text || message}
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
              {message || text}
            </p>
          )}

          {/* Optional Action Button */}
          {actionLabel && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleActionClick}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isMatch
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/25'
                    : isChat
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <span>{actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
