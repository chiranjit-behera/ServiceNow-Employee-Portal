import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, List, FileWarning, ShoppingBag, CheckCircle, HelpCircle, Grid3X3 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Sidebar = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes('admin');
  const isItil = roles.includes('itil');
  const isBasicEmployee = user?.sys_class_name === 'sys_user' && !isAdmin && !isItil;

  const menuItems = [
    ...(isBasicEmployee ? [] : [{ name: 'Dashboard', path: '/', icon: Home }]),
    { name: 'Incidents', path: '/incidents', icon: List },
    ...(isBasicEmployee ? [] : [{ name: 'Problems', path: '/problems', icon: FileWarning }]),
    { name: 'Catalog', path: '/catalog', icon: Grid3X3 },
    { name: 'Request Items', path: '/requests', icon: ShoppingBag },
    ...(isBasicEmployee ? [] : [{ name: 'Approvals', path: '/approvals', icon: CheckCircle }]),
  ];

  return (
    <aside className="w-65 bg-surface h-full border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300">
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
        <div onClick={() => navigate(isBasicEmployee ? '/incidents' : '/')} className="flex items-center gap-2">
          <div className="w-10 h-8 rounded bg-primary flex items-center justify-center text-white font-bold text-xl cursor-pointer">
            ESC
          </div>
          <span className="text-xl font-bold tracking-wide hover:text-white transition-colors cursor-pointer">Employee Portal</span>
        </div>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 group ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            <item.icon className="mr-3 flex-shrink-0 h-5 w-5 group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <button className="flex w-full items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors duration-200">
          <HelpCircle className="mr-3 h-5 w-5" />
          Help & Support
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
