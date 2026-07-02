'use client';

import { useQuery } from '@tanstack/react-query';
import { seoApi } from '@/lib/api';
import { MetricCard, SectionHeader, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { MousePointerClick, Eye, Search, BarChart2 } from 'lucide-react';
import { formatNumber, getChangeColor, getChangeArrow } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export default function SEOPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['seo-overview'],
    queryFn: async () => (await seoApi.overview()).data,
  });

  const { data: keywords, isLoading: kwLoading } = useQuery({
    queryKey: ['seo-keywords'],
    queryFn: async () => (await seoApi.keywords()).data,
  });

  const { data: topPages, isLoading: tpLoading } = useQuery({
    queryKey: ['seo-top-pages'],
    queryFn: async () => (await seoApi.topPages()).data,
  });

  if (overviewLoading) return <LoadingSkeleton className="h-96" />;

  const { metrics, vs_previous_period } = overview || {};
  const chartData = metrics?.daily_clicks || [];

  return (
    <div className="max-w-6xl fade-in-up">
      <SectionHeader
        title="SEO & Organic Performance"
        subtitle="Search visibility and organic traffic · Last 30 days"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Organic Clicks"
          value={formatNumber(metrics?.clicks || 0)}
          change={vs_previous_period?.clicks_change_pct}
          icon={<MousePointerClick className="w-4 h-4" />}
          iconColor="bg-blue-500/10 text-blue-400"
        />
        <MetricCard
          title="Total Impressions"
          value={formatNumber(metrics?.impressions || 0)}
          change={vs_previous_period?.impressions_change_pct}
          icon={<Eye className="w-4 h-4" />}
          iconColor="bg-violet-500/10 text-violet-400"
        />
        <MetricCard
          title="Average CTR"
          value={`${(metrics?.avg_ctr || 0).toFixed(1)}%`}
          change={vs_previous_period?.ctr_change_pct}
          icon={<BarChart2 className="w-4 h-4" />}
        />
        <MetricCard
          title="Avg. Position"
          value={(metrics?.avg_position || 0).toFixed(1)}
          change={vs_previous_period?.position_change_pct}
          icon={<Search className="w-4 h-4" />}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
      </div>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-sm">Organic Clicks Trend</h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">30 days</span>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" vertical={false} />
              <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickFormatter={(val) => val.slice(5)} />
              <YAxis stroke="#64748B" fontSize={10} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#E2E8F0' }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Top Keywords</h3>
          {kwLoading ? <LoadingSkeleton className="h-64" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-700/50">
                    <th className="text-left pb-2 font-medium">Keyword</th>
                    <th className="text-right pb-2 font-medium">Pos</th>
                    <th className="text-right pb-2 font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {keywords?.slice(0, 10).map((kw: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-medium text-slate-200">{kw.keyword}</td>
                      <td className="py-2.5 text-right text-slate-300">
                        <div className="flex items-center justify-end gap-1.5">
                          {kw.position}
                          {kw.position_change !== undefined && (
                            <span className={`text-[10px] font-bold ${getChangeColor(-kw.position_change)}`}>
                              {getChangeArrow(-kw.position_change)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-slate-400 tabular-nums">{formatNumber(kw.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Top Pages</h3>
          {tpLoading ? <LoadingSkeleton className="h-64" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-700/50">
                    <th className="text-left pb-2 font-medium">Page Path</th>
                    <th className="text-right pb-2 font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {topPages?.slice(0, 10).map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-medium text-blue-400 truncate max-w-[200px]" title={p.page}>
                        {p.page.replace('https://www.brightfuturewellness.com', '')}
                      </td>
                      <td className="py-2.5 text-right text-slate-300 tabular-nums">{formatNumber(p.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
