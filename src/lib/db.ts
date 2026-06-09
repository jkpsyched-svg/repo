import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'personal_xo.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  initSchema(_db);
  seedIfNeeded(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      category TEXT,
      vendor TEXT,
      project TEXT,
      recurring INTEGER DEFAULT 0,
      note TEXT,
      decision_needed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT NOT NULL,
      monthly_cost REAL,
      annual_cost REAL,
      billing_cycle TEXT CHECK(billing_cycle IN ('monthly','annual')),
      next_billing_date TEXT,
      purpose TEXT,
      owner TEXT,
      roi_score INTEGER CHECK(roi_score BETWEEN 1 AND 10),
      status TEXT CHECK(status IN ('keep','cancel','review','seasonal')),
      next_review_date TEXT,
      cancel_risk INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      context TEXT,
      options TEXT,
      ai_recommendation TEXT,
      priority TEXT CHECK(priority IN ('critical','high','medium','low')),
      deadline TEXT,
      status TEXT CHECK(status IN ('pending','decided','blocked')),
      final_decision TEXT,
      related_project TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      category TEXT,
      status TEXT CHECK(status IN ('idea','building','blocked','released','paused')),
      next_action TEXT,
      blocker TEXT,
      owner TEXT,
      decision_needed INTEGER DEFAULT 0,
      last_updated TEXT,
      priority TEXT CHECK(priority IN ('critical','high','medium','low'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT CHECK(alert_type IN ('money','project','decision','automation','subscription')),
      message TEXT NOT NULL,
      urgency TEXT CHECK(urgency IN ('critical','high','normal')),
      source TEXT,
      action_required INTEGER DEFAULT 1,
      resolved INTEGER DEFAULT 0,
      created_date TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      money_summary TEXT,
      decision_summary TEXT,
      project_summary TEXT,
      top3_actions TEXT,
      risks TEXT,
      what_to_ignore TEXT,
      final_recommendation TEXT,
      status TEXT CHECK(status IN ('draft','published')) DEFAULT 'draft'
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function seedIfNeeded(db: Database.Database): void {
  const seeded = db.prepare('SELECT value FROM _meta WHERE key = ?').get('seeded') as { value: string } | undefined;
  if (seeded) return;

  const seedTx = db.transaction(() => {
    // ── TRANSACTIONS (real May–June 2026 charges) ─────────────────────────
    const insertTx = db.prepare(`
      INSERT INTO transactions (date, amount, type, category, vendor, project, recurring, note, decision_needed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const transactions = [
      ['2026-05-06', -214.00, 'expense', 'AI Tools', 'Anthropic Claude', 'JKRLZ_OPS', 1, 'Monthly API + Pro — charged on 6th', 0],
      ['2026-05-09', -59.99,  'expense', 'Music Distro', 'Amuse', 'D2_JuKeRLZ', 1, 'Annual plan renewed 5/9/26', 0],
      ['2026-05-09', -288.00, 'expense', 'Music AI', 'Loudly', 'D2_JuKeRLZ', 1, 'Annual plan renewed 5/9/26', 0],
      ['2026-05-12', -205.44, 'expense', 'Music Mastering', 'LANDR Studio', 'D2_JuKeRLZ', 1, 'Annual renewal — charged 5/12/26', 0],
      ['2026-05-29', -267.49, 'expense', 'AI Tools', 'Google AI Ultra (30TB)', 'JKRLZ_OPS', 1, 'Monthly — $249.99 + ~7% tax', 0],
      ['2026-06-06', -214.00, 'expense', 'AI Tools', 'Anthropic Claude', 'JKRLZ_OPS', 1, 'Monthly API + Pro — June charge', 0],
    ];
    for (const t of transactions) {
      insertTx.run(...(t as Parameters<typeof insertTx.run>));
    }

    // ── SUBSCRIPTIONS (real — 15 tools, verified 2026-06-05) ──────────────
    const insertSub = db.prepare(`
      INSERT INTO subscriptions
        (tool_name, monthly_cost, annual_cost, billing_cycle, next_billing_date,
         purpose, owner, roi_score, status, next_review_date, cancel_risk, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const subscriptions: (string | number | null)[][] = [
      ['Google AI Ultra (30TB)', 249.99, 2999.88, 'monthly', '2026-06-29',
        '30TB storage + YouTube Premium + Gemini Deep Think + Veo 3.1 + NotebookLM + Flow',
        'XO', 9, 'keep', '2026-07-10', 0,
        'Charged ~29th as $267.49 (= $249.99 + ~7% tax). Includes YouTube Premium. Core creative + storage.'],
      ['Anthropic Claude Max 20x', 214.00, 2568.00, 'monthly', '2026-07-06',
        'Core AI brain — Claude Max 20x (primary AI tool across all divisions)',
        'XO', 10, 'keep', '2026-07-10', 0,
        'Charged on 6th. Essential — do not cancel. Powers all agent work.'],
      ['ChatGPT Plus', 25.00, 300.00, 'monthly', '2026-06-12',
        'AI assistant — cross-validation + GPT Image 2',
        'XO', 8, 'keep', '2026-07-01', 0,
        'Charged on 12th. GPT Image 2 access for Visual Factory.'],
      ['Meta (Instagram Artist)', 11.99, 143.88, 'monthly', null,
        'Instagram Artist account — creator/blue verification for music brand',
        'CEO', 7, 'keep', '2026-07-01', 0,
        'Confirmed: Artist account for social + music brand.'],
      ['X.com Premium', 20.00, 240.00, 'monthly', '2026-06-18',
        'Social signal intelligence + creator tools',
        'S2', 6, 'keep', '2026-07-10', 0,
        'Anchor tool for Social Intelligence OS.'],
      ['Notion Business', 21.40, 256.80, 'annual', '2027-03-23',
        'Knowledge base + project management + company OS',
        'S1', 8, 'keep', '2026-07-10', 0,
        'Annual $256.80. Renews Mar 23, 2027.'],
      ['Kling AI', 24.42, 293.04, 'annual', '2026-08-25',
        'AI video generation — JuKeCalm ASMR loop production',
        'S7', 7, 'keep', '2026-08-01', 0,
        'Renewal 8/25/26. Core JuKeCalm pipeline tool.'],
      ['Loudly', 24.00, 288.00, 'annual', '2027-05-09',
        'AI music gen + InstrumentalRLZ / JuKeCalm distribution',
        'S7', 6, 'keep', '2026-08-01', 0,
        'Renewed 5/9/26 ($288). Next renewal 5/9/27.'],
      ['Leonardo AI', 19.20, 230.40, 'annual', '2026-07-10',
        'AI image generation — Visual Factory + JuKeCalm seeds',
        'S7', 5, 'review', '2026-07-01', 1,
        'Renewal 7/10/26 ($230.40). Evaluate: Canva + GPT Image 2 may cover this.'],
      ['Typecast AI', 29.00, 347.88, 'annual', '2026-08-26',
        'AI voice / narration — SUPERSEDED by Veo Omni native voice',
        'S7', 3, 'cancel', '2026-08-01', 1,
        'Veo Omni generates narration natively (SPRINT-001 pivot 5/30). TypeCast no longer in pipeline. Cancel before 8/26 renewal. Save $347.88/yr.'],
      ['LANDR Studio', 17.12, 205.44, 'annual', '2027-05-12',
        'Music mastering + stem separation',
        'S7', 6, 'keep', '2026-08-01', 0,
        'Renewed 5/12/26. TrapSoulRLZ + RareSerenRLZ distribution.'],
      ['Suno Premier', 8.71, 104.52, 'annual', '2026-07-10',
        'AI music synthesis — Suno v5.5 (Music Middleware core)',
        'S7', 8, 'keep', '2026-07-10', 0,
        'Renewal 7/10/26. Core Music Middleware tool.'],
      ['Canva Pro', 10.00, 120.00, 'annual', '2026-09-10',
        'Design + social content creation + MCP integration',
        'S7', 7, 'keep', '2026-09-01', 0,
        'Renewal 9/10/26. Evaluate vs free tier at renewal.'],
      ['Amuse Pro', 5.00, 59.99, 'annual', '2027-05-09',
        'Music distribution — LiminalRLZ (JRizz/KLea/SolZ)',
        'S7', 6, 'keep', '2026-08-01', 0,
        'Renewed 5/9/26. Serves LiminalRLZ only. No overlap with Ditto.'],
      ['Ditto Music Pro', 4.92, 59.00, 'annual', '2026-08-17',
        'Distribution — PsalmRLZ (JKPsalm) + JKPsycheD legacy (3 albums)',
        'S7', 8, 'keep', '2026-08-01', 0,
        'JKPsycheD frozen catalog + JKPsalm new releases. Renewal 8/17/26.'],
    ];
    for (const s of subscriptions) {
      insertSub.run(...(s as Parameters<typeof insertSub.run>));
    }

    // ── DECISIONS (real queue state, 2026-06-05) ──────────────────────────
    const insertDec = db.prepare(`
      INSERT INTO decisions (title, context, options, ai_recommendation, priority, deadline, status, final_decision, related_project)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const decisions: (string | null)[][] = [
      // PENDING
      ['JKLabZ — new content tools (4) adoption decision',
        'ElevenLabs (TTS), CapCut/OpusClip (auto-caption), Midjourney (thumbnails), ManyChat (comment→DM). From "10M View Strategy" analysis. Current 9-CORE routing lock.',
        'Adopt selectively / DEFER all / Test one at a time',
        'DEFER — tool sprawl doctrine (9 CORE locked 2026-05-22). Evaluate ROI only after JKLabZ Ep.01 ships.',
        'medium', '2026-06-30', 'pending', null, 'JKLabZ'],
      ['Typecast AI — cancel before 8/26 renewal',
        'Veo Omni generates narration natively (pivot 5/30). TypeCast eliminated from pipeline entirely. $347.88/yr savings.',
        'Cancel now / Downgrade / Keep',
        'Cancel. Veo Omni superseded TypeCast — no longer in any pipeline. Save $347.88/yr.',
        'high', '2026-08-20', 'pending', null, 'TOOLSTACK-AUDIT-01'],
      ['30-day freeze lift — post-freeze priority order',
        'Freeze ends 2026-06-10. Must decide which backlog items activate first. B1-B8 queued.',
        'Follow backlog order B1→B8 / Reprioritize / CEO picks top 3',
        'Follow existing backlog order. B1 JuKeCalm proof first (blocked by ACTIVE-3).',
        'high', '2026-06-10', 'pending', null, null],
      ['jkrlz-hub-redesign — replace LIVE site?',
        'Shadow build at jkrlz-hub-redesign.vercel.app. Lighthouse 100/100/100. Awwwards-tier AUWA aesthetic. Current LIVE = jkrlz-hub (Next.js 14).',
        'Replace LIVE now / Keep as shadow / Merge best elements',
        'Replace LIVE. The redesign is superior in every metric. Schedule cutover after freeze lift.',
        'high', '2026-06-12', 'pending', null, 'jkrlz-hub-redesign'],
      // DECIDED (recent)
      ['✅ SPRINT-001 — 14/14 JKDailyMana Shorts LIVE',
        'All 14 daily devotional shorts published to @JKDailyMana. Manual VEO→ffmpeg→Cloudinary→YouTube path. Sprint complete inside 6/8 window.',
        'Close sprint / Extend / Automate next',
        'Sprint COMPLETE. Automation rebuild deferred post-6/8.',
        'critical', '2026-06-08', 'decided', 'COMPLETE — 14/14 LIVE', 'SPRINT-001'],
      ['✅ BreathOS channel — merge into JuKeCalm',
        'JK6 decision 6/3: "JuKeBreathOS는 JuKeCalm하고 병합했어." BreathOS = JuKeCalm breathwork sub-angle.',
        'Merge / Keep separate / Archive',
        'Merged into JuKeCalm. BreathOS removed from Portfolio L8.',
        'medium', '2026-06-03', 'decided', 'MERGED into JuKeCalm', null],
      ['✅ Veo Policy — model branch adopted',
        'Manual conflict: old lock ("always Omni Flash") vs new best practice (Veo 3.1 for new cuts). XO constructive dissent → JK6 GO.',
        'Adopt model branch / Keep old lock',
        'Adopted. Veo 3.1=new cuts, Omni Flash=edits, Nano/Imagen=reference, SceneBuilder=linking.',
        'high', '2026-06-04', 'decided', 'ADOPTED — 4-layer model branch', null],
      ['✅ XO Autonomy — D30 RENEWED',
        'Day-30 analysis: escalation 100% hard gate PASSED, reversal 0, adoption 97%, hit 90%. JK6 ratified "GO 한 줄이면 끝."',
        'Renew / Restrict / Expand',
        'Renewed unchanged. One borderline (miss 4 vs target ≤3) — all AAR-captured.',
        'critical', '2026-06-14', 'decided', 'RENEWED — envelope unchanged', null],
    ];
    for (const d of decisions) {
      insertDec.run(...(d as Parameters<typeof insertDec.run>));
    }

    // ── PROJECTS (full empire, 2026-06-05) ────────────────────────────────
    const insertProj = db.prepare(`
      INSERT INTO projects (project_name, category, status, next_action, blocker, owner, decision_needed, last_updated, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const projects: (string | number | null)[][] = [
      // === ⓪ FOUNDATION ===
      ['PERSONALXO-REAL-DATA-01', 'D0_Foundation', 'building',
        'Populate with real empire data (50+ projects, current subscriptions, decisions)', null,
        'CEO', 0, '2026-06-05', 'critical'],
      ['TOOLSTACK-AUDIT-01', 'D0_Foundation', 'building',
        'Typecast cancel (Veo superseded). Leonardo review at 7/10 renewal.', null,
        'CEO+S8', 1, '2026-06-05', 'critical'],
      ['Personal XO (app)', 'D0_Foundation', 'released',
        'MVP running at localhost:3000. 7 modules. SQLite. Needs real data.', null,
        'CEO', 0, '2026-06-05', 'critical'],

      // === ① MUSIC OPS ===
      ['JUKEMUSIC-FIRST-TRACK-01', 'D2_Music', 'building',
        'JRizz "Neon Pulse" — audio done, QA 91+. CEO spot-check → Amuse Pro submit.', null,
        'JK6+S7', 0, '2026-06-05', 'critical'],
      ['JKPsalm First Track (M2)', 'D2_Music', 'building',
        'Scaffold done. CEO seed 시편 23편 → lyrics + S9 APPROVED. Suno prompt GENERATION-READY.',
        'CEO lyric finalization', 'S9+S7', 0, '2026-05-31', 'high'],
      ['SPRINT-001 JKDailyMana', 'D2_Music', 'released',
        '14/14 Shorts LIVE on @JKDailyMana. Sprint COMPLETE. Automation rebuild deferred.', null,
        'S3', 0, '2026-06-05', 'high'],
      ['jkrlz-audio-pipeline', 'D2_Music', 'released',
        'Fully built. Suno→Mixea→Cover Art→Distro→YT. Express + Playwright on :3210.', null,
        'S3', 0, '2026-05-16', 'medium'],
      ['JUKEMUSIC_MIDDLEWARE', 'D2_Music', 'released',
        '8-stage pipeline (10 gates). Templates ready. Active production system.', null,
        'S7', 0, '2026-05-11', 'medium'],
      ['JUKECALM_ASMR_FACTORY', 'D2_Music', 'released',
        'Python prompt engine. 12 months generated. Local CLI.', null,
        'S7', 0, '2026-05-11', 'low'],
      ['JKRLZ_Trailer_Pipeline', 'D2_Music', 'building',
        'FastAPI worker. 4 visual styles × 4 channels. Needs first /create-package validation.', null,
        'S7', 0, '2026-05-11', 'high'],

      // === ② MONETIZATION ===
      ['JKLabZ Ep.01 First Publish', 'D5_Commerce', 'building',
        'Amazon affiliate Ep.01 "Soft Story". SiteStripe links → render → upload @JKLabZ.', null,
        'JK6', 0, '2026-06-04', 'high'],
      ['NoctiR Shorts Automation', 'D6_JuKeCalm', 'released',
        '61 files (10 eps × 6 outputs). CEO to produce S05 first.', null,
        'S3', 0, '2026-05-16', 'medium'],

      // === ⑤ PRODUCT LAB (SaaS) ===
      ['WhoAmILenZ', 'D3_SaaS', 'released',
        'MVP built (mock data). Permission-based intent sharing. Next: real Supabase backend.',
        null, 'S3', 0, '2026-05-28', 'medium'],
      ['RealPass NY', 'D3_SaaS', 'released',
        'MVP built. 11 modules. Stripe test mode. Legal counsel needed for go-live.',
        'Legal review ($500-2k) before Stripe live mode', 'S5', 0, '2026-05-25', 'medium'],
      ['SkillPilot AI', 'D3_SaaS', 'released',
        'MVP built. 8 learning tracks. AI assessment. Vercel deployed.',
        null, 'S5', 0, '2026-05-20', 'low'],
      ['MissNotRLZ', 'D3_SaaS', 'released',
        'MVP built. AI revenue recovery for local biz. Twilio + Vercel.',
        null, 'REV', 0, '2026-05-20', 'medium'],
      ['ParentOS', 'D3_SaaS', 'released',
        'MVP built. AI parenting coach ages 3-12. Demo mode + real Supabase.',
        null, 'S3', 0, '2026-05-25', 'low'],
      ['KidOS Quest AI', 'D3_SaaS', 'building',
        'Built scaffold with AI safety. 4-layer child safety pipeline.', null,
        'S3+S5', 0, '2026-05-15', 'low'],
      ['Variance Guard', 'D3_SaaS', 'released',
        'MVP deployed. Responsible gambling tool. S9 ethics cleared.', null,
        'S9', 0, '2026-05-22', 'low'],

      // === ⑥ CIVIC ===
      ['SignalOS', 'D4_Civic', 'building',
        'Phase 1 scaffold. Civic accountability. S9 Ethics Policy v0.1 done. Open Q 1-8 pending CEO.',
        'CEO answers Open Q 1-8 + legal counsel search', 'CEO+S5+S9', 1, '2026-05-15', 'medium'],
      ['ForgeXOS Empire (Grok Track)', 'D4_Civic', 'building',
        '8 civic/veteran/govtech agents. On-device AI. Grok Build track. Pilot EdgeShield first.',
        null, 'D1+HQ', 0, '2026-06-04', 'medium'],

      // === 🌐 WEBSITES ===
      ['jkrlz.com (LIVE hub)', 'Web', 'released',
        'Next.js 14. Discovery hub for 11 YT channels. LIVE on Vercel.', null,
        'S3', 0, '2026-05-24', 'high'],
      ['jkrlz-hub-redesign (shadow)', 'Web', 'released',
        'Next.js 16. Awwwards-tier AUWA aesthetic. Lighthouse 100/100/100. Ready to replace LIVE.',
        'CEO decision: replace LIVE site?', 'S3', 1, '2026-06-01', 'high'],
      ['JRizz Artist Site', 'Web', 'building',
        'Polished UI built. Content placeholder. Needs real streaming links after M1 publish.', null,
        'S7', 0, '2026-05-19', 'medium'],
      ['KLea / SolZ / SoundJK / TrapSoulZar Sites', 'Web', 'idea',
        '4 placeholder templates (~7KB each). All "coming soon". Need real content.', null,
        'S7', 0, '2026-05-19', 'low'],
      ['NoctiR Netlify (hub v2)', 'Web', 'released',
        '44KB comprehensive hub. YouTube API integration. A/B hero testing. Newsletter.', null,
        'S3', 0, '2026-05-22', 'low'],

      // === 🤖 AI INFRASTRUCTURE ===
      ['jkrlz-design-system', 'Infra', 'released',
        'React + TS component library v0.2. Token-driven. npm package.', null,
        'S7', 0, '2026-05-20', 'medium'],
      ['jkrlz-memory-mcp', 'Infra', 'released',
        '5-tier memory governance MCP. 44 tests passing. Claude MCP server.', null,
        'S1', 0, '2026-05-15', 'medium'],
      ['jkrlz-os-mcp', 'Infra', 'released',
        'Company OS R/W MCP. 19 tools. 6-table SSOT. Claude MCP server.', null,
        'S1', 0, '2026-05-15', 'medium'],
      ['jkrlz-task-isolation-mcp', 'Infra', 'released',
        'Session deviation prevention MCP. 8 tools. Supabase backend LIVE.', null,
        'S6', 0, '2026-05-31', 'low'],
      ['jkrlz-ai-concierge', 'Infra', 'idea',
        'Shared brand AI widget. Next.js 16 scaffold. Guardrail policy locked.',
        'Chained to OPORD-014 Phase 3 — post-freeze', 'S3', 0, '2026-05-25', 'low'],

      // === BACKLOG ===
      ['JUKECALM-3SAMPLE-PROOF-01', 'D2_Music', 'idea',
        'B1: Generate 3 JuKeCalm sample videos. After JUKEMUSIC-FIRST-TRACK-01.',
        'Blocked by ACTIVE-3 (first music track)', 'S7', 0, '2026-05-11', 'medium'],
      ['AEGIS-PQC-STRATEGY-01', 'D4_AEGIS', 'idea',
        'B2: Build Aegis PQC pitch module. After freeze lift.',
        'Blocked by freeze (ends 2026-06-10)', 'S8+S9', 0, '2026-05-11', 'low'],
      ['JKRLZ_Agent_Command_Center', 'JKRLZ_OPS', 'paused',
        'B8: ON-HOLD. Blocked by Promptfoo 30-day verdict + Trailer validation.',
        'Promptfoo verdict 2026-06-11 + Trailer validation', 'S6', 0, '2026-05-11', 'low'],
    ];
    for (const p of projects) {
      insertProj.run(...(p as Parameters<typeof insertProj.run>));
    }

    // ── ALERTS (real, 2026-06-05) ────────────────────────────────────────
    const insertAlert = db.prepare(`
      INSERT INTO alerts (alert_type, message, urgency, source, action_required, resolved)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const alerts: (string | number)[][] = [
      // CRITICAL
      ['money',
        '🔴 REVENUE = $0. All 16 MVPs built, none generating revenue. Ship JRizz M1 "Neon Pulse" to break zero.',
        'critical', 'Empire Health — DEPTH axis', 1, 0],
      ['project',
        '🔴 30-DAY FREEZE ENDS 2026-06-10 (5 days). Prepare post-freeze priority activation. B1-B8 queued.',
        'critical', 'Master Mission Queue', 1, 0],

      // HIGH
      ['subscription',
        '⚠️ Typecast AI — CANCEL before 2026-08-26 renewal ($347.88/yr). Veo Omni superseded it.',
        'high', 'TOOLSTACK-AUDIT-01', 1, 0],
      ['subscription',
        '⚠️ Leonardo AI — REVIEW before 2026-07-10 renewal ($230.40/yr). GPT Image 2 + Canva may cover it.',
        'high', 'Subscription Audit', 1, 0],
      ['project',
        '⚠️ JRizz M1 "Neon Pulse" — audio done, QA 91+. CEO spot-check needed → Amuse Pro submit.',
        'high', 'JUKEMUSIC-FIRST-TRACK-01', 1, 0],
      ['automation',
        '⚠️ YouTube API key exposed in NOCTIR_NETLIFY_DEPLOY/index.html. Restrict by referrer in Google Cloud Console.',
        'high', 'Security — API Key Exposure', 1, 0],

      // NORMAL
      ['project',
        '✅ SPRINT-001 COMPLETE — 14/14 JKDailyMana Shorts LIVE on @JKDailyMana.',
        'normal', 'SPRINT-001', 0, 1],
      ['subscription',
        '✅ Tool spend confirmed: $684.75/month ($8,217/year) across 15 subscriptions. Covered by pension + VA.',
        'normal', 'Money Radar', 0, 1],
      ['project',
        'jkrlz-hub-redesign ready to replace LIVE site. Lighthouse 100/100/100. Awaiting CEO GO.',
        'normal', 'Web — jkrlz.com', 1, 0],
      ['project',
        'Promptfoo 30-day trial verdict due 2026-06-11. Blocks Agent Command Center start.',
        'normal', 'TOOLSTACK-PROMPTFOO-01', 0, 0],
      ['project',
        '4 artist placeholder sites (KLea, SolZ, SoundJK, TrapSoulZar) still "coming soon". Low priority until music releases.',
        'normal', 'Web — Artist Sites', 0, 0],
    ];
    for (const a of alerts) {
      insertAlert.run(...(a as Parameters<typeof insertAlert.run>));
    }

    // Mark as seeded
    db.prepare('INSERT INTO _meta (key, value) VALUES (?, ?)').run('seeded', new Date().toISOString());
  });

  seedTx();
}
