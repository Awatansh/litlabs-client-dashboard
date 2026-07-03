'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SectionHeader, EmptyState, LoadingSkeleton } from '@/components/ui';
import { BarChart3, CalendarDays, FileDown } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useState } from 'react';

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const resp = await api.get('/api/reports');
      return resp.data;
    },
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const { data } = await api.post('/api/reports/generate?report_type=monthly');
      alert(data.message); // "Report generation started..."
    } catch {
      alert('Failed to generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="max-w-5xl fade-in-up">
      <SectionHeader
        title="Performance Reports"
        subtitle="Downloadable PDF reports summarizing your results."
        action={
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Generate New Report
              </>
            )}
          </button>
        }
      />

      <div className="glass-card overflow-hidden">
        {reports?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 text-xs text-slate-400 border-b border-slate-700/50">
                <th className="text-left p-4 font-medium">Report Name</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Date Generated</th>
                <th className="text-right p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {reports.map((report: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-200 font-medium">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      {report.name}
                    </div>
                  </td>
                  <td className="p-4 text-slate-400 uppercase text-xs font-semibold">{report.type}</td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {timeAgo(report.created_at)}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-400 hover:text-blue-300 font-medium text-xs bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors">
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={<BarChart3 className="w-12 h-12 mx-auto text-slate-600" />}
            title="No reports generated"
            description="Click 'Generate New Report' to create a comprehensive PDF summary of your current performance metrics."
          />
        )}
      </div>
    </div>
  );
}
