import { Link, useLocation } from 'react-router-dom';

import { useSidebarStore } from '../store/sidebarStore';
import {
  LayoutDashboard,
  Users,
  Coins,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  X
} from 'lucide-react';
import lumbiaLogo from '../assets/lumbia_logo.png';

interface SidebarProps {
  activePage: string;
}

export default function Sidebar({ activePage }: SidebarProps) {
  const location = useLocation();

  const isOpen = useSidebarStore(state => state.isOpen);
  const close = useSidebarStore(state => state.close);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { id: 'consignees', label: 'Consignees', path: '/consignees', icon: Users },
    { id: 'collections', label: 'Collections', path: '/collections', icon: Coins },
    { id: 'revenue', label: 'Revenue', path: '/revenue', icon: TrendingUp },
    { id: 'liquidation', label: 'Liquidation', path: '/liquidation', icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Overlay background for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={close}
        />
      )}

      <aside className={`fixed md:relative inset-y-0 left-0 bg-[#003D29] text-white flex flex-col justify-between shrink-0 shadow-lg min-h-screen z-50 transition-all duration-300 overflow-hidden ${isOpen ? 'translate-x-0 w-64 p-4' : '-translate-x-full w-0 p-0'}`}>
        <div>
          {/* Logo Brand */}
          <div className="flex items-center justify-between px-2 py-4 mb-4 border-b border-white/10">
            <div className="flex items-center space-x-2.5">
              <div className="bg-[#006B4D]/0 p-2 rounded-full shrink-0">
                <img src={lumbiaLogo} alt="Lumbia Central School" className="h-9 w-9 object-contain rounded-full shrink-0" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-wide text-white leading-none">LCS Treasury</h2>
                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold block mt-0.5">School Administration</span>
              </div>
            </div>
            {/* Close button */}
            <button onClick={close} className="text-gray-400 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || activePage === item.id;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg font-semibold text-xs transition-colors ${isActive
                      ? 'text-[#003D29] bg-[#4ADE80]'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-white/10 pt-4">
          <Link
            to="/settings"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-semibold text-xs transition-colors ${activePage === 'settings'
                ? 'text-[#003D29] bg-[#4ADE80]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}