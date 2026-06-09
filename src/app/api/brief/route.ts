import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateDailyBrief } from '@/lib/brief-generator';
import type { Transaction, Decision, Project, Subscription, Alert, DailyBrief } from '@/types';

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as number,
    date: row.date as string,
    amount: row.amount as number,
    type: row.type as 'income' | 'expense',
    category: row.category as string | null,
    vendor: row.vendor as string | null,
    project: row.project as string | null,
    recurring: row.recurring as number,
    note: row.note as string | null,
    decisionNeeded: row.decision_needed as number,
    createdAt: row.created_at as string,
  };
}

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

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as number,
    projectName: row.project_name as string,
    category: row.category as string | null,
    status: row.status as Project['status'],
    nextAction: row.next_action as string | null,
    blocker: row.blocker as string | null,
    owner: row.owner as string | null,
    decisionNeeded: row.decision_needed as number,
    lastUpdated: row.last_updated as string | null,
    priority: row.priority as Project['priority'],
  };
}

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

function mapBrief(row: Record<string, unknown>): DailyBrief {
  return {
    id: row.id as number,
    date: row.date as string,
    moneySummary: row.money_summary as string | null,
    decisionSummary: row.decision_summary as string | null,
    projectSummary: row.project_summary as string | null,
    top3Actions: row.top3_actions as string | null,
    risks: row.risks as string | null,
    whatToIgnore: row.what_to_ignore as string | null,
    finalRecommendation: row.final_recommendation as string | null,
    status: (row.status as 'draft' | 'published') || 'draft',
  };
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: number; status: 'published' | 'draft' };
    const db = getDb();
    db.prepare('UPDATE daily_briefs SET status = ? WHERE id = ?').run(body.status, body.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Brief PATCH error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const transactions = (db.prepare('SELECT * FROM transactions').all() as Record<string, unknown>[]).map(mapTransaction);
    const decisions = (db.prepare('SELECT * FROM decisions').all() as Record<string, unknown>[]).map(mapDecision);
    const projects = (db.prepare('SELECT * FROM projects').all() as Record<string, unknown>[]).map(mapProject);
    const subscriptions = (db.prepare('SELECT * FROM subscriptions').all() as Record<string, unknown>[]).map(mapSubscription);
    const alerts = (db.prepare('SELECT * FROM alerts WHERE resolved = 0').all() as Record<string, unknown>[]).map(mapAlert);

    const brief = generateDailyBrief({ transactions, decisions, projects, subscriptions, alerts });

    // Insert or replace today's brief
    db.prepare(`
      INSERT INTO daily_briefs (date, money_summary, decision_summary, project_summary, top3_actions, risks, what_to_ignore, final_recommendation, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      today,
      brief.moneySummary,
      brief.decisionSummary,
      brief.projectSummary,
      brief.top3Actions,
      brief.risks,
      brief.whatToIgnoreToday,
      brief.finalRecommendation
    );

    const newBrief = db.prepare('SELECT * FROM daily_briefs WHERE date = ? ORDER BY id DESC LIMIT 1').get(today) as Record<string, unknown>;

    return NextResponse.json({ brief: mapBrief(newBrief) });
  } catch (err) {
    console.error('Brief POST error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM daily_briefs ORDER BY date DESC, id DESC LIMIT 7')
      .all() as Record<string, unknown>[];
    const briefs = rows.map(mapBrief);
    return NextResponse.json({ briefs });
  } catch (err) {
    console.error('Brief GET error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
