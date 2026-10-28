import React, { useState } from 'react';
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
  Edit3 
} from 'lucide-react';
import { INITIAL_USER_PROFILE, HOSTELS } from '../data/mockData';

export default function ProfilePage({ user, communities = [], onUpdateProfile }) {
  const [name, setName] = useState(user?.name || '');
  const [degree, setDegree] = useState(user?.degree || 'B.Tech Computer Engineering');
  const [year, setYear] = useState(user?.year || '3rd Year (Batch of 2026)');
  const [hostel, setHostel] = useState(user?.hostel && user.hostel !== 'HA' ? user.hostel : (HOSTELS[0]?.name || 'Agira Hall (Previously known as Hostel-A)'));
  const [phone, setPhone] = useState(user?.phone || '+91 98765 00000');
  const [prefTransport, setPrefTransport] = useState(user?.preferredTransport || 'Shared Cab');
  const [joinedCommunity, setJoinedCommunity] = useState(user?.joinedCommunity || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          
          {/* Large Profile Photo / Avatar */}
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
              <span>{degree}</span>
              <span>•</span>
              <span>{year}</span>
              <span>•</span>
              <span>Hostel: <strong className="text-blue-200">{hostel}</strong></span>
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
            <span>{user?.reliability ?? 5.0}</span>
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

      {/* Profile & Preferences Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Account Details & Preferences
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your hostel selection and transit preferences.
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
                value={user?.email || 'student@thapar.edu'}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Degree / Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Degree / Engineering Branch</span>
              </label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech Computer Engineering"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Year of Study */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Academic Year / Batch</span>
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 3rd Year (Batch of 2026)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
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
                <optgroup label="Boys Hostels">
                  {HOSTELS.filter(h => h.gender === 'Boys').map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Girls Hostels (Official TIET Halls)">
                  {HOSTELS.filter(h => h.gender === 'Girls').map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </optgroup>
                <optgroup label="PG / Research">
                  {HOSTELS.filter(h => h.gender === 'Co-ed').map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
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
              className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
