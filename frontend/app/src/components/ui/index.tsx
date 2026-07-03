import { cn, getChangeArrow } from '@/lib/utils';
import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  className?: string;
  valueColor?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  subtitle,
  icon,
  iconColor = 'bg-blue-500/10 text-blue-400',
  className,
  valueColor,
}: MetricCardProps) {
  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={cn('p-2 rounded-xl', iconColor)}>
            {icon}
          </div>
        )}
        {change !== undefined && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded-lg',
              change > 0 ? 'text-emerald-400 bg-emerald-400/10' :
              change < 0 ? 'text-red-400 bg-red-400/10' :
              'text-slate-400 bg-slate-400/10',
            )}
          >
            {getChangeArrow(change)} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className={cn('text-2xl font-bold mb-0.5 tabular-nums', valueColor ?? 'text-white')}>
        {value}
      </div>
      <div className="text-sm text-slate-400">{title}</div>
      {(subtitle || changeLabel) && (
        <div className="text-xs text-slate-500 mt-1">{subtitle ?? changeLabel}</div>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  className?: string;
  color?: string;
}

export function ProgressBar({ value, className, color = 'from-blue-500 to-indigo-500' }: ProgressBarProps) {
  return (
    <div className={cn('progress-bar', className)}>
      <div
        className={cn('progress-fill bg-gradient-to-r', color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'at_risk' | 'pending' | 'completed' | 'approved' | 'rejected' | string;
  children: ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const cls = {
    active: 'badge-active',
    approved: 'badge-active',
    at_risk: 'badge-risk',
    awaiting: 'badge-risk',
    pending: 'badge-pending',
    pending_review: 'badge-pending',
    completed: 'badge-done',
    rejected: 'text-red-400 bg-red-400/10 border border-red-400/30',
  }[status] ?? 'badge-done';

  return (
    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', cls)}>
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-slate-800 rounded-xl', className)} />
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="glass-card p-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-slate-400 text-sm">{description}</p>}
    </div>
  );
}
