import { NavLink } from 'react-router-dom';
import { Home, Users, Settings, LogOut, CheckSquare, PieChart, Building, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Contacts', icon: Users, path: '/contacts' },
    { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
    { name: 'Long-Term Goals', icon: Target, path: '/goals' },
    { name: 'Reports & Expenses', path: '/reports', icon: PieChart },
    { name: 'Hotel Guests', path: '/hotel', icon: Building },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 min-h-screen flex flex-col text-slate-300">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white tracking-wider text-center">CRM</h1>
      </div>
      <div className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </div>
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:bg-slate-700 hover:text-red-300 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
