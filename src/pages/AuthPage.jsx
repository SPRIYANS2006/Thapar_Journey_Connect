import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Navigation, 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function AuthPage({ onLoginSuccess }) {
  const { loginWithGoogle, loginWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [gisLoaded, setGisLoaded] = useState(false);
  const googleBtnRef = useRef(null);

  // 1. Fetch server config for dynamic Google Client ID
  useEffect(() => {
    let isMounted = true;
    api.getConfig()
      .then((cfg) => {
        if (isMounted && cfg?.googleClientId) {
          setGoogleClientId(cfg.googleClientId);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch config:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Handle Google Identity credential callback
  const handleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential) {
        setError('No credential received from Google. Please try again.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const loggedUser = await loginWithGoogle(response.credential);
        if (onLoginSuccess) {
          onLoginSuccess(loggedUser);
        }
      } catch (err) {
        setError(
          err.message ||
            'Access Denied: Only official @thapar.edu Google accounts are permitted.'
        );
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, onLoginSuccess]
  );

  // 3. Initialize Google Identity Services when both GIS script and client ID are available
  useEffect(() => {
    if (!googleClientId) return;

    let timerId = null;
    const checkGIS = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        setGisLoaded(true);
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: 320,
              logo_alignment: 'left'
            });
          }
        } catch (err) {
          console.warn('GIS initialization error:', err.message);
        }
      } else {
        timerId = setTimeout(checkGIS, 200);
      }
    };

    checkGIS();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [googleClientId, handleCredentialResponse]);

  // 4. Standard Campus Password Login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.endsWith('@thapar.edu')) {
      setError('Only official @thapar.edu email addresses are allowed.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await loginWithPassword(trimmedEmail, password.trim());
      if (onLoginSuccess) {
        onLoginSuccess(loggedUser);
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
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
                <p className="text-slate-400 text-xs mt-0.5">
                  Prioritizes students from your residence hall or quad.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Official Google Workspace SSO</h4>
                <p className="text-slate-400 text-xs mt-0.5">
                  Verified with your @thapar.edu Google ID token.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-5">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Official Google Sign-In Container */}
            <div className="space-y-3">
              <div className="text-center space-y-1 mb-2">
                <h3 className="font-bold text-white text-base">Sign In with TIET Account</h3>
                <p className="text-xs text-slate-400">
                  New and returning students authenticate with official Google SSO
                </p>
              </div>

              <div className="flex justify-center min-h-[44px]">
                <div ref={googleBtnRef} />
                {!gisLoaded && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span>Loading Google Sign-In...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified with Google Workspace (@thapar.edu)</span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-slate-700/80 w-full" />
              <span className="bg-slate-800 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold absolute">
                or with campus password
              </span>
            </div>

            {/* Password Login Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Thapar Email</span>
                  <span className="text-[10px] text-blue-400 font-semibold">@thapar.edu only</span>
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
              </div>

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
                    placeholder="Enter your campus password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Passwords can only be set from your profile after Google verification.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-4 text-center text-xs text-slate-500 z-10">
        Thapar Journey Connect • Official TIET Student Transit Platform
      </footer>
    </div>
  );
}
