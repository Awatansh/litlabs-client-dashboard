'use client';

import { Menu, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-4 bg-[#F4F2EC]/80 backdrop-blur-md border-b border-slate-200"
    >
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-slate-500 hover:text-slate-800 transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <p className="text-xs text-slate-500">
            Last updated: just now · Data as of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Date range selector (visual) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-100 transition-colors">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-700 font-medium">Last 30 days</span>
        </div>



        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}
          >
            {user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
