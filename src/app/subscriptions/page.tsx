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

  // CRUD Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [formToolName, setFormToolName] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formMonthlyCost, setFormMonthlyCost] = useState('');
  const [formAnnualCost, setFormAnnualCost] = useState('');
  const [formBillingCycle, setFormBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [formNextBillingDate, setFormNextBillingDate] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formRoiScore, setFormRoiScore] = useState('8');
  const [formStatus, setFormStatus] = useState<'keep' | 'cancel' | 'review' | 'seasonal'>('keep');
  const [formCancelRisk, setFormCancelRisk] = useState(false);
  const [formNotes, setFormNotes] = useState('');

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

  useEffect(() => {
    fetchSubs();
  }, []);

  const openAddModal = () => {
    setEditingSub(null);
    setFormToolName('');
    setFormPurpose('');
    setFormMonthlyCost('');
    setFormAnnualCost('');
    setFormBillingCycle('monthly');
    setFormNextBillingDate('');
    setFormOwner('XO');
    setFormRoiScore('8');
    setFormStatus('keep');
    setFormCancelRisk(false);
    setFormNotes('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setFormToolName(sub.toolName);
    setFormPurpose(sub.purpose || '');
    setFormMonthlyCost(sub.monthlyCost !== null ? sub.monthlyCost.toString() : '');
    setFormAnnualCost(sub.annualCost !== null ? sub.annualCost.toString() : '');
    setFormBillingCycle(sub.billingCycle || 'monthly');
    setFormNextBillingDate(sub.nextBillingDate || '');
    setFormOwner(sub.owner || '');
    setFormRoiScore(sub.roiScore !== null ? sub.roiScore.toString() : '8');
    setFormStatus(sub.status || 'keep');
    setFormCancelRisk(sub.cancelRisk === 1);
    setFormNotes(sub.notes || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscription tool?')) return;
    try {
      const res = await fetch(`/api/subscriptions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSubs();
      } else {
        alert('Failed to delete subscription');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    await fetch('/api/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchSubs();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formToolName) {
      setErrorMsg('Tool name is required.');
      return;
    }

    const payload = {
      id: editingSub?.id,
      toolName: formToolName,
      purpose: formPurpose || null,
      monthlyCost: formMonthlyCost ? parseFloat(formMonthlyCost) : null,
      annualCost: formAnnualCost ? parseFloat(formAnnualCost) : null,
      billingCycle: formBillingCycle,
      nextBillingDate: formNextBillingDate || null,
      owner: formOwner || null,
      roiScore: formRoiScore ? parseInt(formRoiScore, 10) : null,
      status: formStatus,
      cancelRisk: formCancelRisk ? 1 : 0,
      notes: formNotes || null,
    };

    try {
      const url = '/api/subscriptions';
      const method = editingSub ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchSubs();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to save subscription');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to save.');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-6" style={{ color: '#8b949e' }}>Loading subscription audit...</div>;
  }

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 pb-4 border-b flex justify-between items-end" style={{ borderColor: '#30363d' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>SUBSCRIPTION AUDIT</h1>
          <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Sorted by ROI score ascending (lowest first)</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 text-sm font-bold rounded cursor-pointer transition-all hover:brightness-110 active:scale-95 text-black"
          style={{ backgroundColor: '#d29922' }}
        >
          + Add Subscription
        </button>
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
              <th className="text-center px-4 py-3 font-medium">CEO Notes</th>
              <th className="text-center px-4 py-3 font-medium w-[120px]">Actions</th>
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
                    <div className="font-bold text-white">{s.toolName}</div>
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
                  <td className="px-4 py-3 text-right font-mono font-bold text-white">
                    ${(s.monthlyCost || 0).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">
                    ${(s.annualCost || 0).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {s.nextBillingDate ? (
                      <div>
                        <div className="font-mono text-white">{s.nextBillingDate}</div>
                        <div style={{ color: '#8b949e' }}>{s.billingCycle || '—'}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#8b949e' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs"
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
                  <td className="px-4 py-3 text-xs max-w-xs text-gray-400">
                    {s.notes || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setOpenComments((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="text-xs font-medium cursor-pointer transition-colors"
                      style={{ color: openComments[s.id] ? '#58a6ff' : '#8b949e' }}
                    >
                      💬 {openComments[s.id] ? 'Hide' : 'Show'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => openEditModal(s)}
                        className="text-xs px-2 py-1 rounded border border-gray-600 hover:border-gray-400 hover:text-white transition-all cursor-pointer bg-[#21262d] text-[#c9d1d9]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs px-2 py-1 rounded border border-red-900/40 hover:border-red-500 hover:text-red-500 transition-all cursor-pointer bg-[#21262d] text-[#ff7b72]"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
                {openComments[s.id] && (
                  <tr style={{ backgroundColor: '#0d1117', borderTop: '1px solid #21262d' }}>
                    <td colSpan={10} className="px-6 py-3">
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

      {/* Add / Edit Subscription Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-lg rounded-lg border shadow-2xl p-6 relative"
            style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
          >
            {/* Modal Header */}
            <div className="mb-4 pb-2 border-b flex justify-between items-center" style={{ borderColor: '#30363d' }}>
              <h3 className="text-base font-bold text-white">
                {editingSub ? '🔧 Edit Subscription' : '✨ Add Subscription'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-lg font-bold hover:text-white cursor-pointer text-[#8b949e]"
              >
                ×
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-2.5 rounded text-xs bg-red-900/40 border border-red-500 text-red-200">
                {errorMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">TOOL NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Claude Max 20x"
                  value={formToolName}
                  onChange={(e) => setFormToolName(e.target.value)}
                  className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">PURPOSE</label>
                <input
                  type="text"
                  placeholder="e.g. Core AI brain for writing and code"
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">MONTHLY COST ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formMonthlyCost}
                    onChange={(e) => setFormMonthlyCost(e.target.value)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">ANNUAL COST ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formAnnualCost}
                    onChange={(e) => setFormAnnualCost(e.target.value)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">BILLING CYCLE</label>
                  <select
                    value={formBillingCycle}
                    onChange={(e) => setFormBillingCycle(e.target.value as 'monthly' | 'annual')}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">NEXT CHARGE DATE</label>
                  <input
                    type="date"
                    value={formNextBillingDate}
                    onChange={(e) => setFormNextBillingDate(e.target.value)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">OWNER</label>
                  <input
                    type="text"
                    placeholder="e.g. XO"
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">ROI SCORE (1-10)</label>
                  <select
                    value={formRoiScore}
                    onChange={(e) => setFormRoiScore(e.target.value)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num}/10
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">STATUS</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Subscription['status'] & string)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 bg-[#0d1117] border-[#30363d] text-white"
                  >
                    <option value="keep">KEEP</option>
                    <option value="review">REVIEW</option>
                    <option value="cancel">CANCEL</option>
                    <option value="seasonal">SEASONAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">NOTES</label>
                <textarea
                  placeholder="Additional billing notes or cancellation context..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full text-sm p-2 rounded border focus:outline-none bg-[#0d1117] border-[#30363d] text-white"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formCancelRisk}
                    onChange={(e) => setFormCancelRisk(e.target.checked)}
                    className="rounded text-red-500"
                  />
                  HIGH CANCEL RISK (⚠ Warn me)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: '#30363d' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded border hover:text-white transition-all cursor-pointer bg-[#21262d] border-[#30363d] text-[#c9d1d9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded cursor-pointer transition-all hover:brightness-110 text-black"
                  style={{ backgroundColor: '#d29922' }}
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
