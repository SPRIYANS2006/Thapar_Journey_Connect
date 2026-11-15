import React, { useState } from 'react';
import Avatar from './Avatar';
import { 
  Navigation, 
  MapPin, 
  Users, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Compass,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/useTheme';

export default function Navbar({ activePage, setActivePage, user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Compass },
    { id: 'communities', label: 'City Communities', icon: Users },
    { id: 'my-journeys', label: 'My Journeys', icon: MapPin },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'safety', label: 'Safety & privacy', icon: Users },
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div 
            onClick={() => handleNavClick('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Navigation className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                  Thapar Journey Connect
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
                Shared rides for TIET students
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all relative cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/60 dark:border-blue-800/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="ml-1 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Controls: Theme Toggle + Profile Pill + Logout */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-90" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 transition-transform duration-300 hover:-rotate-12" />
              )}
            </button>

            {/* Profile Chip */}
            <div 
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
            >
              <Avatar
                src={user?.avatar}
                name={user?.name || 'Student'}
                size="w-6 h-6"
                textSize="text-xs"
                rounded="rounded-full"
                bg="bg-rose-500 text-white"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {user?.name ? user.name.split(' ')[0] : 'Student'}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Right Controls: Theme Toggle + Menu Button */}
          <div className="md:hidden flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileMenuOpen}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-4 space-y-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/80 mb-3">
            <div className="flex items-center gap-3">
              <Avatar
                src={user?.avatar}
                name={user?.name || 'Student'}
                size="w-9 h-9"
                textSize="text-sm"
                rounded="rounded-full"
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {user?.name ? user.name.split(' ')[0] : 'Student'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.email || 'student@thapar.edu'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-amber-400 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </header>
  );
}
