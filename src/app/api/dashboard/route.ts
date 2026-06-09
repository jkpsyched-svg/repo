import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // Pending decisions count
    const pendingDecisions = (db.prepare("SELECT COUNT(*) as cnt FROM decisions WHERE status = 'pending'").get() as { cnt: number }).cnt;

    // Unresolved alerts count
    const unresolvedAlerts = (db.prepare("SELECT COUNT(*) as cnt FROM alerts WHERE resolved = 0").get() as { cnt: number }).cnt;

    // Monthly burn (subscriptions)
    const subBurnRow = db.prepare('SELECT SUM(monthly_cost) as total FROM subscriptions').get() as { total: number | null };
    const monthlyBurn = subBurnRow.total || 0;

    // Critical decisions
    const criticalDecisions = db.prepare(`
      SELECT id, title, deadline, status, priority
      FROM decisions
      WHERE priority = 'critical' AND status != 'decided'
      ORDER BY deadline ASC
    `).all();

    // Critical alerts
    const criticalAlertsRows = db.prepare(`
      SELECT id, alert_type, message, urgency, source
      FROM alerts
      WHERE urgency = 'critical' AND resolved = 0
    `).all();

    // Projects
    const projects = db.prepare(`
      SELECT id, project_name, status, next_action, blocker, priority, decision_needed
      FROM projects
      ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    `).all();

    return NextResponse.json({
      stats: { pendingDecisions, unresolvedAlerts, monthlyBurn },
      criticalDecisions,
      criticalAlerts: criticalAlertsRows,
      projects,
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
