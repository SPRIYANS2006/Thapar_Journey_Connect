import React, { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';
import { 
  User, 
  Mail, 
  GraduationCap, 
  Home, 
  Phone, 
  Star, 
  ShieldCheck, 
  Car, 
  Check, 
  Edit3,
  Lock,
  KeyRound,
  Calendar,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { HOSTELS, COLLEGE_DEGREES, ACADEMIC_YEARS } from '../data/mockData';
import { api } from '../services/api';

export default function ProfilePage({ user, communities = [], onUpdateProfile }) {
  const [name, setName] = useState(user?.name || '');
  const [degree, setDegree] = useState(user?.degree || '');
  const [year, setYear] = useState(user?.year || '');
  const [hostel, setHostel] = useState(user?.hostel && user.hostel !== 'HA' ? user.hostel : '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [prefTransport, setPrefTransport] = useState(user?.preferredTransport || 'Shared Cab');
  const [joinedCommunity, setJoinedCommunity] = useState(user?.joinedCommunity || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Confirmed Ride History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getGroupHistory()
      .then((list) => {
        if (!active) return;
        setHistory(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.warn('Failed to load ride history:', err.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Campus Password Setup State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    const commObj = communities.find(c => c.id === joinedCommunity);
    onUpdateProfile({
      ...user,
      name: name.trim() || user?.name,
      degree: degree.trim() || user?.degree,
      year: year.trim() || user?.year,
      hostel,
      phone: phone.trim(),
      preferredTransport: prefTransport,
      joinedCommunity,
      hometown: commObj?.name || user?.hometown
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.setPassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to set password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <Avatar
            src={user?.avatar}
            name={name || user?.name || 'TIET Student'}
            size="w-24 h-24"
            textSize="text-3xl"
            rounded="rounded-3xl"
            bg="bg-indigo-600"
            className="border-4 border-white/20 shadow-xl"
          />

          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {name || user?.name || 'TIET Student'}
              </h1>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                ✓ Verified TIET Student
              </span>
            </div>

            <p className="text-slate-300 text-sm font-medium">
              Thapar Institute of Engineering & Technology (TIET)
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 pt-2 flex-wrap">
              <span>{degree || 'Degree Not Set'}</span>
              <span>•</span>
              <span>{year || 'Year Not Set'}</span>
              <span>•</span>
              <span>Hostel: <strong className="text-blue-200">{hostel || 'Not Assigned'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm text-center">
          <div className="text-3xl font-black text-indigo-600 mb-1">
            {user?.tripsCompleted ?? 0}
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Trips Completed
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm text-center">
          <div className="text-3xl font-black text-amber-500 flex items-center justify-center gap-1 mb-1">
            <Star className="w-7 h-7 fill-amber-500" />
            <span>{typeof user?.reliability === 'number' ? user.reliability.toFixed(1) : '5.0'}</span>
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Reliability Score (out of 5.0)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm text-center">
          <div className="text-3xl font-black text-emerald-600 mb-1">
            100%
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            @thapar.edu Verified
          </div>
        </div>
      </div>

      {/* Confirmed Travel History Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Confirmed Ride History</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  {history.length} {history.length === 1 ? 'Trip' : 'Trips'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official records of confirmed travel groups successfully completed with fellow Thapar students.
              </p>
            </div>
          </div>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Loading confirmed travel history...
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Car className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Confirmed Rides Completed Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When a ride you joined is confirmed and finishes its scheduled departure time, your verified travel record will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((g) => (
              <div
                key={g.id}
                className="p-5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/60 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      #{g.id}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        TIET → {g.destinationName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {g.transport || 'Shared Cab'} • Pickup: {g.pickupPoint}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                    ✓ Confirmed & Completed
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{g.date}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{g.departureTime}</span>
                  </span>
                </div>

                {/* Co-riders summary */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Travel Cohort ({g.members?.length || 0} Riders):
                  </span>
                  <div className="flex items-center -space-x-1.5">
                    {(g.members || []).map((m) => (
                      <span
                        key={m.userId || m.id}
                        title={`${m.name} (${m.hostel || 'Hostel'})`}
                        className="inline-block"
                      >
                        <Avatar
                          src={m.avatar}
                          name={m.name}
                          size="w-6 h-6"
                          textSize="text-[9px]"
                          rounded="rounded-full"
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile & Preferences Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Account Details & Preferences
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your degree program, academic year, hostel selection, and transit preferences.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">
            Student Profile
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Student Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Thapar Email (Verified ID)</span>
              </label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Degree / Branch Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Degree / Academic Program</span>
              </label>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Your Degree / Program --</option>
                {degree && !COLLEGE_DEGREES.includes(degree) && (
                  <option value={degree}>{degree} (Current)</option>
                )}
                {COLLEGE_DEGREES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Year of Study Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Academic Year of Study</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Academic Year --</option>
                {year && !ACADEMIC_YEARS.includes(year) && (
                  <option value={year}>{year} (Current)</option>
                )}
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Hostel Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Home className="w-4 h-4 text-blue-600" />
                <span>Hostel</span>
              </label>
              <select
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select your hostel...</option>
                <optgroup label="Boys Hostels">
                  {HOSTELS.filter((h) => h.gender === 'Boys').map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Girls Hostels (Official TIET Halls)">
                  {HOSTELS.filter((h) => h.gender === 'Girls').map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Contact Phone</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX (Add your phone/WhatsApp)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>
                  <strong>Privacy Shield:</strong> Your number is never shown publicly. Only verified students who join and confirm your travel group can access it.
                </span>
              </p>
            </div>

            {/* Hometown City Community */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="text-base">📍</span>
                <span>Hometown / City Community (Single Community Membership)</span>
              </label>
              <select
                value={joinedCommunity || ''}
                onChange={(e) => setJoinedCommunity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">None / Not Enrolled</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name} ({c.state}) — {c.membersCount} students
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Connecting with your native city hub allows students from your hometown to pair with you for weekend departures.
              </p>
            </div>
          </div>

          {/* Transport Preference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-600" />
              <span>Default Transport Preference</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['Shared Cab', 'Shared Auto', 'Either'].map((pref) => (
                <button
                  type="button"
                  key={pref}
                  onClick={() => setPrefTransport(pref)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    prefTransport === pref
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedSuccess ? (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" />
                Preferences updated successfully!
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Changes will take effect for your future journey requests.
              </span>
            )}

            <button
              type="submit"
              className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>

      {/* Set Campus Password Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Campus Password Access
            </h3>
            <p className="text-xs text-slate-500">
              Optionally set a campus password to log in directly without Google SSO prompts.
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>
              Campus password updated successfully! You can now log in using your @thapar.edu email and this password.
            </span>
          </div>
        )}

        {passwordError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>New Password (Min 8 Characters)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Confirm Password</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>{passwordLoading ? 'Saving...' : 'Set / Update Campus Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
