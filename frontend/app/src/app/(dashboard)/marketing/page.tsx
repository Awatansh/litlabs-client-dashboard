'use client';

import { useQuery } from '@tanstack/react-query';
import { marketingApi } from '@/lib/api';
import { MetricCard, SectionHeader, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { DollarSign, MousePointerClick, Target, ArrowUpRight, Megaphone } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';

export default function MarketingPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['marketing-overview'],
    queryFn: async () => (await marketingApi.overview()).data,
  });

  const { data: campaigns } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => (await marketingApi.campaigns()).data,
  });

  if (isLoading) return <LoadingSkeleton className="h-96" />;

  const { meta_ads, google_analytics } = overview || {};
  const { trends, vs_previous_period } = meta_ads || {};
  const channelData = google_analytics?.channel_breakdown || [];

  const COLORS = ['#10B981', '#3B82F6', '#6366F1', '#F59E0B', '#94A3B8'];

  return (
    <div className="max-w-6xl fade-in-up">
      <SectionHeader
        title="Marketing Performance"
        subtitle="Your campaigns across all channels · Last 30 days"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Ad Spend"
          value={formatCurrency(meta_ads?.spend || 0)}
          change={vs_previous_period?.spend_change_pct}
          icon={<DollarSign className="w-4 h-4" />}
          iconColor="bg-amber-500/10 text-amber-400"
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(meta_ads?.impressions || 0)}
          change={vs_previous_period?.impressions_change_pct}
          icon={<Megaphone className="w-4 h-4" />}
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(meta_ads?.clicks || 0)}
          change={vs_previous_period?.clicks_change_pct}
          icon={<MousePointerClick className="w-4 h-4" />}
        />
        <MetricCard
          title="Conversions"
          value={formatNumber(meta_ads?.conversions || 0)}
          change={vs_previous_period?.conversions_change_pct}
          icon={<Target className="w-4 h-4" />}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <MetricCard
          title="Return on Spend"
          value={meta_ads?.roas ? `${meta_ads.roas}x` : 'N/A'}
          change={vs_previous_period?.roas_change_pct}
          icon={<ArrowUpRight className="w-4 h-4" />}
          iconColor="bg-emerald-100 text-emerald-600"
          valueColor="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Daily Spend</h3>
            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">30 days</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends?.spend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickFormatter={(val) => val.slice(5)} />
                <YAxis stroke="#64748B" fontSize={10} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px' }}
                  itemStyle={{ color: '#0F172A' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} name="Spend" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Traffic Channel Mix</h3>
          <div className="h-[250px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="sessions"
                  nameKey="channel"
                >
                  {channelData.map((entry: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px' }}
                  itemStyle={{ color: '#0F172A' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="ml-4 space-y-2">
              {channelData.map((ch: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, i: number) => (
                <div key={ch.channel} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600">{ch.channel}</span>
                  <span className="text-slate-400 ml-auto">{ch.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Campaign Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left pb-3 font-medium">Campaign</th>
                <th className="text-right pb-3 font-medium">Spend</th>
                <th className="text-right pb-3 font-medium">Clicks</th>
                <th className="text-right pb-3 font-medium">Conversions</th>
                <th className="text-right pb-3 font-medium">ROAS</th>
                <th className="text-center pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {campaigns?.map((c: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="py-3 text-right text-slate-600 tabular-nums">{formatCurrency(c.spend)}</td>
                  <td className="py-3 text-right text-slate-600 tabular-nums">{formatNumber(c.clicks)}</td>
                  <td className="py-3 text-right text-slate-600 tabular-nums">{formatNumber(c.conversions)}</td>
                  <td className="py-3 text-right font-semibold text-emerald-600 tabular-nums">{c.roas}x</td>
                  <td className="py-3 text-center">
                    <StatusBadge status={c.status.toLowerCase()}>{c.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
