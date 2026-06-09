'use client';

import { useEffect, useState } from 'react';
import type { Alert } from '@/types';
import CommentSection from '@/components/CommentSection';

const URGENCY_CONFIG: Record<string, { bg: string; border: string; color: string; label: string }> = {
  critical: { bg: 'rgba(248,81,73,0.1)', border: '#f85149', color: '#f85149', label: 'CRITICAL' },
  high: { bg: 'rgba(227,179,65,0.1)', border: '#e3b341', color: '#e3b341', label: 'HIGH' },
  normal: { bg: 'rgba(22,27,34,1)', border: '#30363d', color: '#8b949e', label: 'NORMAL' },
};

const TYPE_COLORS: Record<string, string> = {
  money: '#3fb950',
  project: '#58a6ff',
  decision: '#f85149',
  automation: '#d29922',
  subscription: '#e3b341',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<Record<number, string>>({});

  const fetchAlerts = () => {
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleAction = async (id: number, action: 'resolve' | 'escalate') => {
    setActing((prev) => ({ ...prev, [id]: action }));
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (action === 'resolve') {
        // Remove from list optimistically
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      } else {
        // Escalate: bump urgency to critical in local state
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, urgency: 'critical' as Alert['urgency'] } : a))
        );
      }
    } finally {
      setActing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const critical = alerts.filter((a) => a.urgency === 'critical');
  const high = alerts.filter((a) => a.urgency === 'high');
  const normal = alerts.filter((a) => a.urgency === 'normal');

  if (loading) {
    return <div className="p-6" style={{ color: '#8b949e' }}>Loading alerts...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 pb-4 border-b" style={{ borderColor: '#30363d' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>ALERTS CENTER</h1>
          <span
            className="text-sm font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: 'rgba(248,81,73,0.2)', color: '#f85149' }}
          >
            {alerts.length} active
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
          Unresolved alerts — RESOLVE to dismiss · ESCALATE to mark critical
        </p>
      </div>

      {alerts.length === 0 && (
        <div
          className="p-8 rounded border text-center"
          style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
        >
          <div className="text-4xl mb-3">✅</div>
          <div className="font-bold" style={{ color: '#3fb950' }}>All clear — no active alerts</div>
          <div className="text-sm mt-1" style={{ color: '#8b949e' }}>Zero unresolved alerts</div>
        </div>
      )}

      {[
        { label: 'CRITICAL', items: critical, urgency: 'critical' },
        { label: 'HIGH PRIORITY', items: high, urgency: 'high' },
        { label: 'NORMAL', items: normal, urgency: 'normal' },
      ].map(({ label, items, urgency }) =>
        items.length > 0 ? (
          <div key={urgency} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1 h-4 rounded-full"
                style={{ backgroundColor: URGENCY_CONFIG[urgency].color }}
              />
              <h2
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: URGENCY_CONFIG[urgency].color }}
              >
                {label}
              </h2>
              <span className="text-xs" style={{ color: '#8b949e' }}>({items.length})</span>
            </div>

            <div className="space-y-3">
              {items.map((a) => {
                const cfg = URGENCY_CONFIG[a.urgency || 'normal'];
                const busyAction = acting[a.id];
                return (
                  <div
                    key={a.id}
                    className="p-4 rounded border"
                    style={{
                      backgroundColor: cfg.bg,
                      borderColor: cfg.border,
                      borderLeft: `4px solid ${cfg.border}`,
                      opacity: busyAction ? 0.7 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                            style={{
                              backgroundColor: `${TYPE_COLORS[a.alertType || 'money']}22`,
                              color: TYPE_COLORS[a.alertType || 'money'],
                            }}
                          >
                            {a.alertType}
                          </span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                            style={{
                              backgroundColor: `${cfg.color}22`,
                              color: cfg.color,
                            }}
                          >
                            {cfg.label}
                          </span>
                          {a.actionRequired ? (
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                              style={{ backgroundColor: 'rgba(248,81,73,0.2)', color: '#f85149' }}
                            >
                              ACTION REQUIRED
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium mb-2" style={{ color: '#e6edf3' }}>
                          {a.message}
                        </p>
                        {a.source && (
                          <p className="text-xs" style={{ color: '#8b949e' }}>
                            Source: {a.source}
                          </p>
                        )}

                        <CommentSection
                          entityType="alert"
                          entityId={a.id}
                          collapsible
                          label="Notes"
                          placeholder="Add context or resolution notes..."
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAction(a.id, 'resolve')}
                          disabled={!!busyAction}
                          className="text-xs font-bold px-3 py-1.5 rounded transition-all"
                          style={{
                            backgroundColor: 'rgba(63,185,80,0.15)',
                            color: '#3fb950',
                            border: '1px solid rgba(63,185,80,0.3)',
                            cursor: busyAction ? 'not-allowed' : 'pointer',
                            opacity: busyAction === 'escalate' ? 0.4 : 1,
                          }}
                        >
                          {busyAction === 'resolve' ? '...' : '✓ Resolve'}
                        </button>
                        {a.urgency !== 'critical' && (
                          <button
                            onClick={() => handleAction(a.id, 'escalate')}
                            disabled={!!busyAction}
                            className="text-xs font-bold px-3 py-1.5 rounded transition-all"
                            style={{
                              backgroundColor: 'rgba(248,81,73,0.15)',
                              color: '#f85149',
                              border: '1px solid rgba(248,81,73,0.3)',
                              cursor: busyAction ? 'not-allowed' : 'pointer',
                              opacity: busyAction === 'resolve' ? 0.4 : 1,
                            }}
                          >
                            {busyAction === 'escalate' ? '...' : '⬆ Escalate'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
