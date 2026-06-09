import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Subscription } from '@/types';

function mapSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as number,
    toolName: row.tool_name as string,
    monthlyCost: row.monthly_cost as number | null,
    annualCost: row.annual_cost as number | null,
    billingCycle: row.billing_cycle as Subscription['billingCycle'],
    nextBillingDate: row.next_billing_date as string | null,
    purpose: row.purpose as string | null,
    owner: row.owner as string | null,
    roiScore: row.roi_score as number | null,
    status: row.status as Subscription['status'],
    nextReviewDate: row.next_review_date as string | null,
    cancelRisk: row.cancel_risk as number,
    notes: row.notes as string | null,
  };
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM subscriptions ORDER BY roi_score ASC').all() as Record<string, unknown>[];
    const subscriptions = rows.map(mapSubscription);

    const totalMonthly = subscriptions.reduce((s, sub) => s + (sub.monthlyCost || 0), 0);
    const totalAnnual = subscriptions.reduce((s, sub) => s + (sub.annualCost || 0), 0);
    const toReview = subscriptions.filter((s) => s.status === 'review' || s.status === 'cancel').length;

    return NextResponse.json({
      subscriptions,
      stats: { totalMonthly, totalAnnual, toReview },
    });
  } catch (err) {
    console.error('Subscriptions API error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: number; status: string };
    const db = getDb();
    db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?').run(body.status, body.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Subscriptions PATCH error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
