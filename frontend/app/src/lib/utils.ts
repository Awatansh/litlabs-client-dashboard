import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getChangeColor(change: number) {
  if (change > 0) return 'text-emerald-400';
  if (change < 0) return 'text-red-400';
  return 'text-slate-400';
}

export function getChangeArrow(change: number) {
  if (change > 0) return '↑';
  if (change < 0) return '↓';
  return '—';
}

export function timeAgo(dateStr: string): string {
  // SQLite may return naive ISO strings. If it lacks a timezone offset, append 'Z' to treat as UTC.
  let parsedStr = dateStr;
  if (!parsedStr.endsWith('Z') && !parsedStr.match(/[+-]\d{2}:?\d{2}$/)) {
    parsedStr += 'Z';
  }
  const date = new Date(parsedStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
