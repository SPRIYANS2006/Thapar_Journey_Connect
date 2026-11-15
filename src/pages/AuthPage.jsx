import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Navigation, 
  ShieldCheck, 
  Mail, 
  Lock, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Sun,
  Moon,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';

export default function AuthPage({ onLoginSuccess }) {
  const { loginWithGoogle, loginWithPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
        setError('No credential received from Google. Try again.');
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
            'Access denied: Only @thapar.edu Google accounts are permitted.'
        );
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, onLoginSuccess]
  );

  // 3. Initialize Google Identity Services
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
            const btnWidth = typeof window !== 'undefined' && window.innerWidth < 400 ? 270 : 300;
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: isDark ? 'filled_black' : 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: btnWidth,
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
  }, [googleClientId, handleCredentialResponse, isDark]);

  // 4. Standard Campus Password Login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.endsWith('@thapar.edu')) {
      setError('Only @thapar.edu email addresses are allowed.');
      return;
    }

    if (!password.trim()) {
      setError('Enter your password.');
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-200 selection:bg-blue-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Navigation className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Thapar Journey Connect
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              Shared rides for TIET students
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          <div className="hidden sm:flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>@thapar.edu verified</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center z-10 flex-1">
        
        {/* Left Hero Pitch */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
            Campus rides,<br />
            <span className="text-blue-600 dark:text-blue-400">
              simplified.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl font-normal leading-relaxed">
            Find and share cabs with fellow Thaparians, from campus to anywhere.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Verified</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">TIET students</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Every</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">15 minutes</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Shared fares</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Split with co-riders</p>
              </div>
            </div>
          </div>

          {/* Thapar Campus Image */}
          <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs mt-6">
            <img
              src="/thapar-campus.png"
              alt="Thapar Institute Campus"
              className="w-full h-auto object-cover max-h-60"
            />
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl transition-colors">
            
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span className="leading-relaxed font-semibold">{error}</span>
              </div>
            )}

            <div className="space-y-1 mb-5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Welcome back
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign in to Thapar Journey Connect with your TIET account.
              </p>
            </div>

            {/* Google Sign-In Container */}
            <div className="space-y-3">
              <div className="flex justify-center min-h-[44px]">
                <div ref={googleBtnRef} />
                {!gisLoaded && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <span>Loading Google sign-in...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 dark:text-slate-500 font-medium absolute">
                or
              </span>
            </div>

            {/* Password Login Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your TIET email"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors"
                    required
                  />
                </div>
                <div className="text-right mt-1">
                  <button
                    type="button"
                    onClick={() => setError('Sign in with your @thapar.edu Google account to update your app password from Profile.')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* TIET Email note */}
            <div className="mt-4 p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 rounded-xl flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="text-blue-600 font-bold shrink-0 mt-0.5">ⓘ</span>
              <span>Use your TIET email (e.g., &lt;rollno&gt;@thapar.edu) to sign in.</span>
            </div>

            <div className="text-center mt-5 text-xs text-slate-500 dark:text-slate-400">
              <span>New here? </span>
              <button
                type="button"
                onClick={() => {
                  setError('Use Continue with Google above with your official @thapar.edu account to create your account.');
                }}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                Create account
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-600 z-10">
        Thapar Journey Connect • Made for TIET students
        <a className="block underline mt-2" href="/privacy.html">Privacy & safety information</a>
      </footer>
    </div>
  );
}
