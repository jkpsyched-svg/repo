'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CommentSection from '@/components/CommentSection';

interface DashboardData {
  stats: {
    pendingDecisions: number;
    unresolvedAlerts: number;
    monthlyBurn: number;
  };
  criticalDecisions: Array<{
    id: number;
    title: string;
    deadline: string | null;
    status: string;
    priority: string;
  }>;
  criticalAlerts: Array<{
    id: number;
    alert_type: string;
    message: string;
    urgency: string;
    source: string | null;
  }>;
  projects: Array<{
    id: number;
    project_name: string;
    status: string;
    next_action: string | null;
    blocker: string | null;
    priority: string;
    decision_needed: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  building: '#3fb950',
  blocked: '#f85149',
  idea: '#8b949e',
  paused: '#e3b341',
  released: '#58a6ff',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#f85149',
  high: '#e3b341',
  medium: '#58a6ff',
  low: '#8b949e',
};

const TOP3_ACTIONS = [
  'SHIP: CEO spot-check JRizz M1 "Neon Pulse" (QA 91+) → submit to Amuse Pro → FIRST REVENUE',
  'DECIDE: Post-freeze priority order — freeze ends 2026-06-10 (5 days). B1-B8 backlog activation.',
  'CANCEL: Typecast AI before 8/26 renewal ($347.88/yr). Veo Omni superseded it — save $347.',
];

const WHAT_TO_IGNORE = [
  'Make.com DM scenario rebuild (DEFER post-6/8)',
  'AEGIS PQC pitch module (DEFER post-freeze)',
  'Agent Command Center (blocked until Promptfoo 6/11)',
  '4 artist placeholder sites (wait for music releases)',
  'Mobile app planning (no mobile build phase yet)',
];

export default function CommandBriefPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedAlerts, setResolvedAlerts] = useState<Set<number>>(new Set());
  const [resolvingAlert, setResolvingAlert] = useState<number | null>(null);
  const [doneActions, setDoneActions] = useState<Set<number>>(new Set());
  const [skippedActions, setSkippedActions] = useState<Set<number>>(new Set());
  const [projectChanging, setProjectChanging] = useState<Record<number, boolean>>({});

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleResolveAlert = async (id: number) => {
    setResolvingAlert(id);
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'resolve' }),
      });
      setResolvedAlerts((prev) => { const next = new Set(prev); next.add(id); return next; });
    } finally {
      setResolvingAlert(null);
    }
  };

  const handleProjectStatus = async (id: number, newStatus: string) => {
    setProjectChanging((prev) => ({ ...prev, [id]: true }));
    try {
      await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          projects: prev.projects.map((p) =>
            p.id === id ? { ...p, status: newStatus } : p
          ),
        };
      });
    } finally {
      setProjectChanging((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleAction = (i: number, type: 'done' | 'skip') => {
    const setter = type === 'done' ? setDoneActions : setSkippedActions;
    const other = type === 'done' ? setSkippedActions : setDoneActions;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else {
        next.add(i);
        other((o) => { const on = new Set(o); on.delete(i); return on; });
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ color: '#8b949e' }}>
        Loading command brief...
      </div>
    );
  }

  const visibleAlerts = (data?.criticalAlerts || []).filter((a) => !resolvedAlerts.has(a.id));

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: '#30363d' }}>
        <div className="flex items-center gap-3 mb-1">
          <span
            className="text-xs font-bold tracking-widest uppercase px-2 py-1 rounded"
            style={{ backgroundColor: '#d29922', color: '#0d1117' }}
          >
            LIVE
          </span>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#e6edf3' }}>
            JKRLZ COMMAND BRIEF
          </h1>
        </div>
        <p className="text-sm" style={{ color: '#8b949e' }}>
          {today}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Pending Decisions"
          value={data?.stats.pendingDecisions ?? 0}
          accent="#e3b341"
          href="/decisions"
        />
        <StatCard
          label="Active Alerts"
          value={data?.stats.unresolvedAlerts ?? 0}
          accent="#f85149"
          href="/alerts"
        />
        <StatCard
          label="Monthly Burn"
          value={`$${(data?.stats.monthlyBurn ?? 0).toFixed(0)}/mo`}
          accent="#58a6ff"
          href="/money"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Critical Items */}
        <div>
          <SectionHeader title="CRITICAL ITEMS" accent="#f85149" />
          <div className="space-y-2">
            {(data?.criticalDecisions || []).length === 0 && visibleAlerts.length === 0 && (
              <div
                className="p-3 rounded text-sm"
                style={{ backgroundColor: '#161b22', color: '#8b949e' }}
              >
                No critical items. All clear.
              </div>
            )}

            {/* Critical Decisions */}
            {(data?.criticalDecisions || []).map((d) => (
              <div
                key={`dec-${d.id}`}
                className="p-3 rounded border-l-4"
                style={{
                  backgroundColor: '#161b22',
                  borderLeftColor: '#f85149',
                  borderTop: '1px solid #30363d',
                  borderRight: '1px solid #30363d',
                  borderBottom: '1px solid #30363d',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: '#f85149', color: '#fff' }}
                      >
                        DECISION
                      </span>
                      {d.deadline && (
                        <span className="text-xs" style={{ color: '#e3b341' }}>
                          Due: {d.deadline}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium" style={{ color: '#e6edf3' }}>
                      {d.title}
                    </div>
                  </div>
                  <Link
                    href="/decisions"
                    className="text-xs font-bold px-2 py-1 rounded flex-shrink-0"
                    style={{
                      backgroundColor: 'rgba(227,179,65,0.15)',
                      color: '#e3b341',
                      border: '1px solid rgba(227,179,65,0.3)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    → Decide
                  </Link>
                </div>
              </div>
            ))}

            {/* Critical Alerts */}
            {visibleAlerts.map((a) => (
              <div
                key={`alert-${a.id}`}
                className="p-3 rounded border-l-4"
                style={{
                  backgroundColor: '#161b22',
                  borderLeftColor: '#f85149',
                  borderTop: '1px solid #30363d',
                  borderRight: '1px solid #30363d',
                  borderBottom: '1px solid #30363d',
                  opacity: resolvingAlert === a.id ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: '#f85149', color: '#fff' }}
                      >
                        ALERT
                      </span>
                      <span className="text-xs" style={{ color: '#8b949e' }}>
                        {a.alert_type}
                      </span>
                    </div>
                    <div className="text-sm" style={{ color: '#e6edf3' }}>
                      {a.message}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(a.id)}
                    disabled={resolvingAlert === a.id}
                    className="text-xs font-bold px-2 py-1 rounded flex-shrink-0 transition-all"
                    style={{
                      backgroundColor: 'rgba(63,185,80,0.15)',
                      color: '#3fb950',
                      border: '1px solid rgba(63,185,80,0.3)',
                      cursor: resolvingAlert === a.id ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {resolvingAlert === a.id ? '...' : '✓ Resolve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 3 Actions */}
        <div>
          <SectionHeader title="TOP 3 ACTIONS TODAY" accent="#d29922" />
          <div className="space-y-2">
            {TOP3_ACTIONS.map((action, i) => {
              const done = doneActions.has(i);
              const skipped = skippedActions.has(i);
              return (
                <div
                  key={i}
                  className="p-3 rounded"
                  style={{
                    backgroundColor: done ? 'rgba(63,185,80,0.08)' : skipped ? 'rgba(139,148,158,0.08)' : '#161b22',
                    border: `1px solid ${done ? 'rgba(63,185,80,0.25)' : skipped ? '#30363d' : '#30363d'}`,
                    opacity: skipped ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="text-lg font-bold flex-shrink-0"
                      style={{
                        color: done ? '#3fb950' : skipped ? '#8b949e' : '#d29922',
                        lineHeight: '1.4',
                      }}
                    >
                      {done ? '✓' : skipped ? '—' : i + 1}
                    </span>
                    <span
                      className="text-sm flex-1"
                      style={{
                        color: done ? '#3fb950' : skipped ? '#8b949e' : '#e6edf3',
                        textDecoration: skipped ? 'line-through' : 'none',
                      }}
                    >
                      {action}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleAction(i, 'done')}
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: done ? 'rgba(63,185,80,0.25)' : 'rgba(63,185,80,0.1)',
                          color: '#3fb950',
                          border: '1px solid rgba(63,185,80,0.3)',
                        }}
                        title="Mark done"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => toggleAction(i, 'skip')}
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: skipped ? 'rgba(139,148,158,0.2)' : 'rgba(139,148,158,0.08)',
                          color: '#8b949e',
                          border: '1px solid #30363d',
                        }}
                        title="Skip today"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Project Status Quick View */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="PROJECT STATUS" accent="#58a6ff" />
          <Link
            href="/projects"
            className="text-xs"
            style={{ color: '#58a6ff', textDecoration: 'none' }}
          >
            View all →
          </Link>
        </div>
        <div className="rounded border overflow-hidden" style={{ borderColor: '#30363d' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#161b22', color: '#8b949e' }}>
                <th className="text-left px-4 py-2 font-medium">Project</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Next Action</th>
                <th className="text-left px-4 py-2 font-medium">Priority</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: '#58a6ff' }}>Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.projects || []).map((p, i) => {
                const busy = projectChanging[p.id];
                // Simple quick action: blocked→unblock, idea→start, building→none (go to projects page)
                const quickAction =
                  p.status === 'blocked'
                    ? { label: '▶ Unblock', newStatus: 'building', color: '#3fb950' }
                    : p.status === 'idea'
                    ? { label: '▶ Start', newStatus: 'building', color: '#3fb950' }
                    : null;

                return (
                  <tr
                    key={p.id}
                    style={{
                      backgroundColor: p.status === 'blocked'
                        ? 'rgba(248,81,73,0.07)'
                        : i % 2 === 0 ? '#161b22' : '#0d1117',
                      borderTop: '1px solid #30363d',
                      opacity: busy ? 0.7 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: '#e6edf3' }}>
                      {p.project_name}
                      {p.decision_needed ? (
                        <span className="ml-2 text-xs">🔴</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                        style={{
                          backgroundColor: `${STATUS_COLORS[p.status] || '#8b949e'}22`,
                          color: STATUS_COLORS[p.status] || '#8b949e',
                          border: `1px solid ${STATUS_COLORS[p.status] || '#8b949e'}44`,
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-xs max-w-xs truncate"
                      style={{ color: p.blocker ? '#f85149' : '#8b949e' }}
                      title={p.blocker || p.next_action || ''}
                    >
                      {p.blocker ? `⚠ ${p.blocker}` : p.next_action || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold uppercase"
                        style={{ color: PRIORITY_COLORS[p.priority] || '#8b949e' }}
                      >
                        {p.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {quickAction ? (
                        <button
                          onClick={() => handleProjectStatus(p.id, quickAction.newStatus)}
                          disabled={busy}
                          className="text-xs font-bold px-2 py-1 rounded transition-all"
                          style={{
                            backgroundColor: `${quickAction.color}18`,
                            color: quickAction.color,
                            border: `1px solid ${quickAction.color}44`,
                            cursor: busy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {busy ? '...' : quickAction.label}
                        </button>
                      ) : (
                        <Link
                          href="/projects"
                          className="text-xs"
                          style={{ color: '#8b949e', textDecoration: 'none' }}
                        >
                          → Details
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CEO Command Notes */}
      <div className="mb-6">
        <SectionHeader title="CEO COMMAND NOTES" accent="#58a6ff" />
        <div
          className="p-4 rounded border"
          style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
        >
          <CommentSection
            entityType="dashboard"
            entityId={null}
            collapsible={false}
            label="Quick Notes"
            placeholder="Type a note, directive, or observation for today..."
          />
        </div>
      </div>

      {/* What To Ignore */}
      <div>
        <SectionHeader title="WHAT TO IGNORE TODAY" accent="#8b949e" />
        <div
          className="p-4 rounded border"
          style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
        >
          <div className="flex flex-wrap gap-2">
            {WHAT_TO_IGNORE.map((item, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: '#0d1117',
                  color: '#8b949e',
                  border: '1px solid #30363d',
                }}
              >
                ✗ {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  accent: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div
        className="p-4 rounded border cursor-pointer transition-all"
        style={{
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#8b949e' }}>
          {label}
        </div>
        <div className="text-3xl font-bold" style={{ color: accent }}>
          {value}
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#8b949e' }}>
        {title}
      </h2>
    </div>
  );
}
