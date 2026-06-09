import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface CommentRow {
  id: number;
  entity_type: string;
  entity_id: number | null;
  body: string;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');

    const db = getDb();

    let rows: CommentRow[];
    if (entityType && entityId) {
      rows = db
        .prepare('SELECT * FROM comments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC')
        .all(entityType, Number(entityId)) as CommentRow[];
    } else if (entityType && !entityId) {
      // General comments for an entity type (entityId = null)
      rows = db
        .prepare('SELECT * FROM comments WHERE entity_type = ? AND entity_id IS NULL ORDER BY created_at ASC')
        .all(entityType) as CommentRow[];
    } else {
      rows = db
        .prepare('SELECT * FROM comments ORDER BY created_at DESC LIMIT 50')
        .all() as CommentRow[];
    }

    return NextResponse.json({ comments: rows });
  } catch (err) {
    console.error('Comments GET error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      entity_type: string;
      entity_id?: number | null;
      body: string;
    };

    if (!body.body?.trim()) {
      return NextResponse.json({ error: 'Comment body required' }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare('INSERT INTO comments (entity_type, entity_id, body) VALUES (?, ?, ?)')
      .run(body.entity_type, body.entity_id ?? null, body.body.trim());

    const created = db
      .prepare('SELECT * FROM comments WHERE id = ?')
      .get(result.lastInsertRowid) as CommentRow;

    return NextResponse.json({ comment: created });
  } catch (err) {
    console.error('Comments POST error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: number };
    const db = getDb();
    db.prepare('DELETE FROM comments WHERE id = ?').run(body.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Comments DELETE error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
