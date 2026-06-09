import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Transaction } from '@/types';

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

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all() as Record<string, unknown>[];
    const transactions = rows.map(mapTransaction);

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const subs = db.prepare('SELECT monthly_cost FROM subscriptions').all() as { monthly_cost: number | null }[];
    const subscriptionBurn = subs.reduce((s, sub) => s + (sub.monthly_cost || 0), 0);

    const projectRows = db.prepare('SELECT project_name FROM projects ORDER BY project_name ASC').all() as { project_name: string }[];
    const projects = projectRows.map((p) => p.project_name);

    return NextResponse.json({
      transactions,
      projects,
      stats: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        subscriptionBurn,
      },
    });
  } catch (err) {
    console.error('Money API error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, amount, type, category, vendor, project, recurring, note, decision_needed } = body;

    if (!date || amount === undefined || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO transactions (date, amount, type, category, vendor, project, recurring, note, decision_needed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      date,
      amount,
      type,
      category || null,
      vendor || null,
      project || null,
      recurring ? 1 : 0,
      note || null,
      decision_needed ? 1 : 0
    );

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Money POST error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, date, amount, type, category, vendor, project, recurring, note, decision_needed } = body;

    if (!id || !date || amount === undefined || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      UPDATE transactions
      SET date = ?, amount = ?, type = ?, category = ?, vendor = ?, project = ?, recurring = ?, note = ?, decision_needed = ?
      WHERE id = ?
    `).run(
      date,
      amount,
      type,
      category || null,
      vendor || null,
      project || null,
      recurring ? 1 : 0,
      note || null,
      decision_needed ? 1 : 0,
      id
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Money PATCH error:', err);
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
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Money DELETE error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
