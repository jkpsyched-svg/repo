import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Project, ProjectCounts } from '@/types';

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

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM projects ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END').all() as Record<string, unknown>[];
    const projects = rows.map(mapProject);

    const counts: ProjectCounts = {
      building: projects.filter((p) => p.status === 'building').length,
      blocked: projects.filter((p) => p.status === 'blocked').length,
      idea: projects.filter((p) => p.status === 'idea').length,
      paused: projects.filter((p) => p.status === 'paused').length,
      released: projects.filter((p) => p.status === 'released').length,
    };

    return NextResponse.json({ projects, counts });
  } catch (err) {
    console.error('Projects API error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: number; status: string };
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    db.prepare('UPDATE projects SET status = ?, last_updated = ? WHERE id = ?').run(
      body.status,
      today,
      body.id,
    );
    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(body.id) as Record<string, unknown>;
    return NextResponse.json({ project: mapProject(updated) });
  } catch (err) {
    console.error('Projects PATCH error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
