'use client';
// src/app/dashboard/page.tsx

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  Activity, Clock, CheckCircle, XCircle, Zap, Database, BarChart3, RefreshCw,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { api } from '../../lib/api';
import { DashboardMetrics, InferenceLog } from '../../types';
import { formatMs, formatNumber, formatRelativeTime, PROVIDER_COLORS, PROVIDER_LABELS } from '../../lib/utils';
import { getSocket } from '../../lib/socket';

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: '#10b981',
  ERROR: '#ef4444',
  CANCELLED: '#f59e0b',
  STREAMING: '#3b82f6',
  PENDING: '#6b7280',
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [liveLog, setLiveLog] = useState<InferenceLog[]>([]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await api.dashboard.metrics(60);
      if (res.success && res.data) {
        setMetrics(res.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000); // refresh every 30s

    // Socket.io real-time new log events
    const socket = getSocket();
    socket.emit('join:dashboard');
    socket.on('log:new', (log: InferenceLog) => {
      setLiveLog(prev => [log, ...prev].slice(0, 50));
    });

    return () => {
      clearInterval(interval);
      socket.off('log:new');
    };
  }, [fetchMetrics]);

  // Combine live logs with historical
  const displayLogs = [...liveLog, ...(metrics?.recentLogs || [])].slice(0, 50);

  // Provider usage pie data
  const providerData = metrics
    ? Object.entries(metrics.providerUsage).map(([provider, count]) => ({
        name: PROVIDER_LABELS[provider] || provider,
        value: count,
        color: PROVIDER_COLORS[provider] || '#6b7280',
      }))
    : [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <div className="px-6 py-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Analytics Dashboard
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Last updated: {lastUpdated.toLocaleTimeString()} · 60 min window
              </p>
            </div>
            <button
              onClick={fetchMetrics}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Requests"
              value={loading ? '—' : formatNumber(metrics?.totalRequests || 0)}
              icon={Activity}
              color="emerald"
              loading={loading}
              subtitle="Last 60 minutes"
            />
            <MetricCard
              title="Avg Latency"
              value={loading ? '—' : formatMs(metrics?.avgLatencyMs || 0)}
              icon={Clock}
              color="blue"
              loading={loading}
              subtitle="Time to first byte"
            />
            <MetricCard
              title="Success Rate"
              value={loading ? '—' : `${(metrics?.successRate || 0).toFixed(1)}%`}
              icon={CheckCircle}
              color="emerald"
              loading={loading}
            />
            <MetricCard
              title="Error Rate"
              value={loading ? '—' : `${(metrics?.errorRate || 0).toFixed(1)}%`}
              icon={XCircle}
              color="red"
              loading={loading}
            />
            <MetricCard
              title="Req / Minute"
              value={loading ? '—' : (metrics?.requestsPerMinute || 0).toFixed(1)}
              icon={Zap}
              color="amber"
              loading={loading}
            />
            <MetricCard
              title="Total Tokens"
              value={loading ? '—' : formatNumber(metrics?.tokenUsage.total || 0)}
              icon={Database}
              color="purple"
              loading={loading}
              subtitle={`${formatNumber(metrics?.tokenUsage.input || 0)} in · ${formatNumber(metrics?.tokenUsage.output || 0)} out`}
            />
            <MetricCard
              title="Throughput"
              value={loading ? '—' : `${(metrics?.throughput || 0).toFixed(2)}/s`}
              icon={Activity}
              color="blue"
              loading={loading}
              subtitle="Requests per second"
            />
            <MetricCard
              title="Active Providers"
              value={loading ? '—' : Object.keys(metrics?.providerUsage || {}).length}
              icon={BarChart3}
              color="emerald"
              loading={loading}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Latency over time */}
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-zinc-300 mb-4">Latency Over Time</h3>
              {metrics?.latencyOverTime?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={metrics.latencyOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={v => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={v => `${v}ms`}
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                      labelStyle={{ color: '#a1a1aa' }}
                      formatter={(v: number) => [`${v}ms`]}
                    />
                    <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2} dot={false} name="Avg" />
                    <Line type="monotone" dataKey="p95" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="P95" />
                    <Legend
                      formatter={v => <span style={{ color: '#a1a1aa', fontSize: 11 }}>{v}</span>}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>

            {/* Provider usage */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-zinc-300 mb-4">Provider Usage</h3>
              {providerData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={providerData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {providerData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {providerData.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                          <span className="text-zinc-400">{p.name}</span>
                        </div>
                        <span className="text-zinc-300 font-medium">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyChart />
              )}
            </div>
          </div>

          {/* Token usage bar */}
          {metrics && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-medium text-zinc-300 mb-4">Token Usage by Provider</h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={providerData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {providerData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Logs table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">Recent Inference Logs</h3>
              {liveLog.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Provider', 'Model', 'Status', 'Latency', 'Tokens', 'Time', 'Preview'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-zinc-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayLogs.map(log => (
                    <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            background: `${PROVIDER_COLORS[log.provider]}20`,
                            color: PROVIDER_COLORS[log.provider],
                          }}
                        >
                          {PROVIDER_LABELS[log.provider] || log.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 font-mono">{log.model}</td>
                      <td className="px-4 py-3">
                        <span style={{ color: STATUS_COLORS[log.status] || '#6b7280' }}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {log.latencyMs ? formatMs(log.latencyMs) : '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {log.totalTokens ? formatNumber(log.totalTokens) : '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {formatRelativeTime(log.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 max-w-[200px] truncate">
                        {log.inputPreview || '—'}
                      </td>
                    </tr>
                  ))}
                  {displayLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-600 text-sm">
                        No logs yet. Start chatting to see inference data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[160px] flex items-center justify-center text-zinc-600 text-sm">
      No data yet
    </div>
  );
}
