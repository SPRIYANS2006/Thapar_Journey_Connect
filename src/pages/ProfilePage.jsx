import React, { useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import { 
  User, 
  Mail, 
  Building2, 
  Phone, 
  ShieldCheck, 
  Car, 
  Check, 
  Edit3,
  Lock, 
  KeyRound, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Camera, 
  Bell, 
  MapPin, 
  Layers, 
  X, 
  CreditCard, 
  Shield
} from 'lucide-react';
import { HOSTELS, ACADEMIC_YEARS } from '../data/mockData';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function ProfilePage({ user, communities = [], onUpdateProfile }) {
  const [name, setName] = useState(user?.name || '');
  const [year, setYear] = useState(user?.year || '');
  const [hostel, setHostel] = useState(getDisplayHostelName(user?.hostel || ''));
  const [phone, setPhone] = useState(user?.phone || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');
  const [homeCity, setHomeCity] = useState(user?.homeCity || user?.hometown || '');
  
  // Preferences
  const [prefTransport, setPrefTransport] = useState(user?.preferredTransport || 'Cab');
  const [timeWindow, setTimeWindow] = useState(user?.timeWindow || 'Every 15 Minutes');
  const [frequentRoutes, setFrequentRoutes] = useState(user?.frequentRoutes || []);
  const [rideNotifications, setRideNotifications] = useState(user?.rideNotifications ?? true);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Campus Password & Encryption Key Modal/Drawer State
  const { setPassword: authSetPassword } = useAuth();
  const [localHasPassword, setLocalHasPassword] = useState(false);
  const hasUserPassword = Boolean(user?.hasPassword || localHasPassword);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
    if (onUpdateProfile) {
      await onUpdateProfile({
        ...user,
      name: name.trim() || user?.name,
        year: year.trim() || user?.year,
        hostel,
        phone: phone.trim(),
        rollNumber: rollNumber.trim(),
        homeCity,
        hometown: homeCity,
        preferredTransport: prefTransport,
        timeWindow,
        frequentRoutes,
        rideNotifications
      });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) { setSaveError(err.message || 'Could not save profile.'); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setName(user?.name || '');
    setYear(user?.year || '');
    setHostel(getDisplayHostelName(user?.hostel || ''));
    setPhone(user?.phone || '');
    setRollNumber(user?.rollNumber || '');
    setHomeCity(user?.homeCity || user?.hometown || '');
    setPrefTransport(user?.preferredTransport || 'Cab');
    setTimeWindow(user?.timeWindow || 'Every 15 Minutes');
    setFrequentRoutes(user?.frequentRoutes || []);
    setRideNotifications(user?.rideNotifications ?? true);
  };

  const removeRoute = (routeToRemove) => {
    setFrequentRoutes(frequentRoutes.filter(r => r !== routeToRemove));
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
      setPasswordSuccessMsg(hasUserPassword ? 'Password updated successfully.' : 'Password saved successfully.');
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

  // Format clean hostel name for display
  function getDisplayHostelName(hName) {
    if (hName.includes('Agira')) return 'Agira Hostel';
    if (hName.includes('Amritam')) return 'Amritam Hostel';
    if (hName.includes('Prithvi')) return 'Prithvi Hostel';
    if (hName.includes('Neeram')) return 'Neeram Hostel';
    if (hName.includes('Vyan')) return 'Vyan Hostel';
    if (hName.includes('Tejas')) return 'Tejas Hostel';
    if (hName.includes('Ambaram')) return 'Ambaram Hostel';
    if (hName.includes('Viyat')) return 'Viyat Hostel';
    if (hName.includes('Anantam')) return 'Anantam Hostel';
    if (hName.includes('Vyom')) return 'Vyom Hostel';
    if (hName.includes('Vasudha')) return 'Vasudha Hostel';
    if (hName.includes('Ira')) return 'Ira Hostel';
    if (hName.includes('Ananta')) return 'Ananta Hostel';
    if (hName.includes('Dhriti')) return 'Dhriti Hostel';
    if (hName.includes('Vahni')) return 'Vahni Hostel';
    return hName.replace(/\s*\(Previously.*\)/i, '').replace(/\s*Hall/i, ' Hostel');
  };

  const displayName = name || user?.name || '';
  const displayInitial = (displayName.charAt(0) || 'P').toUpperCase();
  const displayEmail = user?.email || '';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Hero Banner Matching Image 1 */}
      <HeroBanner
        compact
        tag="YOUR ACCOUNT"
        title="Your Profile"
        subtitle="Manage your personal details, travel preferences, and account settings."
      />

      {/* Main Profile Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Top Identity Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar with Camera Badge */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center font-bold text-3xl shadow-sm select-none">
                {displayInitial}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs cursor-pointer transition-colors"
                title="Change avatar photo"
                aria-label="Change photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Identity Text */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {displayName}
                </h2>
              </div>
              <p className="text-sm font-semibold">Reliability rating {Number(user.reliability ?? 4.5).toFixed(1)} / 5 · {user.tripsCompleted || 0} completed journeys</p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                TIET Student • Thapar Institute of Engineering & Technology
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Verified TIET Student</span>
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Action */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('full-name-input');
              if (el) el.focus();
            }}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-center"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Two-Column Grid: Left (Personal Details) & Right (Preferences & Settings) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Personal Details Form (approx 7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-2xs space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Personal Details
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Keep your information up to date for a better, safer ride-sharing experience.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {savedSuccess ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 animate-in fade-in duration-200">
                      <Check className="w-3.5 h-3.5" />
                      <span>Profile updated</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80">
                      <Check className="w-3.5 h-3.5" />
                      <span>Profile updated</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="full-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Priyanshu"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* TIET Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      TIET Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={displayEmail}
                        disabled
                        readOnly
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Year of Study */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Year of Study
                    </label>
                    <div className="relative">
                      <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                      >
                        {ACADEMIC_YEARS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Hostel */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Hostel
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={hostel}
                        onChange={(e) => setHostel(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                      >
                        {[...new Set(HOSTELS.map(h => getDisplayHostelName(h.name)))].map(hostelName => (
                          <option key={hostelName} value={hostelName}>{hostelName}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Roll Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Roll Number
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="102215043"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Home City */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Home City
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={homeCity}
                        onChange={(e) => setHomeCity(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                      >
                        <option value="Patiala">Patiala</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Chandigarh">Chandigarh</option>
                        <option value="Ludhiana">Ludhiana</option>
                        <option value="Jalandhar">Jalandhar</option>
                        <option value="Amritsar">Amritsar</option>
                        {communities.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                </div>

                {saveError && <p role="alert" className="text-red-600 text-sm">{saveError}</p>}
                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

            </div>
          </div>

          {/* Right Column: Travel Preferences & Account Settings (approx 5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Travel Preferences Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Travel Preferences
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Saved preferences for planning. Use the dashboard filters to choose each ride.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {/* Preferred Vehicle */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Car className="w-4 h-4 text-slate-400" />
                    <span>Preferred vehicle</span>
                  </div>
                  <div className="relative min-w-[140px]">
                    <select
                      value={prefTransport}
                      onChange={(e) => setPrefTransport(e.target.value)}
                      className="w-full py-1.5 pl-3 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="Cab">Cab</option>
                      <option value="Auto">Auto</option>
                      <option value="Either">Either</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Preferred Time Window */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Preferred time window</span>
                  </div>
                  <div className="relative min-w-[150px]">
                    <select
                      value={timeWindow}
                      onChange={(e) => setTimeWindow(e.target.value)}
                      className="w-full py-1.5 pl-3 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="Every 15 Minutes">Every 15 Minutes</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Frequent Routes (optional) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Frequent routes (optional)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                    {frequentRoutes.map((route) => (
                      <span
                        key={route}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800"
                      >
                        <span>{route}</span>
                        <button
                          type="button"
                          onClick={() => removeRoute(route)}
                          className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {frequentRoutes.length < 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          const city = prompt('Enter frequent city name:');
                          if (city && city.trim() && !frequentRoutes.includes(city.trim())) {
                            setFrequentRoutes([...frequentRoutes, city.trim()]);
                          }
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold px-2 py-1 hover:underline cursor-pointer"
                      >
                        + Add route
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Account & Settings Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Account & Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage your account and app preferences.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Ride Notifications Toggle */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Bell className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Ride notifications
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Get updates about your rides and matches
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setRideNotifications(!rideNotifications)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      rideNotifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    aria-label="Toggle ride notifications"
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        rideNotifications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Account Security (Password / Encryption Key) */}
                <div 
                  onClick={() => setShowSecurityModal(true)}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Account security
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Manage your login and account access
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Account Security / Campus Password Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Account Security
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Campus sign-in password
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSecurityModal(false);
                  setPasswordError('');
                  setIsUpdatingPassword(false);
                }}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccessMsg || 'Password saved.'}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                {passwordError}
              </div>
            )}

            {hasUserPassword && !isUpdatingPassword ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Password status:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Password securely hashed
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value="••••••••••••••••"
                      disabled
                      readOnly
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-500 tracking-widest cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUpdatingPassword(true)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-3.5">
                {hasUserPassword && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {hasUserPassword ? 'New Password (8+ characters)' : 'Set Password (8+ characters)'}
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    {passwordLoading ? 'Saving...' : hasUserPassword ? 'Update Password' : 'Save Password'}
                  </button>
                  {hasUserPassword && (
                    <button
                      type="button"
                      onClick={() => setIsUpdatingPassword(false)}
                      className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
