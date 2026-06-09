'use client';

import React, { useEffect, useState } from 'react';
import type { Project, ProjectCounts } from '@/types';
import CommentSection from '@/components/CommentSection';

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

interface StatusAction {
  label: string;
  newStatus: string;
  color: string;
}

function getStatusActions(status: string): StatusAction[] {
  switch (status) {
    case 'idea':
      return [{ label: '▶ START', newStatus: 'building', color: '#3fb950' }];
    case 'building':
      return [
        { label: '✅ RELEASE', newStatus: 'released', color: '#58a6ff' },
        { label: '🔴 BLOCK', newStatus: 'blocked', color: '#f85149' },
        { label: '⏸ PAUSE', newStatus: 'paused', color: '#e3b341' },
      ];
    case 'blocked':
      return [{ label: '▶ UNBLOCK', newStatus: 'building', color: '#3fb950' }];
    case 'paused':
      return [
        { label: '▶ RESUME', newStatus: 'building', color: '#3fb950' },
        { label: '✅ RELEASE', newStatus: 'released', color: '#58a6ff' },
      ];
    case 'released':
      return [];
    default:
      return [];
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<ProjectCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<Record<number, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});

  const fetchProjects = () => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects || []);
        setCounts(d.counts || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setChanging((prev) => ({ ...prev, [id]: true }));
    try {
      const r = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (r.ok) {
        const data = await r.json();
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? data.project : p))
        );
        // Recalculate counts
        setCounts((prev) => {
          if (!prev) return prev;
          const updated = projects.map((p) => (p.id === id ? { ...p, status: newStatus as Project['status'] } : p));
          return {
            building: updated.filter((p) => p.status === 'building').length,
            blocked: updated.filter((p) => p.status === 'blocked').length,
            idea: updated.filter((p) => p.status === 'idea').length,
            paused: updated.filter((p) => p.status === 'paused').length,
            released: updated.filter((p) => p.status === 'released').length,
          };
        });
      }
    } finally {
      setChanging((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return <div className="p-6" style={{ color: '#8b949e' }}>Loading project radar...</div>;
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6 pb-4 border-b" style={{ borderColor: '#30363d' }}>
        <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>PROJECT RADAR</h1>
        <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
          All active builds, ideas, and blockers — click actions to update status
        </p>
      </div>

      {/* Status Counts */}
      {counts && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {(
            [
              ['Building', 'building', counts.building],
              ['Blocked', 'blocked', counts.blocked],
              ['Idea', 'idea', counts.idea],
              ['Paused', 'paused', counts.paused],
              ['Released', 'released', counts.released],
            ] as [string, string, number][]
          ).map(([label, key, count]) => (
            <div
              key={key}
              className="p-3 rounded border text-center"
              style={{ backgroundColor: '#161b22', borderColor: STATUS_COLORS[key] + '44' }}
            >
              <div className="text-2xl font-bold" style={{ color: STATUS_COLORS[key] }}>
                {count}
              </div>
              <div className="text-xs font-medium uppercase mt-1" style={{ color: '#8b949e' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects Table */}
      <div className="rounded border overflow-hidden" style={{ borderColor: '#30363d' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#161b22', color: '#8b949e' }}>
              <th className="text-left px-4 py-3 font-medium">Project</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Next Action / Blocker</th>
              <th className="text-left px-4 py-3 font-medium">Owner</th>
              <th className="text-left px-4 py-3 font-medium">Priority</th>
              <th className="text-left px-4 py-3 font-medium">Updated</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: '#58a6ff' }}>Actions</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: '#8b949e' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const actions = getStatusActions(p.status || 'idea');
              const busy = changing[p.id];
              return (
                <React.Fragment key={p.id}>
                <tr
                  style={{
                    backgroundColor: p.status === 'blocked'
                      ? 'rgba(248,81,73,0.07)'
                      : i % 2 === 0 ? '#161b22' : '#0d1117',
                    borderTop: '1px solid #30363d',
                    opacity: busy ? 0.7 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: '#e6edf3' }}>
                        {p.projectName}
                      </span>
                      {p.decisionNeeded ? <span className="text-sm">🔴</span> : null}
                    </div>
                    {p.category && (
                      <div className="text-xs mt-0.5" style={{ color: '#8b949e' }}>
                        {p.category}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                      style={{
                        backgroundColor: `${STATUS_COLORS[p.status || 'idea']}22`,
                        color: STATUS_COLORS[p.status || 'idea'],
                        border: `1px solid ${STATUS_COLORS[p.status || 'idea']}44`,
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {p.blocker ? (
                      <div>
                        <div className="text-xs font-bold mb-0.5" style={{ color: '#f85149' }}>
                          ⚠ BLOCKER
                        </div>
                        <div className="text-xs" style={{ color: '#f85149' }}>
                          {p.blocker}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: '#8b949e' }}>
                        {p.nextAction || '—'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ backgroundColor: '#0d1117', color: '#58a6ff', border: '1px solid #30363d' }}
                    >
                      {p.owner || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold uppercase"
                      style={{ color: PRIORITY_COLORS[p.priority || 'low'] }}
                    >
                      {p.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>
                    {p.lastUpdated || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'released' ? (
                      <span className="text-xs" style={{ color: '#58a6ff' }}>— shipped</span>
                    ) : actions.length === 0 ? null : (
                      <div className="flex flex-wrap gap-1">
                        {actions.map((a) => (
                          <button
                            key={a.newStatus}
                            onClick={() => handleStatusChange(p.id, a.newStatus)}
                            disabled={busy}
                            className="text-xs font-bold px-2 py-1 rounded transition-all"
                            style={{
                              backgroundColor: `${a.color}18`,
                              color: a.color,
                              border: `1px solid ${a.color}44`,
                              cursor: busy ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {busy ? '...' : a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setOpenComments((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                      className="text-xs transition-all"
                      style={{ color: openComments[p.id] ? '#58a6ff' : '#8b949e' }}
                    >
                      💬 {openComments[p.id] ? 'close' : 'notes'}
                    </button>
                  </td>
                </tr>
                {openComments[p.id] && (
                  <tr style={{ backgroundColor: '#0d1117', borderTop: '1px solid #21262d' }}>
                    <td colSpan={8} className="px-6 py-3">
                      <CommentSection
                        entityType="project"
                        entityId={p.id}
                        collapsible={false}
                        label={`Notes — ${p.projectName}`}
                        placeholder="Add project notes, decisions, or blockers..."
                      />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
