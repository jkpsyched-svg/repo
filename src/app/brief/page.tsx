'use client';

import { useEffect, useState } from 'react';
import type { DailyBrief } from '@/types';

export default function BriefPage() {
  const [briefs, setBriefs] = useState<DailyBrief[]>([]);
  const [currentBrief, setCurrentBrief] = useState<DailyBrief | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBriefs = () => {
    fetch('/api/brief')
      .then((r) => r.json())
      .then((d) => {
        setBriefs(d.briefs || []);
        if (d.briefs && d.briefs.length > 0) {
          setCurrentBrief(d.briefs[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchBriefs(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await fetch('/api/brief', { method: 'POST' });
      const d = await r.json();
      setCurrentBrief(d.brief);
      fetchBriefs();
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!currentBrief) return;
    setPublishing(true);
    try {
      const newStatus = currentBrief.status === 'published' ? 'draft' : 'published';
      await fetch('/api/brief', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentBrief.id, status: newStatus }),
      });
      setCurrentBrief((prev) => prev ? { ...prev, status: newStatus } : prev);
      setBriefs((prev) => prev.map((b) => b.id === currentBrief.id ? { ...b, status: newStatus } : b));
    } finally {
      setPublishing(false);
    }
  };

  const handleCopy = async () => {
    if (!currentBrief) return;
    const text = formatBriefAsText(currentBrief);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="p-6" style={{ color: '#8b949e' }}>Loading daily brief...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: '#30363d' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>DAILY BRIEF GENERATOR</h1>
          <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
            Auto-generates from current DB state. No AI API required.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="font-bold px-5 py-2.5 rounded transition-all text-sm"
          style={{
            backgroundColor: generating ? '#30363d' : '#58a6ff',
            color: generating ? '#8b949e' : '#0d1117',
            cursor: generating ? 'not-allowed' : 'pointer',
          }}
        >
          {generating ? '⟳ Generating...' : '⚡ Generate Today\'s Brief'}
        </button>
      </div>

      {currentBrief ? (
        <div>
          {/* Brief Header */}
          <div
            className="p-4 rounded border mb-6 flex items-center justify-between"
            style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
          >
            <div>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>
                Brief Date
              </div>
              <div className="font-bold text-lg" style={{ color: '#e6edf3' }}>
                {currentBrief.date}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-1 rounded uppercase"
                style={{
                  backgroundColor: currentBrief.status === 'published' ? 'rgba(63,185,80,0.2)' : 'rgba(139,148,158,0.2)',
                  color: currentBrief.status === 'published' ? '#3fb950' : '#8b949e',
                }}
              >
                {currentBrief.status}
              </span>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="text-xs font-bold px-3 py-1.5 rounded transition-all"
                style={{
                  backgroundColor: currentBrief.status === 'published'
                    ? 'rgba(139,148,158,0.15)'
                    : 'rgba(63,185,80,0.15)',
                  color: currentBrief.status === 'published' ? '#8b949e' : '#3fb950',
                  border: `1px solid ${currentBrief.status === 'published' ? '#30363d' : 'rgba(63,185,80,0.3)'}`,
                  cursor: publishing ? 'not-allowed' : 'pointer',
                }}
              >
                {publishing ? '...' : currentBrief.status === 'published' ? '↩ Unpublish' : '✅ Publish'}
              </button>
              <button
                onClick={handleCopy}
                className="text-xs font-bold px-3 py-1.5 rounded"
                style={{
                  backgroundColor: copied ? 'rgba(63,185,80,0.2)' : '#30363d',
                  color: copied ? '#3fb950' : '#8b949e',
                  border: '1px solid #30363d',
                }}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Brief Sections */}
          <div className="space-y-4">
            <BriefSection
              title="MONEY SUMMARY"
              content={currentBrief.moneySummary}
              accent="#3fb950"
            />
            <BriefSection
              title="DECISION SUMMARY"
              content={currentBrief.decisionSummary}
              accent="#e3b341"
            />
            <BriefSection
              title="PROJECT SUMMARY"
              content={currentBrief.projectSummary}
              accent="#58a6ff"
            />
            <BriefSection
              title="TOP 3 ACTIONS"
              content={currentBrief.top3Actions}
              accent="#d29922"
              numbered
            />
            <BriefSection
              title="RISKS"
              content={currentBrief.risks}
              accent="#f85149"
            />
            <BriefSection
              title="WHAT TO IGNORE TODAY"
              content={currentBrief.whatToIgnore}
              accent="#8b949e"
            />
            <BriefSection
              title="FINAL RECOMMENDATION"
              content={currentBrief.finalRecommendation}
              accent="#d29922"
              highlight
            />
          </div>
        </div>
      ) : (
        <div
          className="p-8 rounded border text-center"
          style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
        >
          <div className="text-4xl mb-3">📋</div>
          <div className="font-bold mb-2" style={{ color: '#e6edf3' }}>No brief generated yet</div>
          <div className="text-sm" style={{ color: '#8b949e' }}>
            Click &quot;Generate Today&apos;s Brief&quot; to create your command brief
          </div>
        </div>
      )}

      {/* Previous Briefs */}
      {briefs.length > 1 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#8b949e' }} />
            <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#8b949e' }}>
              PREVIOUS BRIEFS
            </h2>
          </div>
          <div className="space-y-2">
            {briefs.slice(1).map((b) => (
              <div
                key={b.id}
                className="p-3 rounded border flex items-center justify-between cursor-pointer transition-colors"
                style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
                onClick={() => setCurrentBrief(b)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm" style={{ color: '#e6edf3' }}>
                    {b.date}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded uppercase"
                    style={{
                      backgroundColor: b.status === 'published' ? 'rgba(63,185,80,0.15)' : '#0d1117',
                      color: b.status === 'published' ? '#3fb950' : '#8b949e',
                    }}
                  >
                    {b.status}
                  </span>
                </div>
                <span className="text-xs" style={{ color: '#58a6ff' }}>View →</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BriefSection({
  title,
  content,
  accent,
  numbered = false,
  highlight = false,
}: {
  title: string;
  content: string | null;
  accent: string;
  numbered?: boolean;
  highlight?: boolean;
}) {
  const lines = content?.split('\n').filter(Boolean) || [];

  return (
    <div
      className="rounded border overflow-hidden"
      style={{
        backgroundColor: highlight ? `${accent}10` : '#161b22',
        borderColor: highlight ? `${accent}44` : '#30363d',
      }}
    >
      <div
        className="px-4 py-2 border-b flex items-center gap-2"
        style={{
          borderColor: highlight ? `${accent}44` : '#30363d',
          backgroundColor: `${accent}12`,
        }}
      >
        <div className="w-1 h-3 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: accent }}>
          {title}
        </span>
      </div>
      <div className="px-4 py-3">
        {lines.length === 0 ? (
          <p className="text-sm" style={{ color: '#8b949e' }}>No data</p>
        ) : numbered ? (
          <ol className="space-y-2">
            {lines.map((line, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-bold flex-shrink-0" style={{ color: accent }}>{i + 1}.</span>
                <span style={{ color: '#e6edf3' }}>{line}</span>
              </li>
            ))}
          </ol>
        ) : lines.length > 1 ? (
          <ul className="space-y-1">
            {lines.map((line, i) => (
              <li key={i} className="text-sm" style={{ color: '#e6edf3' }}>
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: '#e6edf3' }}>{lines[0]}</p>
        )}
      </div>
    </div>
  );
}

function formatBriefAsText(brief: DailyBrief): string {
  const sections = [
    `JKRLZ COMMAND BRIEF — ${brief.date}`,
    `${'='.repeat(50)}`,
    '',
    `MONEY SUMMARY\n${brief.moneySummary || 'N/A'}`,
    '',
    `DECISION SUMMARY\n${brief.decisionSummary || 'N/A'}`,
    '',
    `PROJECT SUMMARY\n${brief.projectSummary || 'N/A'}`,
    '',
    `TOP 3 ACTIONS\n${brief.top3Actions || 'N/A'}`,
    '',
    `RISKS\n${brief.risks || 'N/A'}`,
    '',
    `WHAT TO IGNORE\n${brief.whatToIgnore || 'N/A'}`,
    '',
    `FINAL RECOMMENDATION\n${brief.finalRecommendation || 'N/A'}`,
  ];
  return sections.join('\n');
}
