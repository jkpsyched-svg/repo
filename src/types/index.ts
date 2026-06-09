export interface Transaction {
  id: number;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string | null;
  vendor: string | null;
  project: string | null;
  recurring: number;
  note: string | null;
  decisionNeeded: number;
  createdAt: string;
}

export interface Subscription {
  id: number;
  toolName: string;
  monthlyCost: number | null;
  annualCost: number | null;
  billingCycle: 'monthly' | 'annual' | null;
  nextBillingDate: string | null;
  purpose: string | null;
  owner: string | null;
  roiScore: number | null;
  status: 'keep' | 'cancel' | 'review' | 'seasonal' | null;
  nextReviewDate: string | null;
  cancelRisk: number;
  notes: string | null;
}

export interface Decision {
  id: number;
  title: string;
  context: string | null;
  options: string | null;
  aiRecommendation: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low' | null;
  deadline: string | null;
  status: 'pending' | 'decided' | 'blocked' | null;
  finalDecision: string | null;
  relatedProject: string | null;
  createdAt: string;
}

export interface Project {
  id: number;
  projectName: string;
  category: string | null;
  status: 'idea' | 'building' | 'blocked' | 'released' | 'paused' | null;
  nextAction: string | null;
  blocker: string | null;
  owner: string | null;
  decisionNeeded: number;
  lastUpdated: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low' | null;
}

export interface Alert {
  id: number;
  alertType: 'money' | 'project' | 'decision' | 'automation' | 'subscription' | null;
  message: string;
  urgency: 'critical' | 'high' | 'normal' | null;
  source: string | null;
  actionRequired: number;
  resolved: number;
  createdDate: string;
}

export interface DailyBrief {
  id: number;
  date: string;
  moneySummary: string | null;
  decisionSummary: string | null;
  projectSummary: string | null;
  top3Actions: string | null;
  risks: string | null;
  whatToIgnore: string | null;
  finalRecommendation: string | null;
  status: 'draft' | 'published';
}

export interface DailyBriefData {
  moneySummary: string;
  decisionSummary: string;
  projectSummary: string;
  top3Actions: string;
  risks: string;
  whatToIgnoreToday: string;
  finalRecommendation: string;
}

export interface MoneyStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  subscriptionBurn: number;
  transactions: Transaction[];
}

export interface ProjectCounts {
  building: number;
  blocked: number;
  idea: number;
  paused: number;
  released: number;
}
