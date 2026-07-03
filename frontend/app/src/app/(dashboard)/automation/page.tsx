'use client';

import { useQuery } from '@tanstack/react-query';
import { automationApi } from '@/lib/api';
import { MetricCard, SectionHeader, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { Zap, Clock, CheckCircle2, PlayCircle, Webhook, Activity } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export default function AutomationPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['automation-summary'],
    queryFn: async () => (await automationApi.summary()).data,
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['automation-recent'],
    queryFn: async () => (await automationApi.recent()).data,
  });

  if (summaryLoading) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="max-w-6xl fade-in-up">
      <SectionHeader
        title="AI & Automation"
        subtitle="Automated workflows running in the background · Last 30 days"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Time Saved"
          value={`${summary?.time_saved_hours || 0} hrs`}
          icon={<Clock className="w-4 h-4" />}
          iconColor="bg-blue-500/10 text-blue-400"
          valueColor="text-white"
        />
        <MetricCard
          title="Tasks Completed"
          value={summary?.tasks_completed?.toLocaleString() || '0'}
          icon={<CheckCircle2 className="w-4 h-4" />}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <MetricCard
          title="Total Workflow Runs"
          value={summary?.total_runs?.toLocaleString() || '0'}
          icon={<PlayCircle className="w-4 h-4" />}
          iconColor="bg-violet-500/10 text-violet-400"
        />
        <MetricCard
          title="Active Workflows"
          value={summary?.active_workflows || 0}
          icon={<Webhook className="w-4 h-4" />}
        />
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white">Recent Automation Runs</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium">Systems Operational</span>
          </div>
        </div>

        {recentLoading ? <LoadingSkeleton className="h-64" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-700/50">
                  <th className="text-left pb-3 font-medium">Workflow Name</th>
                  <th className="text-left pb-3 font-medium">Source</th>
                  <th className="text-center pb-3 font-medium">Tasks Executed</th>
                  <th className="text-right pb-3 font-medium">Time Saved</th>
                  <th className="text-right pb-3 font-medium">Executed At</th>
                  <th className="text-center pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {recent?.map((log: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        {log.workflow_name}
                      </div>
                    </td>
                    <td className="py-3 text-slate-400 capitalize">{log.workflow_source}</td>
                    <td className="py-3 text-center text-slate-300 tabular-nums">{log.tasks_completed}</td>
                    <td className="py-3 text-right text-emerald-400 font-medium tabular-nums">
                      +{log.time_saved_minutes} min
                    </td>
                    <td className="py-3 text-right text-slate-400 tabular-nums">{timeAgo(log.timestamp)}</td>
                    <td className="py-3 text-center">
                      <StatusBadge status={log.status === 'success' ? 'completed' : 'rejected'}>
                        {log.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {(!recent || recent.length === 0) && (
              <div className="text-center py-12 text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                <p>No automation events recorded yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
