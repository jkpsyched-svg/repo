import type { Transaction, Decision, Project, Subscription, Alert, DailyBriefData } from '@/types';

export function generateDailyBrief(data: {
  transactions: Transaction[];
  decisions: Decision[];
  projects: Project[];
  subscriptions: Subscription[];
  alerts: Alert[];
}): DailyBriefData {
  // Compute stats
  const income = data.transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expenses = data.transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;

  const pendingDecisions = data.decisions.filter((d) => d.status === 'pending');
  const criticalDecisions = pendingDecisions.filter((d) => d.priority === 'critical');
  const blockedProjects = data.projects.filter((p) => p.status === 'blocked');
  const criticalAlerts = data.alerts.filter((a) => a.urgency === 'critical' && !a.resolved);
  const lowRoiSubs = data.subscriptions.filter(
    (s) => s.roiScore !== null && s.roiScore < 6
  );
  const subBurn = data.subscriptions.reduce((s, sub) => s + (sub.monthlyCost || 0), 0);

  // Build sections
  const moneySummary = `Income: $${income.toFixed(2)} | Expenses: $${expenses.toFixed(2)} | Net: ${net >= 0 ? '+' : ''}$${net.toFixed(2)} | Tool burn: $${subBurn.toFixed(2)}/month`;

  const decisionSummary = `${pendingDecisions.length} pending decisions (${criticalDecisions.length} critical). ${
    criticalDecisions.map((d) => d.title).join(', ') || 'None critical.'
  }`;

  const projectSummary = `${blockedProjects.length} blocked projects: ${
    blockedProjects.map((p) => p.projectName).join(', ') || 'None blocked.'
  }`;

  // Top 3 actions
  const top3: string[] = [];
  if (criticalDecisions.length > 0)
    top3.push(`DECIDE: ${criticalDecisions[0].title}`);
  if (blockedProjects.length > 0)
    top3.push(`UNBLOCK: ${blockedProjects[0].projectName} — ${blockedProjects[0].blocker}`);
  if (lowRoiSubs.length > 0)
    top3.push(
      `AUDIT: ${lowRoiSubs[0].toolName} (ROI: ${lowRoiSubs[0].roiScore}/10) — review before renewal`
    );
  while (top3.length < 3) top3.push('Review daily brief for outstanding items');

  const risks =
    criticalAlerts.map((a) => a.message).join(' | ') || 'No critical risks today.';

  const whatToIgnoreToday =
    'Banking API research (Phase 5). Make.com expansion (Phase 3). Mobile app planning (post-MVP). Low-priority ideas without Mission Cards.';

  const finalRecommendation =
    criticalDecisions.length > 0
      ? `Priority action: resolve ${criticalDecisions.length} critical decision(s) before end of day. Then: ${
          blockedProjects.length > 0
            ? 'clear project blocker on ' + blockedProjects[0].projectName
            : 'proceed with scheduled builds'
        }.`
      : `No critical decisions pending. Focus on: ${
          data.projects
            .filter((p) => p.status === 'building')
            .map((p) => p.projectName)
            .join(', ') || 'scheduled work'
        }.`;

  return {
    moneySummary,
    decisionSummary,
    projectSummary,
    top3Actions: top3.join('\n'),
    risks,
    whatToIgnoreToday,
    finalRecommendation,
  };
}
