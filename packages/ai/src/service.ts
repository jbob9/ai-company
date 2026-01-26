import { DepartmentAgent, createDepartmentAgent } from "./agents/department-agent";
import {
  OrchestrationAgent,
  createOrchestrationAgent,
} from "./agents/orchestration-agent";
import type {
  DepartmentType,
  DepartmentContext,
  CompanyContext,
  MetricData,
  AgentConfig,
  DepartmentAnalysis,
  CompanyAnalysis,
  Recommendation,
  GeneratedAlert,
} from "./types";

export interface AIServiceConfig {
  apiKey: string;
  defaultAgentConfig?: AgentConfig;
}

/**
 * Main AI Service that manages all AI agents
 */
export class AIService {
  private apiKey: string;
  private defaultConfig: AgentConfig;
  private departmentAgents: Map<string, DepartmentAgent> = new Map();
  private orchestrationAgent: OrchestrationAgent | null = null;

  constructor(config: AIServiceConfig) {
    this.apiKey = config.apiKey;
    this.defaultConfig = config.defaultAgentConfig ?? {};
  }

  /**
   * Get or create a department agent for a company
   */
  getDepartmentAgent(
    companyId: string,
    context: DepartmentContext,
    metrics?: MetricData[]
  ): DepartmentAgent {
    const key = `${companyId}:${context.departmentType}`;
    
    let agent = this.departmentAgents.get(key);
    if (!agent) {
      agent = createDepartmentAgent(
        this.apiKey,
        context,
        metrics,
        this.defaultConfig
      );
      this.departmentAgents.set(key, agent);
    } else {
      // Update context and metrics
      agent.updateContext(context);
      if (metrics) {
        agent.updateMetrics(metrics);
      }
    }

    return agent;
  }

  /**
   * Get or create the orchestration agent for a company
   */
  getOrchestrationAgent(
    companyId: string,
    context: CompanyContext,
    departmentSummaries?: Record<DepartmentType, string>
  ): OrchestrationAgent {
    if (!this.orchestrationAgent) {
      this.orchestrationAgent = createOrchestrationAgent(
        this.apiKey,
        context,
        departmentSummaries,
        this.defaultConfig
      );
    } else {
      this.orchestrationAgent.updateContext(context);
      if (departmentSummaries) {
        this.orchestrationAgent.updateDepartmentSummaries(departmentSummaries);
      }
    }

    return this.orchestrationAgent;
  }

  /**
   * Run analysis for a single department
   */
  async analyzeDepartment(
    companyId: string,
    context: DepartmentContext,
    metrics: MetricData[]
  ): Promise<DepartmentAnalysis> {
    const agent = this.getDepartmentAgent(companyId, context, metrics);
    const { analysis } = await agent.analyze();
    return analysis;
  }

  /**
   * Run analysis for all departments and synthesize
   */
  async analyzeCompany(
    companyId: string,
    companyContext: CompanyContext,
    departmentData: Array<{
      context: DepartmentContext;
      metrics: MetricData[];
    }>
  ): Promise<{
    departmentAnalyses: DepartmentAnalysis[];
    companyAnalysis: CompanyAnalysis;
  }> {
    // Analyze all departments in parallel
    const departmentAnalyses = await Promise.all(
      departmentData.map(async ({ context, metrics }) => {
        return this.analyzeDepartment(companyId, context, metrics);
      })
    );

    // Build department summaries for orchestration
    const departmentSummaries = departmentAnalyses.reduce(
      (acc, analysis) => {
        acc[analysis.departmentType] = analysis.summary;
        return acc;
      },
      {} as Record<DepartmentType, string>
    );

    // Get orchestration agent and synthesize
    const orchestrator = this.getOrchestrationAgent(
      companyId,
      companyContext,
      departmentSummaries
    );
    const { analysis: companyAnalysis } = await orchestrator.synthesize(departmentAnalyses);

    return { departmentAnalyses, companyAnalysis };
  }

  /**
   * Generate recommendations for a department
   */
  async getDepartmentRecommendations(
    companyId: string,
    departmentContext: DepartmentContext,
    companyContext: CompanyContext,
    metrics: MetricData[]
  ): Promise<Recommendation[]> {
    const agent = this.getDepartmentAgent(companyId, departmentContext, metrics);
    const { recommendations } = await agent.generateRecommendations(companyContext);
    return recommendations;
  }

  /**
   * Generate company-wide recommendations
   */
  async getCompanyRecommendations(
    companyId: string,
    companyContext: CompanyContext,
    departmentAnalyses: DepartmentAnalysis[]
  ): Promise<Recommendation[]> {
    const orchestrator = this.getOrchestrationAgent(companyId, companyContext);
    const { recommendations } = await orchestrator.recommendResourceAllocation(
      departmentAnalyses
    );
    return recommendations;
  }

  /**
   * Check for alerts across all departments
   */
  async checkAlerts(
    companyId: string,
    departmentData: Array<{
      context: DepartmentContext;
      metrics: MetricData[];
      thresholds: Record<string, {
        criticalMin?: number;
        criticalMax?: number;
        warningMin?: number;
        warningMax?: number;
      }>;
    }>
  ): Promise<GeneratedAlert[]> {
    const allAlerts: GeneratedAlert[] = [];

    for (const { context, metrics, thresholds } of departmentData) {
      const agent = this.getDepartmentAgent(companyId, context, metrics);
      const { alerts } = await agent.checkAlerts(thresholds);
      allAlerts.push(...alerts);
    }

    // Sort by severity (critical first)
    const severityOrder = { critical: 0, warning: 1, watch: 2, opportunity: 3 };
    allAlerts.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return allAlerts;
  }

  /**
   * Chat with a department agent
   */
  async chatWithDepartment(
    companyId: string,
    context: DepartmentContext,
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<{ content: string; metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number } }> {
    const agent = this.getDepartmentAgent(companyId, context);
    return agent.chat(message, history);
  }

  /**
   * Chat with the orchestration agent
   */
  async chatWithOrchestrator(
    companyId: string,
    context: CompanyContext,
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<{ content: string; metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number } }> {
    const agent = this.getOrchestrationAgent(companyId, context);
    return agent.chat(message, history);
  }

  /**
   * Clear cached agents (useful for testing or when context changes significantly)
   */
  clearAgents(): void {
    this.departmentAgents.clear();
    this.orchestrationAgent = null;
  }
}

/**
 * Create an AI service instance
 */
export function createAIService(config: AIServiceConfig): AIService {
  return new AIService(config);
}
