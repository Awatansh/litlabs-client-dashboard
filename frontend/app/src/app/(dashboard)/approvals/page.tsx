'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from '@/lib/api';
import { SectionHeader, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { Check, X, AlertCircle, Clock, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import * as Toast from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals', activeTab],
    queryFn: async () => {
      const status = activeTab === 'pending' ? 'pending' : 'all';
      return (await approvalsApi.list(status)).data;
    },
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(false); // reset
    setTimeout(() => setToastOpen(true), 10);
  };

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, comment }: { id: string; action: 'approve' | 'reject' | 'request-changes'; comment?: string }) => {
      if (action === 'approve') return approvalsApi.approve(id, comment);
      if (action === 'reject') return approvalsApi.reject(id, comment || 'Rejected from dashboard');
      return approvalsApi.requestChanges(id, comment || 'Changes requested from dashboard');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      const msgs = {
        approve: 'Item approved successfully.',
        reject: 'Item rejected.',
        'request-changes': 'Changes requested.',
      };
      showToast(msgs[variables.action]);
    },
  });

  if (isLoading) return <LoadingSkeleton className="h-96" />;

  return (
    <Toast.Provider swipeDirection="right">
      <div className="max-w-4xl fade-in-up">
        <SectionHeader
          title="Review & Approvals"
          subtitle="Approve copy, creative, and strategic deliverables to keep projects moving."
        />

        <div className="flex gap-4 mb-6 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'pb-3 text-sm font-medium transition-colors border-b-2',
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            Requires Action
            {activeTab === 'pending' && approvals?.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">
                {approvals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'pb-3 text-sm font-medium transition-colors border-b-2',
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            History
          </button>
        </div>

        <div className="space-y-4">
          {approvals?.map((approval: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
            <div key={approval.id} className="glass-card p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={approval.status}>
                    {approval.status === 'pending' ? 'Needs Review' : approval.status}
                  </StatusBadge>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Requested {timeAgo(approval.created_at)}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                  {approval.type.replace('_', ' ')}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">{approval.title}</h3>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-700 mb-3">{approval.description}</p>
                {approval.deliverable_url && (
                  <a
                    href={approval.deliverable_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    View attached deliverable
                  </a>
                )}
              </div>

              {activeTab === 'pending' && (
                <div className="flex gap-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => actionMutation.mutate({ id: approval.id, action: 'approve' })}
                    disabled={actionMutation.isPending}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const comment = prompt('What needs to be changed?');
                      if (comment) actionMutation.mutate({ id: approval.id, action: 'request-changes', comment });
                    }}
                    disabled={actionMutation.isPending}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Request Changes
                  </button>
                  <button
                    onClick={() => {
                      const comment = prompt('Reason for rejection?');
                      if (comment) actionMutation.mutate({ id: approval.id, action: 'reject', comment });
                    }}
                    disabled={actionMutation.isPending}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

              {activeTab === 'history' && approval.reviewer_comments && (
                <div className="flex items-start gap-2 mt-3 p-3 bg-slate-100 rounded-lg text-sm">
                  <MessageSquare className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 mr-2">Your comment:</span>
                    <span className="text-slate-700">{approval.reviewer_comments}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {(!approvals || approvals.length === 0) && (
            <div className="glass-card p-12 text-center text-slate-500">
              <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-slate-900 mb-1">All caught up!</p>
              <p>You have no pending approvals right now.</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      <Toast.Root
        open={toastOpen}
        onOpenChange={setToastOpen}
        className="bg-white border border-slate-200 rounded-xl p-4 shadow-xl shadow-slate-200/50 grid grid-cols-[auto_max-content] items-center gap-x-4 data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipeOut"
      >
        <Toast.Title className="text-sm font-medium text-slate-900 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">✓</div>
          {toastMsg}
        </Toast.Title>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-0 right-0 p-6 flex flex-col gap-2 w-96 max-w-[100vw] m-0 list-none z-[100] outline-none" />
    </Toast.Provider>
  );
}
