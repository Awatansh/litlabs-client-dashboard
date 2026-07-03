'use client';

import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { SectionHeader, LoadingSkeleton, ProgressBar, StatusBadge } from '@/components/ui';
import { Calendar, ListTodo, MoreVertical } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import Link from 'next/link';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await projectsApi.list()).data,
  });

  if (isLoading) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="max-w-6xl fade-in-up">
      <SectionHeader
        title="Active Projects"
        subtitle="Track progress, milestones, and status of all ongoing work."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects?.map((project: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
          <div key={project.id} className="glass-card p-6 relative group">
            <button className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all">
              <MoreVertical className="w-5 h-5" />
            </button>

            <div className="mb-4 pr-8">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={project.status}>{project.status === 'active' ? 'On Track' : project.status}</StatusBadge>
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                <Link href={`/projects/${project.id}`} className="hover:text-blue-600 transition-colors">
                  {project.name}
                </Link>
              </h3>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{project.description}</p>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-medium">Overall Progress</span>
                <span className="font-bold text-slate-900">{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} color="from-blue-500 to-indigo-500" />
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'} -{' '}
                  {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ListTodo className="w-4 h-4" />
                <span>Last updated {timeAgo(project.start_date || new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!projects || projects.length === 0) && (
        <div className="glass-card p-12 text-center text-slate-500">
          <p>No active projects found.</p>
        </div>
      )}
    </div>
  );
}
