import { BaseAgent } from "./base-agent";
import {
  getOrchestrationSystemPrompt,
  departmentNames,
} from "../prompts/system-prompts";
import type {
  DepartmentType,
  CompanyContext,
  DepartmentAnalysis,
  CompanyAnalysis,
  Recommendation,
  Bottleneck,
  StageTransitionAssessment,
  AgentConfig,
} from "../types";

export class OrchestrationAgent extends BaseAgent {
  private context: CompanyContext;
  private departmentSummaries: Record<DepartmentType, string>;

  constructor(
    apiKey: string,
    context: CompanyContext,
    departmentSummaries: Record<DepartmentType, string> = {} as Record<DepartmentType, string>,
    config?: AgentConfig
  ) {
    super(apiKey, config);
    this.context = context;
    this.departmentSummaries = departmentSummaries;
  }

  updateContext(context: Partial<CompanyContext>): void {
    this.context = { ...this.context, ...context };
  }

  updateDepartmentSummaries(summaries: Partial<Record<DepartmentType, string>>): void {
    this.departmentSummaries = { ...this.departmentSummaries, ...summaries };
  }

  protected getSystemPrompt(): string {
    return getOrchestrationSystemPrompt(this.context, this.departmentSummaries);
  }

  async synthesize(
    departmentAnalyses: DepartmentAnalysis[]
  ): Promise<{
    analysis: CompanyAnalysis;
    metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number };
  }> {
    const analysisText = departmentAnalyses
      .map(
        (a) => `## ${departmentNames[a.departmentType]}
- Health Score: ${a.healthScore}/100
- Summary: ${a.summary}
- Key Insights: ${a.keyInsights.join("; ")}
- Concerns: ${a.concerns.map((c) => c.severity + ": " + c.title).join("; ") || "None"}
- Opportunities: ${a.opportunities.map((o) => o.title).join("; ") || "None"}`
      )
      .join("\n\n");

    const prompt = `Analyze the following department reports and provide a company-wide synthesis:

DEPARTMENT ANALYSES:
${analysisText}

Provide your company-wide analysis in the following JSON format:
{
  "overallHealthScore": 75,
  "summary": "brief summary of overall company health",
  "departmentHealthScores": {
    "product": 80,
    "sales": 70
  },
  "crossDepartmentInsights": [
    {
      "title": "title",
      "description": "description of cross-department pattern",
      "affectedDepartments": ["product", "sales"],
      "impact": "high"
    }
  ],
  "bottlenecks": [
    {
      "title": "title",
      "description": "description",
      "sourceDepartment": "engineering",
      "affectedDepartments": ["product", "sales"],
      "suggestedResolution": "resolution",
      "urgency": "immediate"
    }
  ],
  "strategicRecommendations": [
    {
      "type": "strategic",
      "priority": "high",
      "departmentTypes": ["product", "engineering"],
      "title": "title",
      "description": "description",
      "impact": "expected impact",
      "effort": "effort required",
      "rationale": "reasoning",
      "confidenceScore": 85
    }
  ]
}`;

    const { data, metadata } = await this.sendJsonMessage<CompanyAnalysis>(prompt);
    return { analysis: data, metadata };
  }

  async detectBottlenecks(
    departmentAnalyses: DepartmentAnalysis[]
  ): Promise<{
    bottlenecks: Bottleneck[];
    metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number };
  }> {
    const analysisText = departmentAnalyses
      .map(
        (a) => `${departmentNames[a.departmentType]}: ${a.summary}
Concerns: ${a.concerns.map((c) => c.title).join(", ") || "None"}`
      )
      .join("\n\n");

    const prompt = `Based on these department analyses, identify any cross-department bottlenecks:

${analysisText}

Look for patterns where one department's issues are affecting others.

Provide bottlenecks in JSON format:
{
  "bottlenecks": [
    {
      "title": "clear title",
      "description": "detailed description of the bottleneck",
      "sourceDepartment": "engineering",
      "affectedDepartments": ["product", "sales"],
      "suggestedResolution": "specific action to resolve",
      "urgency": "immediate"
    }
  ]
}`;

    const { data, metadata } = await this.sendJsonMessage<{ bottlenecks: Bottleneck[] }>(prompt);
    return { bottlenecks: data.bottlenecks, metadata };
  }

  async recommendResourceAllocation(
    departmentAnalyses: DepartmentAnalysis[]
  ): Promise<{
    recommendations: Recommendation[];
    metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number };
  }> {
    const deptStatus = departmentAnalyses
      .map(
        (a) => `${departmentNames[a.departmentType]}: Health ${a.healthScore}/100
  Opportunities: ${a.opportunities.map((o) => o.title + " (effort: " + o.effort + ")").join(", ") || "None"}
  Concerns: ${a.concerns.map((c) => c.title + " (" + c.severity + ")").join(", ") || "None"}`
      )
      .join("\n\n");

    const arrDisplay = this.context.arrCents
      ? "$" + (this.context.arrCents / 100).toLocaleString()
      : "Unknown";

    const prompt = `Based on these department analyses, recommend resource allocation changes:

COMPANY CONTEXT:
- Stage: ${this.context.stage}
- Team Size: ${this.context.employeeCount ?? "Unknown"}
- ARR: ${arrDisplay}
- Runway: ${this.context.runwayMonths ?? "Unknown"} months

DEPARTMENT STATUS:
${deptStatus}

Recommend resource moves (people, budget, focus) to maximize company performance.

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "type": "resource_allocation",
      "priority": "high",
      "departmentTypes": ["engineering", "product"],
      "title": "clear action title",
      "description": "detailed description",
      "impact": "expected outcome with metrics",
      "effort": "cost, time, disruption",
      "rationale": "why this makes sense now",
      "confidenceScore": 80
    }
  ]
}`;

    const { data, metadata } = await this.sendJsonMessage<{
      recommendations: Recommendation[];
    }>(prompt);
    return { recommendations: data.recommendations, metadata };
  }

  async assessStageTransition(
    departmentAnalyses: DepartmentAnalysis[]
  ): Promise<{
    assessment: StageTransitionAssessment | null;
    metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number };
  }> {
    const stageOrder = ["bootstrap", "early", "growth", "scale"] as const;
    const currentIndex = stageOrder.indexOf(this.context.stage);

    if (currentIndex === stageOrder.length - 1) {
      return {
        assessment: null,
        metadata: { inputTokens: 0, outputTokens: 0, responseTimeMs: 0 },
      };
    }

    const nextStage = stageOrder[currentIndex + 1];
    const arrDisplay = this.context.arrCents
      ? "$" + (this.context.arrCents / 100).toLocaleString()
      : "Unknown";

    const deptHealth = departmentAnalyses
      .map((a) => "- " + departmentNames[a.departmentType] + ": " + a.healthScore + "/100")
      .join("\n");

    const prompt = `Assess whether ${this.context.name} is ready to transition from ${this.context.stage} to ${nextStage} stage.

STAGE REQUIREMENTS:
- Bootstrap to Early: 500K+ ARR, 10+ employees, repeatable sales process
- Early to Growth: 5M+ ARR, 50+ employees, scalable operations
- Growth to Scale: 50M+ ARR, 200+ employees, market leadership

CURRENT STATE:
- ARR: ${arrDisplay}
- Employees: ${this.context.employeeCount ?? "Unknown"}
- Runway: ${this.context.runwayMonths ?? "Unknown"} months

DEPARTMENT HEALTH:
${deptHealth}

Provide assessment in JSON format:
{
  "currentStage": "${this.context.stage}",
  "nextStage": "${nextStage}",
  "readinessScore": 65,
  "readyFactors": ["factor that supports transition"],
  "gapFactors": ["factor that needs work"],
  "recommendations": ["specific action to prepare for next stage"]
}`;

    const { data, metadata } = await this.sendJsonMessage<StageTransitionAssessment>(prompt);
    return { assessment: data, metadata };
  }

  async assessCompanyHealth(
    departmentAnalyses: DepartmentAnalysis[]
  ): Promise<{
    healthScore: number;
    summary: string;
    metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number };
  }> {
    const deptScores = departmentAnalyses
      .map((a) => "- " + departmentNames[a.departmentType] + ": " + a.healthScore + "/100 - " + a.summary)
      .join("\n");

    const prompt = `Calculate overall company health based on department analyses:

${deptScores}

Consider:
1. Weight departments by their importance to current stage (${this.context.stage})
2. Factor in critical concerns across departments
3. Account for cross-department dependencies

Provide in JSON format:
{
  "healthScore": 75,
  "summary": "2-3 sentence summary of company health"
}`;

    const { data, metadata } = await this.sendJsonMessage<{
      healthScore: number;
      summary: string;
    }>(prompt);
    return { ...data, metadata };
  }
}

export function createOrchestrationAgent(
  apiKey: string,
  context: CompanyContext,
  departmentSummaries?: Record<DepartmentType, string>,
  config?: AgentConfig
): OrchestrationAgent {
  return new OrchestrationAgent(apiKey, context, departmentSummaries, config);
}
