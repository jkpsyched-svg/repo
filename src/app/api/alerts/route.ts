import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Alert } from '@/types';

function mapAlert(row: Record<string, unknown>): Alert {
  return {
    id: row.id as number,
    alertType: row.alert_type as Alert['alertType'],
    message: row.message as string,
    urgency: row.urgency as Alert['urgency'],
    source: row.source as string | null,
    actionRequired: row.action_required as number,
    resolved: row.resolved as number,
    createdDate: row.created_date as string,
  };
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT * FROM alerts
        WHERE resolved = 0
        ORDER BY CASE urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END
      `)
      .all() as Record<string, unknown>[];
    const alerts = rows.map(mapAlert);
    return NextResponse.json({ alerts });
  } catch (err) {
    console.error('Alerts API error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: number; action?: string };
    const db = getDb();
    if (body.action === 'escalate') {
      db.prepare("UPDATE alerts SET urgency = 'critical', action_required = 1 WHERE id = ?").run(body.id);
    } else {
      db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?').run(body.id);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Alerts PATCH error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
