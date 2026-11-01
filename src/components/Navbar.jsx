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
  Compass
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage, user, onLogout, myGroupsCount = 1 }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Compass },
    { id: 'communities', label: 'City Communities', icon: Users },
    { id: 'my-journeys', label: 'My Journeys', icon: MapPin },
    { id: 'my-groups', label: 'My Groups', icon: Users, badge: myGroupsCount },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div 
            onClick={() => handleNavClick('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Navigation className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  Thapar Journey Connect
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                  TIET
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Verified Student Travel Matching
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
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

          {/* User Profile Pill & Logout */}
          <div className="hidden md:flex items-center gap-3">
            <div 
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 cursor-pointer hover:bg-slate-200/70 transition-colors"
            >
              <Avatar
                src={user?.avatar}
                name={user?.name || 'Student'}
                size="w-7 h-7"
                textSize="text-xs"
                rounded="rounded-full"
              />
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">{user?.name || 'TIET Student'}</div>
                <div className="text-[11px] text-slate-500 max-w-[130px] truncate">{user?.hostel || 'Campus'} • Student</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 shadow-lg">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3">
            <Avatar
              src={user?.avatar}
              name={user?.name || 'Student'}
              size="w-9 h-9"
              textSize="text-sm"
              rounded="rounded-full"
            />
            <div>
              <div className="font-bold text-slate-900 text-sm">{user?.name || 'TIET Student'}</div>
              <div className="text-xs text-slate-500">{user?.email || 'student@thapar.edu'}</div>
            </div>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </header>
  );
}
