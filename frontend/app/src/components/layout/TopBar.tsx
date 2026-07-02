'use client';

import { Bell, Menu, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuth();

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const resp = await notificationsApi.unreadCount();
      return resp.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const unreadCount = notifData?.count ?? 0;

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-4"
      style={{
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(51,65,85,0.4)',
      }}
    >
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-slate-400 hover:text-white transition-colors"
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
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 cursor-pointer hover:border-slate-600 transition-colors">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Last 30 days</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

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
