'use client';

import { useEffect, useState, useRef } from 'react';

interface Comment {
  id: number;
  entity_type: string;
  entity_id: number | null;
  body: string;
  created_at: string;
}

interface CommentSectionProps {
  entityType: string;
  entityId?: number | null;
  /** Collapsed by default — user clicks to expand */
  collapsible?: boolean;
  /** Show section label above */
  label?: string;
  placeholder?: string;
}

function formatTime(raw: string): string {
  try {
    const d = new Date(raw);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export default function CommentSection({
  entityType,
  entityId = null,
  collapsible = true,
  label = 'Notes',
  placeholder = 'Add a note or comment...',
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = async () => {
    const params = new URLSearchParams({ entity_type: entityType });
    if (entityId != null) params.set('entity_id', String(entityId));
    const r = await fetch(`/api/comments?${params}`);
    const d = await r.json();
    setComments(d.comments || []);
  };

  useEffect(() => {
    // Always fetch so the count badge is accurate even when collapsed
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, body: draft.trim() }),
      });
      if (r.ok) {
        const d = await r.json();
        setComments((prev) => [...prev, d.comment]);
        setDraft('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const count = comments.length;

  if (collapsible && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs transition-all"
        style={{ color: count > 0 ? '#58a6ff' : '#8b949e' }}
      >
        <span>💬</span>
        <span>{count > 0 ? `${count} note${count !== 1 ? 's' : ''}` : label}</span>
        {count === 0 && <span style={{ color: '#8b949e' }}>+</span>}
      </button>
    );
  }

  return (
    <div
      className="mt-3 pt-3"
      style={{ borderTop: '1px solid #30363d' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">💬</span>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8b949e' }}>
            {label}
          </span>
          {count > 0 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(88,166,255,0.15)', color: '#58a6ff' }}
            >
              {count}
            </span>
          )}
        </div>
        {collapsible && (
          <button
            onClick={() => setOpen(false)}
            className="text-xs"
            style={{ color: '#8b949e' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Existing comments */}
      {count > 0 && (
        <div className="space-y-1.5 mb-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className="group flex items-start gap-2 px-3 py-2 rounded"
              style={{ backgroundColor: '#0d1117', border: '1px solid #21262d' }}
            >
              <span className="text-xs flex-1" style={{ color: '#e6edf3', lineHeight: '1.5' }}>
                {c.body}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs" style={{ color: '#8b949e' }}>
                  {formatTime(c.created_at)}
                </span>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#f85149' }}
                  title="Delete"
                >
                  {deleting === c.id ? '...' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={2}
          className="flex-1 text-xs px-3 py-2 rounded resize-none outline-none"
          style={{
            backgroundColor: '#0d1117',
            border: '1px solid #30363d',
            color: '#e6edf3',
            lineHeight: '1.5',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#58a6ff'; }}
          onBlur={(e) => { e.target.style.borderColor = '#30363d'; }}
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !draft.trim()}
          className="text-xs font-bold px-3 py-1.5 rounded self-end transition-all"
          style={{
            backgroundColor: draft.trim() ? 'rgba(88,166,255,0.15)' : 'rgba(139,148,158,0.1)',
            color: draft.trim() ? '#58a6ff' : '#8b949e',
            border: `1px solid ${draft.trim() ? 'rgba(88,166,255,0.3)' : '#30363d'}`,
            cursor: submitting || !draft.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? '...' : '↵ Save'}
        </button>
      </div>
      <p className="text-xs mt-1" style={{ color: '#8b949e' }}>
        ⌘↵ to save
      </p>
    </div>
  );
}
