'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { LoadingSkeleton, ProgressBar, SectionHeader, StatusBadge } from '@/components/ui';
import { CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data: project, isLoading } = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['project', projectId],
    queryFn: async () => (await projectsApi.get(projectId!)).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-12 w-72" />
        <LoadingSkeleton className="h-48" />
        <LoadingSkeleton className="h-72" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="glass-card p-10 text-center text-slate-500">
        <p className="text-lg font-medium text-slate-900 mb-1">Project not found</p>
        <p>The requested project is unavailable for this client.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl fade-in-up">
      <SectionHeader
        title={project.name}
        subtitle={project.description || 'Project details, milestones, and delivery status.'}
      />

      <div className="glass-card p-6 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <StatusBadge status={project.status}>
              {project.status === 'active' ? 'On Track' : project.status}
            </StatusBadge>
            <div className="text-sm text-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4" />
                <span>
                  {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}
                  {' '}to{' '}
                  {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Overall Progress</span>
              <span className="font-semibold text-slate-900">{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-5">Milestones</h3>

        {project.milestones?.length ? (
          <div className="space-y-4">
            {project.milestones.map((milestone: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
              const isDone = milestone.status === 'completed';

              return (
                <div
                  key={milestone.id}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className={`mt-0.5 rounded-full p-2 ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{milestone.title}</p>
                        <p className="text-sm text-slate-600">
                          Due {new Date(milestone.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={milestone.status}>{milestone.status}</StatusBadge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No milestones are available for this project yet.</p>
        )}
      </div>
    </div>
  );
}
