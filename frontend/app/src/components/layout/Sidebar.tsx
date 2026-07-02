'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, TrendingUp, Search, Zap,
  FolderKanban, CheckCircle, FileText, BarChart3,
  Bell, LogOut, X
} from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Performance', items: [
    { href: '/marketing', label: 'Marketing', icon: TrendingUp },
    { href: '/seo', label: 'SEO & Organic', icon: Search },
    { href: '/automation', label: 'AI Automation', icon: Zap },
  ]},
  { section: 'Work', items: [
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/approvals', label: 'Approvals', icon: CheckCircle, badge: 2 },
    { href: '/deliverables', label: 'Deliverables', icon: FileText },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
  ]},
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full w-64 flex flex-col p-4 z-50 transition-transform duration-300',
        'border-r border-slate-800/60',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
      style={{ background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)' }}
    >
      {/* Close button (mobile) */}
      <button
        className="absolute top-4 right-4 md:hidden text-slate-500 hover:text-slate-300"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold text-white">LitLabs</div>
          <div className="text-xs text-slate-500">Client Portal</div>
        </div>
      </div>

      {/* Client badge */}
      <div className="mb-6 px-1">
        <div className="glass-card p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
              {user?.full_name?.[0] ?? 'B'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">Bright Future Wellness</div>
              <div className="text-xs text-slate-500">Growth Partner Plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="text-xs text-slate-500 uppercase font-semibold px-3 mb-1 tracking-wider">
              {section.section}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'nav-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium w-full',
                      isActive ? 'active text-blue-400' : 'text-slate-400 hover:text-slate-200',
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.full_name ?? 'User'}</div>
            <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
