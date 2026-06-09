'use client';

import React, { useEffect, useState } from 'react';
import type { Subscription } from '@/types';
import CommentSection from '@/components/CommentSection';

const STATUS_COLORS: Record<string, string> = {
  keep: '#3fb950',
  cancel: '#f85149',
  review: '#e3b341',
  seasonal: '#58a6ff',
};

function roiColor(score: number | null): string {
  if (score === null) return '#8b949e';
  if (score <= 5) return '#f85149';
  if (score <= 7) return '#e3b341';
  return '#3fb950';
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<{ totalMonthly: number; totalAnnual: number; toReview: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});

  const fetchSubs = () => {
    fetch('/api/subscriptions')
      .then((r) => r.json())
      .then((d) => {
        setSubscriptions(d.subscriptions || []);
        setStats(d.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchSubs(); }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    await fetch('/api/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchSubs();
  };

  if (loading) {
    return <div className="p-6" style={{ color: '#8b949e' }}>Loading subscription audit...</div>;
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 pb-4 border-b" style={{ borderColor: '#30363d' }}>
        <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>SUBSCRIPTION AUDIT</h1>
        <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Sorted by ROI score ascending (lowest first)</p>
      </div>

      {/* Critical review banner */}
      {subscriptions.filter((s) => s.status === 'review' && s.cancelRisk === 1).length > 0 && (
        <div
          className="mb-4 p-3 rounded border text-sm"
          style={{ backgroundColor: 'rgba(248,81,73,0.08)', borderColor: '#f85149', color: '#f85149' }}
        >
          <strong>⚠ ACTION REQUIRED:</strong>{' '}
          {subscriptions.filter((s) => s.status === 'review' && s.cancelRisk === 1).map((s) => s.toolName).join(' · ')}
          {' '}— review flagged tools before next billing cycle.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          className="p-4 rounded border"
          style={{ backgroundColor: '#161b22', borderColor: '#30363d', borderLeft: '3px solid #58a6ff' }}
        >
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>Monthly Total</div>
          <div className="text-2xl font-bold font-mono" style={{ color: '#58a6ff' }}>
            ${(stats?.totalMonthly ?? 0).toFixed(0)}/mo
          </div>
        </div>
        <div
          className="p-4 rounded border"
          style={{ backgroundColor: '#161b22', borderColor: '#30363d', borderLeft: '3px solid #8b949e' }}
        >
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>Annual Total</div>
          <div className="text-2xl font-bold font-mono" style={{ color: '#e6edf3' }}>
            ${(stats?.totalAnnual ?? 0).toFixed(0)}/yr
          </div>
        </div>
        <div
          className="p-4 rounded border"
          style={{
            backgroundColor: '#161b22',
            borderColor: '#30363d',
            borderLeft: `3px solid ${(stats?.toReview ?? 0) > 0 ? '#e3b341' : '#3fb950'}`,
          }}
        >
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>Tools to Review</div>
          <div
            className="text-2xl font-bold font-mono"
            style={{ color: (stats?.toReview ?? 0) > 0 ? '#e3b341' : '#3fb950' }}
          >
            {stats?.toReview ?? 0}
          </div>
        </div>
      </div>

      {/* Subscription Table */}
      <div className="rounded border overflow-hidden" style={{ borderColor: '#30363d' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#161b22', color: '#8b949e' }}>
              <th className="text-left px-4 py-3 font-medium">Tool</th>
              <th className="text-left px-4 py-3 font-medium">Purpose</th>
              <th className="text-right px-4 py-3 font-medium">Monthly</th>
              <th className="text-right px-4 py-3 font-medium">Annual</th>
              <th className="text-left px-4 py-3 font-medium">Next Charge</th>
              <th className="text-center px-4 py-3 font-medium">ROI</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Notes</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: '#8b949e' }}>CEO Notes</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s, i) => {
              const isLowRoi = s.roiScore !== null && s.roiScore < 6;
              return (
                <React.Fragment key={s.id}>
                <tr
                  style={{
                    backgroundColor: isLowRoi
                      ? 'rgba(248,81,73,0.05)'
                      : i % 2 === 0 ? '#161b22' : '#0d1117',
                    borderTop: '1px solid #30363d',
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-bold" style={{ color: '#e6edf3' }}>{s.toolName}</div>
                    <div className="text-xs" style={{ color: '#8b949e' }}>Owner: {s.owner || '—'}</div>
                    {s.cancelRisk ? (
                      <div className="text-xs font-bold mt-0.5" style={{ color: '#f85149' }}>
                        ⚠ CANCEL RISK
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>
                    {s.purpose || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: '#e6edf3' }}>
                    ${(s.monthlyCost || 0).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: '#8b949e' }}>
                    ${(s.annualCost || 0).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {s.nextBillingDate ? (
                      <div>
                        <div className="font-mono" style={{ color: '#e6edf3' }}>{s.nextBillingDate}</div>
                        <div style={{ color: '#8b949e' }}>{s.billingCycle || '—'}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#8b949e' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm"
                      style={{
                        backgroundColor: `${roiColor(s.roiScore)}22`,
                        color: roiColor(s.roiScore),
                        border: `2px solid ${roiColor(s.roiScore)}`,
                      }}
                    >
                      {s.roiScore ?? '?'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.status || 'keep'}
                      onChange={(e) => handleStatusChange(s.id, e.target.value)}
                      className="text-xs font-bold px-2 py-1 rounded cursor-pointer"
                      style={{
                        backgroundColor: `${STATUS_COLORS[s.status || 'keep']}22`,
                        color: STATUS_COLORS[s.status || 'keep'],
                        border: `1px solid ${STATUS_COLORS[s.status || 'keep']}44`,
                        appearance: 'none',
                        outline: 'none',
                      }}
                    >
                      <option value="keep">KEEP</option>
                      <option value="review">REVIEW</option>
                      <option value="cancel">CANCEL</option>
                      <option value="seasonal">SEASONAL</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs" style={{ color: '#8b949e' }}>
                    {s.notes || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setOpenComments((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="text-xs transition-all"
                      style={{ color: openComments[s.id] ? '#58a6ff' : '#8b949e' }}
                    >
                      💬 {openComments[s.id] ? 'close' : 'notes'}
                    </button>
                  </td>
                </tr>
                {openComments[s.id] && (
                  <tr style={{ backgroundColor: '#0d1117', borderTop: '1px solid #21262d' }}>
                    <td colSpan={9} className="px-6 py-3">
                      <CommentSection
                        entityType="subscription"
                        entityId={s.id}
                        collapsible={false}
                        label={`CEO Notes — ${s.toolName}`}
                        placeholder="Renewal decision, ROI rationale, cancel notes..."
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
