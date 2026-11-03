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
import { useAuth } from '../context/useAuth';

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

  // Campus Password & Encryption Key Setup State
  const { setPassword: authSetPassword } = useAuth();
  const [localHasPassword, setLocalHasPassword] = useState(false);
  const hasUserPassword = Boolean(user?.hasPassword || localHasPassword);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
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
      if (authSetPassword) {
        await authSetPassword(newPassword, currentPassword);
      } else {
        await api.setPassword(newPassword, currentPassword);
      }
      setLocalHasPassword(true);
      setPasswordSuccess(true);
      setPasswordSuccessMsg(hasUserPassword ? 'Password updated.' : 'Password saved.');
      setIsUpdatingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to save password.');
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
                Verified student
              </span>
            </div>

            <p className="text-slate-300 text-sm font-medium">
              Thapar Institute
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 pt-2 flex-wrap">
              <span>{degree || 'Degree not set'}</span>
              <span>•</span>
              <span>{year || 'Year not set'}</span>
              <span>•</span>
              <span>Hostel: <strong className="text-blue-200">{hostel || 'Not assigned'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm text-center">
          <div className="text-3xl font-black text-indigo-600 mb-1">
            {Math.max(user?.tripsCompleted || 0, history.length)}
          </div>
          <div className="text-xs font-bold text-slate-500">
            Trips
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm text-center">
          <div className="text-3xl font-black text-amber-500 flex items-center justify-center gap-1 mb-1">
            {Math.max(user?.tripsCompleted || 0, history.length) > 0 ? (
              <>
                <Star className="w-7 h-7 fill-amber-500" />
                <span>{typeof user?.reliability === 'number' ? user.reliability.toFixed(1) : '5.0'}</span>
              </>
            ) : (
              <span>New</span>
            )}
          </div>
          <div className="text-xs font-bold text-slate-500">
            Rating
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
                <span>Past rides</span>
                {history.length > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {history.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your completed rides with fellow students.
              </p>
            </div>
          </div>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Loading past rides...
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Car className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No rides yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your completed trips will show up here.
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
                        {g.isCommunityRide ? g.destinationName : `TIET → ${g.destinationName}`}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {g.isCommunityRide && g.communityName ? `📍 ${g.communityName} Hub • ` : ''}{g.transport || 'Shared Cab'} • Pickup: {g.pickupPoint}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                    Completed
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
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Your details
          </h3>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Name</span>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Thapar email</span>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Degree</span>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Year</span>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
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
                <optgroup label="Girls Hostels">
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Phone</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Only your confirmed co-riders can see your number.</span>
              </p>
            </div>

            {/* Hometown City Community */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span className="text-base">📍</span>
                <span>Hometown hub</span>
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
                You can join one. Meet students from your city for weekend trips.
              </p>
            </div>
          </div>

          {/* Transport Preference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-600" />
              <span>Usual vehicle</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'Shared Cab', label: 'Cab' },
                { id: 'Shared Auto', label: 'Auto' },
                { id: 'Either', label: 'Either' }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPrefTransport(opt.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    prefTransport === opt.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedSuccess ? (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" />
                Preferences saved.
              </span>
            ) : (
              <span className="text-xs text-slate-400" />
            )}

            <button
              type="submit"
              className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Save changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Set / Update Campus Password & Encryption Key Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Password and encryption key
              </h3>
              <p className="text-xs text-slate-500">
                Campus credentials for signing in without Google.
              </p>
            </div>
          </div>

          <div>
            {hasUserPassword ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Encrypted and active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                <span>Not set</span>
              </span>
            )}
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{passwordSuccessMsg || 'Password saved.'}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {passwordError}
          </div>
        )}

        {hasUserPassword ? (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Encryption key password</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>bcrypt encrypted</span>
                </span>
              </label>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="password"
                    value="••••••••••••••••"
                    disabled
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 tracking-widest cursor-not-allowed select-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Protected
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsUpdatingPassword(!isUpdatingPassword);
                    setPasswordError('');
                  }}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isUpdatingPassword ? 'Cancel' : 'Update password'}</span>
                </button>
              </div>
            </div>

            {isUpdatingPassword && (
              <form onSubmit={handleSetPassword} className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Current password (if known)</span>
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>New password (8+ characters)</span>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Confirm new password</span>
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

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>{passwordLoading ? 'Updating...' : 'Update password'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUpdatingPassword(false);
                      setPasswordError('');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSetPassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>New password (8+ characters)</span>
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
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Confirm password</span>
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
              <span>{passwordLoading ? 'Saving...' : 'Save password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
