import type { departmentTypeEnum } from "@ai-company/db/schema/departments";
import type { companyStageEnum } from "@ai-company/db/schema/companies";

// Department type from the enum
export type DepartmentType = (typeof departmentTypeEnum.enumValues)[number];

// Company stage from the enum
export type CompanyStage = (typeof companyStageEnum.enumValues)[number];

// Message types for chat
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// Metric data structure
export interface MetricData {
  name: string;
  slug: string;
  value: number;
  previousValue?: number;
  unit?: string;
  trend: "up" | "down" | "stable";
  changePercent?: number;
  recordedAt: Date;
}

// A context document attached to a department
export interface DepartmentDocumentData {
  category: string;
  title: string;
  content: string;
}

// Department context for AI agents
export interface DepartmentContext {
  departmentType: DepartmentType;
  companyName: string;
  companyStage: CompanyStage;
  headcount?: number;
  goals?: string[];
  customInstructions?: string;
  documents?: DepartmentDocumentData[];
}

// Company context for orchestration AI
export interface CompanyContext {
  name: string;
  stage: CompanyStage;
  employeeCount?: number;
  arrCents?: number;
  runwayMonths?: number;
  industry?: string;
  objectives?: string[];
}

// Analysis result from department agent
export interface DepartmentAnalysis {
  departmentType: DepartmentType;
  healthScore: number; // 0-100
  summary: string;
  keyInsights: string[];
  concerns: AnalysisConcern[];
  opportunities: AnalysisOpportunity[];
  trends: MetricTrend[];
}

export interface AnalysisConcern {
  severity: "critical" | "warning" | "watch";
  title: string;
  description: string;
  suggestedAction?: string;
}

export interface AnalysisOpportunity {
  title: string;
  description: string;
  potentialImpact: string;
  effort: "low" | "medium" | "high";
}

export interface MetricTrend {
  metricName: string;
  direction: "up" | "down" | "stable";
  changePercent: number;
  assessment: "positive" | "negative" | "neutral";
}

// Recommendation types
export interface Recommendation {
  type: "tactical" | "strategic" | "resource_allocation";
  priority: "critical" | "high" | "medium" | "low";
  departmentTypes: DepartmentType[];
  title: string;
  description: string;
  impact: string;
  effort: string;
  rationale: string;
  alternatives?: Alternative[];
  confidenceScore: number; // 0-100
}

export interface Alternative {
  title: string;
  description: string;
  tradeoffs: string;
}

// Alert generation
export interface GeneratedAlert {
  severity: "critical" | "warning" | "watch" | "opportunity";
  departmentType?: DepartmentType;
  title: string;
  message: string;
  aiInsight?: string;
  aiRecommendation?: string;
  triggerValue?: string;
  thresholdValue?: string;
}

// Company-wide analysis (from Orchestration AI)
export interface CompanyAnalysis {
  overallHealthScore: number; // 0-100
  summary: string;
  departmentHealthScores: Record<DepartmentType, number>;
  crossDepartmentInsights: CrossDepartmentInsight[];
  bottlenecks: Bottleneck[];
  strategicRecommendations: Recommendation[];
  stageTransitionReadiness?: StageTransitionAssessment;
}

export interface CrossDepartmentInsight {
  title: string;
  description: string;
  affectedDepartments: DepartmentType[];
  impact: "high" | "medium" | "low";
}

export interface Bottleneck {
  title: string;
  description: string;
  sourceDepartment: DepartmentType;
  affectedDepartments: DepartmentType[];
  suggestedResolution: string;
  urgency: "immediate" | "soon" | "monitor";
}

export interface StageTransitionAssessment {
  currentStage: CompanyStage;
  nextStage: CompanyStage;
  readinessScore: number; // 0-100
  readyFactors: string[];
  gapFactors: string[];
  recommendations: string[];
}

// AI response metadata
export interface AIResponseMetadata {
  model: string;
  inputTokens: number;
  outputTokens: number;
  responseTimeMs: number;
}

// Chat response
export interface ChatResponse {
  content: string;
  metadata: AIResponseMetadata;
}

// Agent configuration
export interface AgentConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
