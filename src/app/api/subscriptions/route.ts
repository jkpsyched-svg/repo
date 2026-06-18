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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      toolName,
      monthlyCost,
      annualCost,
      billingCycle,
      nextBillingDate,
      purpose,
      owner,
      roiScore,
      status,
      nextReviewDate,
      cancelRisk,
      notes,
    } = body;

    if (!toolName) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO subscriptions (
        tool_name, monthly_cost, annual_cost, billing_cycle, next_billing_date,
        purpose, owner, roi_score, status, next_review_date, cancel_risk, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      toolName,
      monthlyCost !== undefined && monthlyCost !== null ? parseFloat(monthlyCost) : null,
      annualCost !== undefined && annualCost !== null ? parseFloat(annualCost) : null,
      billingCycle || null,
      nextBillingDate || null,
      purpose || null,
      owner || null,
      roiScore !== undefined && roiScore !== null ? parseInt(roiScore, 10) : null,
      status || 'keep',
      nextReviewDate || null,
      cancelRisk ? 1 : 0,
      notes || null
    );

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Subscriptions POST error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      toolName,
      monthlyCost,
      annualCost,
      billingCycle,
      nextBillingDate,
      purpose,
      owner,
      roiScore,
      status,
      nextReviewDate,
      cancelRisk,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const db = getDb();

    // Check if we are only updating status (compatibility with legacy status select)
    const keys = Object.keys(body);
    if (keys.length === 2 && keys.includes('id') && keys.includes('status')) {
      db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?').run(status, id);
      return NextResponse.json({ success: true });
    }

    // Otherwise, perform full update
    db.prepare(`
      UPDATE subscriptions SET
        tool_name = ?,
        monthly_cost = ?,
        annual_cost = ?,
        billing_cycle = ?,
        next_billing_date = ?,
        purpose = ?,
        owner = ?,
        roi_score = ?,
        status = ?,
        next_review_date = ?,
        cancel_risk = ?,
        notes = ?
      WHERE id = ?
    `).run(
      toolName,
      monthlyCost !== undefined && monthlyCost !== null ? parseFloat(monthlyCost) : null,
      annualCost !== undefined && annualCost !== null ? parseFloat(annualCost) : null,
      billingCycle || null,
      nextBillingDate || null,
      purpose || null,
      owner || null,
      roiScore !== undefined && roiScore !== null ? parseInt(roiScore, 10) : null,
      status || 'keep',
      nextReviewDate || null,
      cancelRisk ? 1 : 0,
      notes || null,
      id
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Subscriptions PATCH error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Subscriptions DELETE error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
