'use client';

import { useQuery } from '@tanstack/react-query';
import { overviewApi, marketingApi, notificationsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard, ProgressBar, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { Users, TrendingUp, Zap, Clock, Activity } from 'lucide-react';
import Link from 'next/link';

export default function OverviewPage() {
  const { user } = useAuth();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: async () => (await overviewApi.get()).data,
  });

  const { data: marketing, isLoading: marketingLoading } = useQuery({
    queryKey: ['marketing-overview'],
    queryFn: async () => (await marketingApi.overview()).data,
  });

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationsApi.list()).data,
  });

  if (overviewLoading || marketingLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
        </div>
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  const { meta_ads, google_analytics } = marketing || {};
  const pendingApprovals = overview?.pending_approvals || 0;

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-slate-500">Here&apos;s your business growth snapshot for the last 30 days.</p>
      </div>

      {pendingApprovals > 0 && (
        <div className="mb-6 glass-card p-4 rounded-2xl border border-amber-200 bg-amber-50 fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-600">⚠️</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{pendingApprovals} item(s) need your attention</p>
              <p className="text-xs text-amber-700/80">Work is waiting for your approval to proceed.</p>
            </div>
            <Link
              href="/approvals"
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-all"
            >
              Review Now →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 fade-in-up">
        <MetricCard
          title="Website Visitors"
          value={google_analytics?.sessions?.toLocaleString() || '0'}
          change={google_analytics?.vs_previous?.sessions_change_pct}
          icon={<Users className="w-4 h-4" />}
          iconColor="bg-blue-500/10 text-blue-400"
        />
        <MetricCard
          title="New Leads"
          value={meta_ads?.leads?.toLocaleString() || '0'}
          change={meta_ads?.vs_previous_period?.conversions_change_pct}
          icon={<TrendingUp className="w-4 h-4" />}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <MetricCard
          title="Return on Ad Spend"
          value={meta_ads?.roas ? `${meta_ads.roas}x` : 'N/A'}
          change={meta_ads?.vs_previous_period?.roas_change_pct}
          icon={<Activity className="w-4 h-4" />}
          iconColor="bg-indigo-500/10 text-indigo-400"
        />
        <MetricCard
          title="Saved by AI"
          value={`${overview?.time_saved_hours || 0} hrs`}
          subtitle="This month across all workflows"
          icon={<Zap className="w-4 h-4" />}
          iconColor="bg-violet-500/10 text-violet-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 glass-card p-6 fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-900">Active Projects</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:text-blue-500">View all →</Link>
          </div>
          <div className="space-y-5">
            {overview?.projects?.slice(0, 4).map((p: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
              <div key={p.id}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-800 font-medium">{p.name}</span>
                  <span className="text-slate-500">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} />
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={p.status}>{p.status === 'active' ? 'On Track' : p.status}</StatusBadge>
                </div>
              </div>
            ))}
            {(!overview?.projects || overview.projects.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">No active projects right now.</p>
            )}
          </div>
        </div>

        <div className="glass-card p-6 fade-in-up" style={{ animationDelay: '200ms' }}>
          <h3 className="font-semibold text-slate-900 mb-5">Recent Activity</h3>
          <div className="space-y-4">
            {notifs?.slice(0, 5).map((n: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
              <div key={n.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{n.message}</p>
                </div>
              </div>
            ))}
            {(!notifs || notifs.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
