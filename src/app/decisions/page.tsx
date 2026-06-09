'use client';

import { useEffect, useState } from 'react';
import type { Decision } from '@/types';
import CommentSection from '@/components/CommentSection';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#f85149',
  high: '#e3b341',
  medium: '#58a6ff',
  low: '#8b949e',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#e3b341',
  decided: '#3fb950',
  blocked: '#8b949e',
};

const FINAL_DECISION_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  'APPROVED': { bg: 'rgba(63,185,80,0.15)', color: '#3fb950', label: '✅ APPROVED' },
  'DECLINED': { bg: 'rgba(248,81,73,0.15)', color: '#f85149', label: '❌ DECLINED' },
  'DEFERRED': { bg: 'rgba(139,148,158,0.15)', color: '#8b949e', label: '⏸ DEFERRED' },
};

type FilterType = 'all' | 'critical' | 'high' | 'medium' | 'low';

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [acting, setActing] = useState<number | null>(null);

  const fetchDecisions = () => {
    fetch('/api/decisions')
      .then((r) => r.json())
      .then((d) => {
        setDecisions(d.decisions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchDecisions(); }, []);

  const filtered = filter === 'all'
    ? decisions
    : decisions.filter((d) => d.priority === filter);

  const pending = decisions.filter((d) => d.status === 'pending').length;

  const handleAction = async (id: number, action: 'APPROVED' | 'DECLINED' | 'DEFERRED') => {
    setActing(id);
    try {
      const status = action === 'DEFERRED' ? 'blocked' : 'decided';
      await fetch('/api/decisions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, finalDecision: action }),
      });
      fetchDecisions();
    } finally {
      setActing(null);
    }
  };

  const getFinalDecisionStyle = (fd: string | null) => {
    if (!fd) return null;
    const key = Object.keys(FINAL_DECISION_STYLES).find((k) => fd.startsWith(k));
    return key ? FINAL_DECISION_STYLES[key] : null;
  };

  if (loading) {
    return <div className="p-6" style={{ color: '#8b949e' }}>Loading decision inbox...</div>;
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 pb-4 border-b" style={{ borderColor: '#30363d' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>DECISION INBOX</h1>
          {pending > 0 && (
            <span
              className="text-sm font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(227,179,65,0.2)', color: '#e3b341' }}
            >
              {pending} pending
            </span>
          )}
          <span className="text-xs ml-auto" style={{ color: '#8b949e' }}>
            CEO action required on each card
          </span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'critical', 'high', 'medium', 'low'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs font-bold px-3 py-1.5 rounded uppercase transition-all"
            style={{
              backgroundColor: filter === f
                ? (f === 'all' ? '#30363d' : `${PRIORITY_COLORS[f]}22`)
                : 'transparent',
              color: filter === f
                ? (f === 'all' ? '#e6edf3' : PRIORITY_COLORS[f])
                : '#8b949e',
              border: `1px solid ${filter === f ? (f === 'all' ? '#30363d' : PRIORITY_COLORS[f]) : '#30363d'}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Decision Cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="p-4 rounded text-sm" style={{ backgroundColor: '#161b22', color: '#8b949e' }}>
            No decisions matching this filter.
          </div>
        )}
        {filtered.map((d) => {
          const fdStyle = getFinalDecisionStyle(d.finalDecision);
          const isActed = d.status === 'decided' || (d.status === 'blocked' && d.finalDecision === 'DEFERRED');
          const isLoading = acting === d.id;

          return (
            <div
              key={d.id}
              className="rounded border overflow-hidden"
              style={{
                backgroundColor: '#161b22',
                borderColor: '#30363d',
                borderLeft: `4px solid ${PRIORITY_COLORS[d.priority || 'low']}`,
                opacity: isActed ? 0.65 : 1,
              }}
            >
              <div className="p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                        style={{
                          backgroundColor: `${PRIORITY_COLORS[d.priority || 'low']}22`,
                          color: PRIORITY_COLORS[d.priority || 'low'],
                        }}
                      >
                        {d.priority}
                      </span>

                      {/* Final decision badge or status badge */}
                      {fdStyle ? (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                          style={{ backgroundColor: fdStyle.bg, color: fdStyle.color }}
                        >
                          {fdStyle.label}
                        </span>
                      ) : (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                          style={{
                            backgroundColor: `${STATUS_COLORS[d.status || 'pending']}22`,
                            color: STATUS_COLORS[d.status || 'pending'],
                          }}
                        >
                          {d.status}
                        </span>
                      )}

                      {d.deadline && !isActed && (
                        <span className="text-xs" style={{ color: '#e3b341' }}>
                          Due: {d.deadline}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base" style={{ color: '#e6edf3' }}>
                      {d.title}
                    </h3>
                  </div>

                  {/* Action Buttons */}
                  {!isActed && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAction(d.id, 'APPROVED')}
                        disabled={isLoading}
                        title="Approve"
                        className="text-xs font-bold px-3 py-1.5 rounded transition-all"
                        style={{
                          backgroundColor: 'rgba(63,185,80,0.15)',
                          color: '#3fb950',
                          border: '1px solid #3fb95044',
                          opacity: isLoading ? 0.5 : 1,
                        }}
                      >
                        ✅ APPROVE
                      </button>
                      <button
                        onClick={() => handleAction(d.id, 'DECLINED')}
                        disabled={isLoading}
                        title="Decline"
                        className="text-xs font-bold px-3 py-1.5 rounded transition-all"
                        style={{
                          backgroundColor: 'rgba(248,81,73,0.15)',
                          color: '#f85149',
                          border: '1px solid #f8514944',
                          opacity: isLoading ? 0.5 : 1,
                        }}
                      >
                        ❌ DECLINE
                      </button>
                      <button
                        onClick={() => handleAction(d.id, 'DEFERRED')}
                        disabled={isLoading}
                        title="Defer — keep in queue but acknowledge"
                        className="text-xs font-bold px-3 py-1.5 rounded transition-all"
                        style={{
                          backgroundColor: 'rgba(139,148,158,0.12)',
                          color: '#8b949e',
                          border: '1px solid #8b949e44',
                          opacity: isLoading ? 0.5 : 1,
                        }}
                      >
                        ⏸ DEFER
                      </button>
                    </div>
                  )}
                </div>

                {/* Context */}
                {d.context && (
                  <div className="mb-3">
                    <div className="text-xs font-bold uppercase mb-1" style={{ color: '#8b949e' }}>
                      Context
                    </div>
                    <p className="text-sm" style={{ color: '#c9d1d9' }}>
                      {d.context}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Options */}
                  {d.options && (
                    <div>
                      <div className="text-xs font-bold uppercase mb-1" style={{ color: '#8b949e' }}>
                        Options
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {d.options.split(' / ').map((opt, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: '#0d1117', color: '#58a6ff', border: '1px solid #30363d' }}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* XO Recommendation */}
                  {d.aiRecommendation && (
                    <div>
                      <div className="text-xs font-bold uppercase mb-1" style={{ color: '#8b949e' }}>
                        XO Recommendation
                      </div>
                      <p
                        className="text-xs px-3 py-2 rounded"
                        style={{ backgroundColor: 'rgba(88,166,255,0.08)', color: '#58a6ff', border: '1px solid #58a6ff22' }}
                      >
                        {d.aiRecommendation}
                      </p>
                    </div>
                  )}
                </div>

                {d.relatedProject && (
                  <div className="mt-3 text-xs" style={{ color: '#8b949e' }}>
                    Related: <span style={{ color: '#58a6ff' }}>{d.relatedProject}</span>
                  </div>
                )}

                <CommentSection
                  entityType="decision"
                  entityId={d.id}
                  collapsible
                  label="CEO Notes"
                  placeholder="Add a note on this decision..."
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
