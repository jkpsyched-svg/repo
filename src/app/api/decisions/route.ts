import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Decision } from '@/types';

function mapDecision(row: Record<string, unknown>): Decision {
  return {
    id: row.id as number,
    title: row.title as string,
    context: row.context as string | null,
    options: row.options as string | null,
    aiRecommendation: row.ai_recommendation as string | null,
    priority: row.priority as Decision['priority'],
    deadline: row.deadline as string | null,
    status: row.status as Decision['status'],
    finalDecision: row.final_decision as string | null,
    relatedProject: row.related_project as string | null,
    createdAt: row.created_at as string,
  };
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM decisions').all() as Record<string, unknown>[];
    const decisions = rows.map(mapDecision).sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority || 'low'] ?? 3) -
        (PRIORITY_ORDER[b.priority || 'low'] ?? 3)
    );
    return NextResponse.json({ decisions });
  } catch (err) {
    console.error('Decisions API error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: number; status: string; finalDecision?: string };
    const db = getDb();
    db.prepare(
      'UPDATE decisions SET status = ?, final_decision = ? WHERE id = ?'
    ).run(body.status, body.finalDecision || null, body.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Decisions PATCH error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
