'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Transaction, Subscription } from '@/types';

interface MoneyData {
  transactions: Transaction[];
  projects: string[];
  stats: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    subscriptionBurn: number;
  };
}

interface SubData {
  subscriptions: Subscription[];
}

interface PortfolioData {
  success: boolean;
  positions: Array<{
    ticker: string;
    shares: number;
    avgCost: number;
    currentPrice: number;
    totalValue: number;
    totalCost: number;
    gainLoss: number;
    gainLossPct: number;
    bucket: string;
  }>;
  summary: {
    totalValue: number;
    totalCost: number;
    gainLoss: number;
    gainLossPct: number;
  };
  buckets: {
    values: Record<string, number>;
    percentages: Record<string, number>;
    targets: Record<string, number>;
    caps: Record<string, number>;
  };
}

const CATEGORY_COLORS = [
  '#58a6ff', // Sky Blue
  '#b89dff', // Lilac Purple
  '#3fb950', // Sage Green
  '#e3b341', // Warning Yellow
  '#ff6a00', // Neon Orange
  '#ff5d73', // Rose Red
  '#8a93a8', // Fog Gray
];

export default function MoneyPage() {
  const [money, setMoney] = useState<MoneyData | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [formDate, setFormDate] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formNote, setFormNote] = useState('');
  const [formDecisionNeeded, setFormDecisionNeeded] = useState(false);

  // Selected Category / Interactive Donut Chart slice
  const [hoveredCategory, setHoveredCategory] = useState<{ name: string; value: number } | null>(null);

  const fetchData = async () => {
    try {
      const [moneyRes, subsRes, portfolioRes] = await Promise.all([
        fetch('/api/money').then((r) => r.json()),
        fetch('/api/subscriptions').then((r) => r.json()),
        fetch('/api/portfolio').then((r) => r.json()),
      ]);

      setMoney(moneyRes);
      setSubs(subsRes.subscriptions || []);
      if (portfolioRes.success) {
        setPortfolio(portfolioRes);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingTx(null);
    setFormDate(today);
    setFormVendor('');
    setFormAmount('');
    setFormType('expense');
    setFormCategory('AI Tools');
    setFormProject('');
    setFormRecurring(false);
    setFormNote('');
    setFormDecisionNeeded(false);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setFormDate(tx.date);
    setFormVendor(tx.vendor || '');
    setFormAmount(Math.abs(tx.amount).toString());
    setFormType(tx.type);
    setFormCategory(tx.category || '');
    setFormProject(tx.project || '');
    setFormRecurring(tx.recurring === 1);
    setFormNote(tx.note || '');
    setFormDecisionNeeded(tx.decisionNeeded === 1);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/money?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete transaction');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formAmount || !formVendor) {
      setErrorMsg('Please fill in Date, Vendor, and Amount.');
      return;
    }

    const numericAmount = parseFloat(formAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Amount must be a positive number.');
      return;
    }

    // Amount is stored negative for expenses in db, positive for income
    const finalAmount = formType === 'expense' ? -numericAmount : numericAmount;

    const payload = {
      id: editingTx?.id,
      date: formDate,
      vendor: formVendor,
      amount: finalAmount,
      type: formType,
      category: formCategory,
      project: formProject || null,
      recurring: formRecurring ? 1 : 0,
      note: formNote || null,
      decision_needed: formDecisionNeeded ? 1 : 0,
    };

    try {
      const url = '/api/money';
      const method = editingTx ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to save transaction');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to save.');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm" style={{ color: '#8b949e' }}>Loading money radar & analytics...</div>;
  }

  const stats = money?.stats;
  const transactions = money?.transactions || [];
  const projects = money?.projects || [];

  // Calculate Savings Rate
  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpenses = stats?.totalExpenses ?? 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Calculate Average Burn runway (Pension + VA is stable resource covering tools, but let's assume total cash context)
  // Let's use simple logic: if net balance is positive, runway is "Infinite (Net positive)". If negative, compute weeks/months.
  const isNetPositive = (stats?.netBalance ?? 0) >= 0;
  const monthlyRunway = isNetPositive ? 'Stable Growth' : `$${Math.abs(stats?.netBalance ?? 0).toFixed(0)}/mo deficit`;

  // Group Expenses by Category
  const categoryExpenses: Record<string, number> = {};
  let totalCatExpenses = 0;
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = t.category || 'Other';
      categoryExpenses[cat] = (categoryExpenses[cat] || 0) + Math.abs(t.amount);
      totalCatExpenses += Math.abs(t.amount);
    });

  const categoryData = Object.entries(categoryExpenses)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Group Expenses by Project
  const projectExpenses: Record<string, number> = {};
  let totalProjExpenses = 0;
  transactions
    .filter((t) => t.type === 'expense' && t.project)
    .forEach((t) => {
      const proj = t.project!;
      projectExpenses[proj] = (projectExpenses[proj] || 0) + Math.abs(t.amount);
      totalProjExpenses += Math.abs(t.amount);
    });

  const projectExpenseData = Object.entries(projectExpenses)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Low ROI Subs (from tool stack)
  const lowRoiSubs = subs.filter((s) => s.roiScore !== null && s.roiScore < 6);

  // Rebalancing & CFO alerts
  const corePct = portfolio?.buckets.percentages['Core'] ?? 0;
  const coreCap = portfolio?.buckets.caps['Core'] ?? 75;
  const needRebalance = corePct > coreCap;

  return (
    <div className="p-6 max-w-7xl">
      {/* Page Header */}
      <div className="mb-6 pb-4 border-b flex justify-between items-end" style={{ borderColor: '#30363d' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            💰 MONEY RADAR & ANALYTICS
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
            Track cash flow, analyze capital allocation, and view CFO insights
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 text-sm font-bold rounded cursor-pointer transition-all hover:brightness-110 active:scale-95"
          style={{ backgroundColor: '#d29922', color: '#0d1117' }}
        >
          + Add Transaction
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <MiniStatCard label="Total Income" value={`$${totalIncome.toFixed(2)}`} accent="#3fb950" />
        <MiniStatCard label="Total Expenses" value={`$${totalExpenses.toFixed(2)}`} accent="#f85149" />
        <MiniStatCard
          label="Net Cash Flow"
          value={`${(stats?.netBalance ?? 0) >= 0 ? '+' : ''}$${(stats?.netBalance ?? 0).toFixed(2)}`}
          accent={(stats?.netBalance ?? 0) >= 0 ? '#3fb950' : '#f85149'}
        />
        <MiniStatCard
          label="Savings Rate"
          value={`${savingsRate.toFixed(1)}%`}
          accent={savingsRate > 20 ? '#3fb950' : savingsRate > 0 ? '#e3b341' : '#f85149'}
        />
        <MiniStatCard
          label="Tool Spend Burn"
          value={`$${(stats?.subscriptionBurn ?? 0).toFixed(0)}/mo`}
          accent="#58a6ff"
        />
      </div>

      {/* CFO Insights & Recommendations Panel */}
      <div
        className="mb-6 p-5 rounded-lg border-l-4 shadow-lg transition-all"
        style={{
          backgroundColor: '#161b22',
          borderColor: '#d29922',
          borderTop: '1px solid #30363d',
          borderRight: '1px solid #30363d',
          borderBottom: '1px solid #30363d',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🎖️</span>
          <h2 className="text-sm font-bold tracking-widest uppercase text-white" style={{ color: '#d29922' }}>
            CFO INSIGHTS & RECOMMENDATIONS
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {/* Column 1: Asset Rebalancing */}
          <div className="p-3.5 rounded border" style={{ backgroundColor: '#0d1117', borderColor: '#30363d' }}>
            <div className="text-xs font-bold text-white mb-2 flex justify-between">
              <span>💼 PORTFOLIO BALANCE</span>
              <span style={{ color: needRebalance ? '#f85149' : '#3fb950' }}>
                {needRebalance ? 'OVER-LIMIT' : 'HEALTHY'}
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: '#8b949e' }}>
              Stock/crypto holdings value: <strong className="text-white">${portfolio?.summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '0'}</strong>
            </p>
            {needRebalance ? (
              <div className="p-2.5 rounded text-xs leading-relaxed" style={{ backgroundColor: 'rgba(248,81,73,0.08)', color: '#ff7b72', border: '1px solid rgba(248,81,73,0.15)' }}>
                ⚠️ <strong>Core Bucket ({corePct.toFixed(1)}%)</strong> exceeds cap limit ({coreCap}%).
                Recommend moving <strong>$3,220</strong> of idle cash into Stable defensive assets (e.g. <strong>ITA, BAC, AR</strong>).
              </div>
            ) : (
              <div className="p-2.5 rounded text-xs" style={{ backgroundColor: 'rgba(63,185,80,0.08)', color: '#56d364', border: '1px solid rgba(63,185,80,0.15)' }}>
                ✓ Core holdings ({corePct.toFixed(1)}%) are aligned under the 75% limit. Asset distribution is healthy.
              </div>
            )}
          </div>

          {/* Column 2: Subscription Optimization */}
          <div className="p-3.5 rounded border" style={{ backgroundColor: '#0d1117', borderColor: '#30363d' }}>
            <div className="text-xs font-bold text-white mb-2 flex justify-between">
              <span>🔧 TOOL SPEND OPTIMIZATION</span>
              <span style={{ color: lowRoiSubs.length > 0 ? '#e3b341' : '#3fb950' }}>
                {lowRoiSubs.length > 0 ? `${lowRoiSubs.length} ACTIONABLE` : 'OPTIMIZED'}
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: '#8b949e' }}>
              Current monthly tool burn: <strong className="text-white">${stats?.subscriptionBurn.toFixed(0)}/mo</strong>
            </p>
            {lowRoiSubs.length > 0 ? (
              <div className="space-y-2 max-h-[90px] overflow-y-auto pr-1">
                {lowRoiSubs.map(s => (
                  <div key={s.id} className="p-1.5 rounded text-xs flex justify-between items-center" style={{ backgroundColor: 'rgba(227,179,65,0.08)', color: '#e3b341', border: '1px solid rgba(227,179,65,0.15)' }}>
                    <span>{s.toolName} (ROI {s.roiScore}/10)</span>
                    <Link href="/subscriptions" className="font-bold underline hover:text-white">Cancel</Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded text-xs" style={{ backgroundColor: 'rgba(63,185,80,0.08)', color: '#56d364', border: '1px solid rgba(63,185,80,0.15)' }}>
                ✓ All tools have high ROI ({`>= 6`}). Spend efficiency is maximized.
              </div>
            )}
          </div>

          {/* Column 3: Trading Strategy */}
          <div className="p-3.5 rounded border" style={{ backgroundColor: '#0d1117', borderColor: '#30363d' }}>
            <div className="text-xs font-bold text-white mb-2">
              <span>🪙 CRYPTO ACCUMULATION</span>
            </div>
            <p className="text-xs mb-3" style={{ color: '#8b949e' }}>
              BTC, ETH, XRP, DOGE are in **2/3 BUY** zone.
            </p>
            <div className="p-2.5 rounded text-xs leading-relaxed" style={{ backgroundColor: 'rgba(88,166,255,0.08)', color: '#79c0ff', border: '1px solid rgba(88,166,255,0.15)' }}>
              📢 <strong>MACD Negative Warning:</strong> Momentum remains down. Maintain a small 1st step entry. Delay major additions until MACD crossover.
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Category Share Donut Chart */}
        <div className="col-span-5 p-5 rounded border" style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}>
          <h3 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#8b949e' }}>
            Category Share (% of Expenses)
          </h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[160px] text-xs" style={{ color: '#8b949e' }}>
              No expenses recorded to generate chart.
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {/* Donut Chart SVG */}
              <div className="relative w-[150px] h-[150px] flex items-center justify-center">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  {/* Background Track */}
                  <circle cx="70" cy="70" r="50" fill="transparent" stroke="#21262d" strokeWidth="12" />
                  {(() => {
                    const radius = 50;
                    const circumference = 2 * Math.PI * radius;
                    let currentOffset = 0;

                    return categoryData.map((cat, i) => {
                      const pct = cat.value / totalCatExpenses;
                      const strokeDasharray = `${pct * circumference} ${circumference}`;
                      const strokeDashoffset = -currentOffset;
                      currentOffset += pct * circumference;
                      const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];

                      return (
                        <circle
                          key={cat.name}
                          cx="70"
                          cy="70"
                          r={radius}
                          fill="transparent"
                          stroke={color}
                          strokeWidth="14"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          transform="rotate(-90 70 70)"
                          className="transition-all duration-200 cursor-pointer"
                          style={{ transformOrigin: 'center' }}
                          onMouseEnter={() => setHoveredCategory(cat)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                    });
                  })()}
                </svg>
                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {hoveredCategory ? (
                    <>
                      <span className="text-[10px] font-bold uppercase truncate max-w-[80px]" style={{ color: '#8b949e' }}>
                        {hoveredCategory.name}
                      </span>
                      <span className="text-sm font-bold text-white mt-0.5">
                        {((hoveredCategory.value / totalCatExpenses) * 100).toFixed(0)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold uppercase" style={{ color: '#8b949e' }}>
                        Total
                      </span>
                      <span className="text-sm font-bold text-white mt-0.5">
                        ${totalCatExpenses.toFixed(0)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex-1 space-y-2 max-h-[160px] overflow-y-auto pl-4">
                {categoryData.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[110px]">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span className="truncate text-white font-medium">{cat.name}</span>
                    </div>
                    <span style={{ color: '#8b949e' }}>${cat.value.toFixed(0)}</span>
                  </div>
                ))}
                {categoryData.length > 5 && (
                  <div className="text-[10px] text-right" style={{ color: '#8b949e' }}>
                    + {categoryData.length - 5} more categories
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Project Expense Breakdown Chart */}
        <div className="col-span-7 p-5 rounded border" style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}>
          <h3 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#8b949e' }}>
            Project Capital Allocation (Expenses)
          </h3>
          {projectExpenseData.length === 0 ? (
            <div className="flex items-center justify-center h-[160px] text-xs" style={{ color: '#8b949e' }}>
              No project expenses recorded. Create transactions with a project selected to track allocation.
            </div>
          ) : (
            <div className="space-y-3.5 pr-2 max-h-[160px] overflow-y-auto">
              {projectExpenseData.map((proj, i) => {
                const pct = totalProjExpenses > 0 ? (proj.value / totalProjExpenses) * 100 : 0;
                return (
                  <div key={proj.name} className="text-xs">
                    <div className="flex justify-between font-medium text-white mb-1.5">
                      <span>{proj.name}</span>
                      <span>
                        ${proj.value.toFixed(2)}{' '}
                        <span style={{ color: '#8b949e' }}>({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#21262d' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transactions Section */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#58a6ff' }} />
        <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#8b949e' }}>
          TRANSACTIONS LEDGER
        </h2>
      </div>

      <div className="rounded border overflow-hidden" style={{ borderColor: '#30363d' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#161b22', color: '#8b949e' }}>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Vendor</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-left px-4 py-3 font-medium">Project</th>
              <th className="text-right px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-center px-4 py-3 font-medium w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr
                key={t.id}
                style={{
                  backgroundColor: i % 2 === 0 ? '#161b22' : '#0d1117',
                  borderTop: '1px solid #30363d',
                }}
              >
                <td className="px-4 py-3" style={{ color: '#8b949e' }}>
                  {t.date}
                </td>
                <td className="px-4 py-3 font-medium text-white">
                  {t.vendor || '—'}
                  {t.note && (
                    <span className="block text-xs font-normal mt-0.5" style={{ color: '#8b949e' }}>
                      {t.note}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: '#21262d',
                      color: '#c9d1d9',
                      border: '1px solid #30363d',
                    }}
                  >
                    {t.category || 'Other'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: t.project ? '#58a6ff' : '#8b949e' }}>
                  {t.project || '—'}
                </td>
                <td
                  className="px-4 py-3 text-right font-mono font-bold"
                  style={{ color: t.type === 'income' ? '#3fb950' : '#f85149' }}
                >
                  {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded uppercase font-bold"
                    style={{
                      backgroundColor: t.type === 'income' ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
                      color: t.type === 'income' ? '#3fb950' : '#f85149',
                    }}
                  >
                    {t.type}
                  </span>
                  {t.recurring ? (
                    <span className="ml-2 text-xs" style={{ color: '#58a6ff' }} title="Recurring billing">
                      ↻
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1.5">
                    <button
                      onClick={() => openEditModal(t)}
                      className="text-xs px-2 py-1 rounded border border-gray-600 hover:border-gray-400 hover:text-white transition-all cursor-pointer"
                      style={{ backgroundColor: '#21262d', color: '#c9d1d9' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-xs px-2 py-1 rounded border hover:border-red-500 hover:text-red-500 transition-all cursor-pointer"
                      style={{ backgroundColor: '#21262d', color: '#ff7b72', borderColor: 'rgba(248,81,73,0.3)' }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Transaction Modal */}
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
                {editingTx ? '⚙️ Edit Transaction' : '💰 Add Transaction'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-lg font-bold hover:text-white cursor-pointer"
                style={{ color: '#8b949e' }}
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
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">DATE</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500"
                    style={{ backgroundColor: '#0d1117', borderColor: '#30363d', color: '#white' }}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">AMOUNT ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500 font-mono"
                    style={{ backgroundColor: '#0d1117', borderColor: '#30363d', color: '#white' }}
                  />
                </div>
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">VENDOR</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anthropic Claude"
                  value={formVendor}
                  onChange={(e) => setFormVendor(e.target.value)}
                  className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500"
                  style={{ backgroundColor: '#0d1117', borderColor: '#30363d', color: '#white' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">TYPE</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('expense')}
                      className="flex-1 py-2 rounded text-xs font-bold border transition-all cursor-pointer"
                      style={{
                        backgroundColor: formType === 'expense' ? 'rgba(248,81,73,0.15)' : '#0d1117',
                        borderColor: formType === 'expense' ? '#f85149' : '#30363d',
                        color: formType === 'expense' ? '#f85149' : '#8b949e',
                      }}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('income')}
                      className="flex-1 py-2 rounded text-xs font-bold border transition-all cursor-pointer"
                      style={{
                        backgroundColor: formType === 'income' ? 'rgba(63,185,80,0.15)' : '#0d1117',
                        borderColor: formType === 'income' ? '#3fb950' : '#30363d',
                        color: formType === 'income' ? '#3fb950' : '#8b949e',
                      }}
                    >
                      Income
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">CATEGORY</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500"
                    style={{ backgroundColor: '#0d1117', borderColor: '#30363d', color: '#white' }}
                  >
                    <option value="AI Tools">AI Tools</option>
                    <option value="SaaS">SaaS</option>
                    <option value="Music AI">Music AI</option>
                    <option value="Music Distro">Music Distro</option>
                    <option value="Music Mastering">Music Mastering</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Salary">Salary</option>
                    <option value="Dividend">Dividend</option>
                    <option value="VA Pension">VA Pension</option>
                    <option value="Marketing">Marketing</option>
                    <option value="General Ops">General Ops</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">PROJECT</label>
                <select
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                  className="w-full text-sm p-2 rounded border focus:outline-none focus:border-blue-500"
                  style={{ backgroundColor: '#0d1117', borderColor: '#30363d', color: '#white' }}
                >
                  <option value="">— None —</option>
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">NOTE / COMMENT</label>
                <textarea
                  placeholder="Add details, link references, or context..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  rows={2}
                  className="w-full text-sm p-2 rounded border focus:outline-none"
                  style={{ backgroundColor: '#0d1117', borderColor: '#30363d', color: '#white' }}
                />
              </div>

              <div className="flex items-center gap-6">
                {/* Recurring */}
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecurring}
                    onChange={(e) => setFormRecurring(e.target.checked)}
                    className="rounded text-blue-500"
                  />
                  RECURRING BILLING (↻)
                </label>

                {/* Decision Needed */}
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formDecisionNeeded}
                    onChange={(e) => setFormDecisionNeeded(e.target.checked)}
                    className="rounded text-red-500"
                  />
                  DECISION NEEDED (🔴)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: '#30363d' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded border hover:text-white transition-all cursor-pointer"
                  style={{ backgroundColor: '#21262d', borderColor: '#30363d', color: '#c9d1d9' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded cursor-pointer transition-all hover:brightness-110"
                  style={{ backgroundColor: '#d29922', color: '#0d1117' }}
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="p-4 rounded-lg border flex flex-col justify-between"
      style={{
        backgroundColor: '#161b22',
        borderColor: '#30363d',
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#8b949e' }}>
        {label}
      </div>
      <div className="text-xl font-bold font-mono text-white tracking-tight" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
