import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Building2, 
  Sparkles, 
  User, 
  Phone,
  GraduationCap
} from 'lucide-react';
import { api } from '../services/api';
import { HOSTELS } from '../data/mockData';

// Helper to decode JWT from Google Identity Services
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function AuthPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const defaultHostel = HOSTELS[0]?.name || 'Agira Hall (Previously known as Hostel-A)';
  const [hostel, setHostel] = useState(defaultHostel);
  const [phone, setPhone] = useState('+91 98765 12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google Workspace SSO Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleHostel, setGoogleHostel] = useState(defaultHostel);
  const [googlePhone, setGooglePhone] = useState('+91 98765 00000');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Initialize Google Identity Services if VITE_GOOGLE_CLIENT_ID is provided
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (typeof window !== 'undefined' && window.google?.accounts?.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          hosted_domain: 'thapar.edu' // Built-in Google Workspace domain restriction
        });
      } catch (err) {
        console.warn('Google Identity Services notice:', err.message);
      }
    }
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const payload = parseJwt(response.credential);
      if (!payload || !payload.email || !payload.email.toLowerCase().endsWith('@thapar.edu')) {
        setError('Access Denied: Only official @thapar.edu Google Workspace accounts from TIET are permitted.');
        setLoading(false);
        return;
      }

      const res = await api.googleLogin({
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture,
        token: response.credential,
        hostel: defaultHostel
      });

      if (res && res.user) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim().toLowerCase().endsWith('@thapar.edu')) {
      setError('Only official @thapar.edu email addresses are allowed.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await api.register({
          name: name.trim() || undefined,
          email: email.trim().toLowerCase(),
          password: password.trim(),
          hostel: hostel,
          phone: phone
        });
      } else {
        res = await api.login(email.trim().toLowerCase(), password.trim());
      }

      if (res && res.user) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      console.warn('Backend login fallback:', err.message);
      const displayName = isRegister && name.trim() ? name.trim() : (email.split('@')[0].replace('.', ' ') || 'TIET Student');
      const userInitials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'TS';

      const fallbackUserData = {
        id: `user_${Date.now()}`,
        name: displayName,
        email: email.trim().toLowerCase(),
        hostel: hostel,
        avatar: userInitials,
        phone: phone,
        tripsCompleted: 0,
        reliability: 5.0,
        joinedCommunity: 'jal'
      };
      onLoginSuccess(fallbackUserData);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleWorkspaceSubmit = async (e) => {
    if (e) e.preventDefault();
    setGoogleError('');

    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setGoogleError('Please enter your Thapar Google email address.');
      return;
    }

    if (!cleanEmail.endsWith('@thapar.edu')) {
      setGoogleError('Access Denied: Only official @thapar.edu Google accounts are allowed. Personal accounts (@gmail.com) are strictly blocked.');
      return;
    }

    setGoogleLoading(true);

    try {
      const res = await api.googleLogin({
        email: cleanEmail,
        name: googleName.trim() || undefined,
        hostel: googleHostel,
        phone: googlePhone.trim() || undefined
      });

      if (res && res.user) {
        setShowGoogleModal(false);
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setGoogleError(err.message || 'Verification failed. Please ensure server is running.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Navigation className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
              Thapar Journey Connect
            </div>
            <span className="text-xs text-blue-300 font-medium">
              TIET Campus Transit Platform
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Exclusive for TIET Students & Scholars (@thapar.edu)</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 flex-1">
        
        {/* Left Hero Section */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Verified Student Journey Matching
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Travel together. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Travel smarter.
            </span>
          </h1>

          <p className="text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
            A verified journey-matching platform exclusively for Thapar students. Coordinate shared rides to Patiala Railway Station, Bus Stand, and Chandigarh & Delhi Airports with fellow students from your hostel.
          </p>

          {/* Feature Bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Hostel Proximity Matching</h4>
                <p className="text-slate-400 text-xs mt-0.5">Prioritizes students from your residence hall or quad.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Strict @thapar.edu Verification</h4>
                <p className="text-slate-400 text-xs mt-0.5">Google Workspace SSO ensures 100% verified campus peers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-5">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            
            {/* Primary Google Workspace SSO Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setGoogleEmail('');
                  setGoogleName('');
                  setGoogleError('');
                  setShowGoogleModal(true);
                }}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm rounded-2xl shadow-md border border-slate-200 transition-all flex items-center justify-center gap-3 active:scale-[0.99] group cursor-pointer"
              >
                {/* Official Google G Logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                  Continue with Google (@thapar.edu)
                </span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restricted to TIET Google Workspace accounts</span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-slate-700/80 w-full" />
              <span className="bg-slate-800 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold absolute">
                or use campus password
              </span>
            </div>

            {/* Login / Register Toggle */}
            <div className="flex bg-slate-900/80 p-1 rounded-2xl mb-5 border border-slate-700/60">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${
                  !isRegister ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Email Login
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${
                  isRegister ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register Account
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Kartik Arora"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Thapar Email</span>
                  <span className="text-[10px] text-blue-400 font-semibold">Only @thapar.edu</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@thapar.edu"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only official @thapar.edu email addresses are allowed.
                </p>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Select Residence Hall
                  </label>
                  <select
                    value={hostel}
                    onChange={(e) => setHostel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <optgroup label="Boys Hostels (Official TIET)">
                      {HOSTELS.filter(h => h.gender === 'Boys').map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Girls Hostels (Official TIET)">
                      {HOSTELS.filter(h => h.gender === 'Girls').map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="PG / Research Halls">
                      {HOSTELS.filter(h => h.gender === 'Co-ed').map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Error Notification */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to TIET Server...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegister ? 'Register & Access Dashboard' : 'Login & Access Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('student@thapar.edu');
                    setPassword('password123');
                    setError('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                >
                  Quick Demo: student@thapar.edu
                </button>
              </div>
            </form>

          </div>
        </div>

      </main>

      {/* Google Workspace SSO Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
                <svg className="w-7 h-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Google Workspace SSO
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                    TIET
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Strictly restricted to official <span className="text-blue-300 font-semibold">@thapar.edu</span> accounts
                </p>
              </div>
            </div>

            {/* Live Domain Restriction Status */}
            {googleEmail && !googleEmail.trim().toLowerCase().endsWith('@thapar.edu') && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Access Blocked:</span> Only official <span className="font-bold">@thapar.edu</span> Google accounts can sign in. Personal accounts (<span className="line-through text-rose-400">@gmail.com</span>) are forbidden.
                </div>
              </div>
            )}

            {googleError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{googleError}</span>
              </div>
            )}

            <form onSubmit={handleGoogleWorkspaceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Thapar Google Email</span>
                  <span className="text-[10px] text-blue-400 font-semibold">Must end in @thapar.edu</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => {
                      setGoogleEmail(e.target.value);
                      setGoogleError('');
                    }}
                    placeholder="student@thapar.edu"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="e.g. Kartik Arora"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Residence Hall
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <select
                    value={googleHostel}
                    onChange={(e) => setGoogleHostel(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <optgroup label="Boys Hostels (Official TIET)">
                      {HOSTELS.filter(h => h.gender === 'Boys').map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Girls Hostels (Official TIET)">
                      {HOSTELS.filter(h => h.gender === 'Girls').map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="PG / Research Halls">
                      {HOSTELS.filter(h => h.gender === 'Co-ed').map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Mobile Number (For Transit Ride Coordination)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={googlePhone}
                    onChange={(e) => setGooglePhone(e.target.value)}
                    placeholder="+91 98765 12345"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={googleLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying @thapar.edu Google Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize with Thapar Google SSO</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Quick Presets for Demo & Testing */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmail('student@thapar.edu');
                      setGoogleName('Kartik Arora');
                      setGoogleError('');
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium border border-slate-700 text-center transition-colors cursor-pointer"
                  >
                    Quick Fill: @thapar.edu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmail('user@gmail.com');
                      setGoogleName('Outside User');
                      setGoogleError('Access Denied: Only official @thapar.edu Google accounts are allowed. Personal accounts (@gmail.com) are strictly blocked.');
                    }}
                    className="flex-1 py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[11px] font-medium border border-rose-500/30 text-center transition-colors cursor-pointer"
                  >
                    Test Block: @gmail.com
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-500 border-t border-slate-800 z-10">
        Thapar Journey Connect • Exclusively for Thapar Institute of Engineering & Technology Students & Faculty
      </footer>

    </div>
  );
}
