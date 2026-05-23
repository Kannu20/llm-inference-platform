'use client';
// src/components/dashboard/MetricCard.tsx

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'emerald' | 'blue' | 'red' | 'amber' | 'purple';
  loading?: boolean;
}

const COLOR_MAP = {
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  red: 'text-red-400 bg-red-500/10 border-red-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, color = 'emerald', loading }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-zinc-100 mt-1">{value}</p>
          )}
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center', COLOR_MAP[color])}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>

      {trend && (
        <div className={cn('flex items-center gap-1 mt-3 text-xs', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(trend.value).toFixed(1)}% {trend.label}</span>
        </div>
      )}
    </div>
  );
}
