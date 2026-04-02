import React, { useState, useRef, useEffect } from 'react';
import { Bell, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore(useShallow(state => ({
    user: state.user,
    logout: state.logout
  })));
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user?.name || user?.username || 'Integration User';

  return (
    <header className="h-16 bg-surface border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex-1">
        {/* Placeholder for future search bar if needed */}
      </div>
      
      <div className="flex items-center space-x-7">
        
        {/* Notification section */}
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-100 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
          <span className="text-[15px] font-medium hidden sm:block">Notification</span>
          <div className="relative flex items-center justify-center">
            <Bell className="h-5 w-5 fill-yellow-500 text-yellow-500" />
            <span className="absolute -right-[10px] -top-[6px] h-[18px] w-[18px] bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-800">
              1
            </span>
          </div>
        </div>
        
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="relative h-[28px] w-[52px] bg-slate-200 dark:bg-slate-700 rounded-full flex items-center px-1 transition-colors hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300/50 dark:border-slate-500/50"
        >
          <div className={`h-[20px] w-[20px] flex items-center justify-center transition-transform duration-300 ${theme === 'light' ? 'translate-x-[22px]' : 'translate-x-0'}`}>
             {theme === 'light' ? <Sun className="h-3 w-3 fill-orange-400 text-orange-400" /> : <Moon className="h-[14px] w-[14px] fill-orange-300 text-orange-300" />}
          </div>
        </button>
        
        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 focus:outline-none rounded-full pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
          >
            <div className="h-[34px] w-[34px] rounded-full bg-[#A2C73B] border-[1.5px] border-white flex items-center justify-center text-white font-medium text-sm shadow-sm">
              {getInitials(displayName)}
            </div>
            <span className="text-[15px] font-medium text-slate-700 dark:text-white hidden sm:block">
              {displayName}
            </span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-[140px] bg-white dark:bg-slate-800 rounded shadow-lg py-1 z-50 border border-slate-200 dark:border-slate-700">
              <button 
                className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate('/profile');
                }}
              >
                Profile
              </button>
              {/* <div className="border-t border-slate-100 my-0.5"></div> */}
              <button 
                onClick={() => { setIsDropdownOpen(false); logout(); }}
                className="w-full text-left px-4 py-2.5 text-[14px] text-red-600 dark:hover:bg-slate-700 hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;
