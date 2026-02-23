import type { LanguageModel } from "ai";
import { getModel } from "./providers/model";
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
  provider: string;
  apiKey: string;
  defaultModel?: string;
  defaultAgentConfig?: Partial<AgentConfig>;
}

export class AIService {
  private languageModel: LanguageModel;
  private resolvedConfig: Required<AgentConfig>;
  private departmentAgents: Map<string, DepartmentAgent> = new Map();
  private orchestrationAgent: OrchestrationAgent | null = null;

  constructor(config: AIServiceConfig) {
    this.languageModel = getModel(
      config.provider,
      config.apiKey,
      config.defaultModel,
    );

    this.resolvedConfig = {
      model: config.defaultModel ?? config.provider,
      maxTokens: config.defaultAgentConfig?.maxTokens ?? 4096,
      temperature: config.defaultAgentConfig?.temperature ?? 0.7,
    };
  }

  get model(): LanguageModel {
    return this.languageModel;
  }

  getDepartmentAgent(
    companyId: string,
    context: DepartmentContext,
    metrics?: MetricData[],
  ): DepartmentAgent {
    const key = `${companyId}:${context.departmentType}`;

    let agent = this.departmentAgents.get(key);
    if (!agent) {
      agent = createDepartmentAgent(
        this.languageModel,
        this.resolvedConfig,
        context,
        metrics,
      );
      this.departmentAgents.set(key, agent);
    } else {
      agent.updateContext(context);
      if (metrics) agent.updateMetrics(metrics);
    }

    return agent;
  }

  getOrchestrationAgent(
    _companyId: string,
    context: CompanyContext,
    departmentSummaries?: Record<DepartmentType, string>,
  ): OrchestrationAgent {
    if (!this.orchestrationAgent) {
      this.orchestrationAgent = createOrchestrationAgent(
        this.languageModel,
        this.resolvedConfig,
        context,
        departmentSummaries,
      );
    } else {
      this.orchestrationAgent.updateContext(context);
      if (departmentSummaries) {
        this.orchestrationAgent.updateDepartmentSummaries(departmentSummaries);
      }
    }

    return this.orchestrationAgent;
  }

  async analyzeDepartment(
    companyId: string,
    context: DepartmentContext,
    metrics: MetricData[],
  ): Promise<DepartmentAnalysis> {
    const agent = this.getDepartmentAgent(companyId, context, metrics);
    const { analysis } = await agent.analyze();
    return analysis;
  }

  async analyzeCompany(
    companyId: string,
    companyContext: CompanyContext,
    departmentData: Array<{
      context: DepartmentContext;
      metrics: MetricData[];
    }>,
  ): Promise<{
    departmentAnalyses: DepartmentAnalysis[];
    companyAnalysis: CompanyAnalysis;
  }> {
    const departmentAnalyses = await Promise.all(
      departmentData.map(async ({ context, metrics }) => {
        return this.analyzeDepartment(companyId, context, metrics);
      }),
    );

    const departmentSummaries = departmentAnalyses.reduce(
      (acc, analysis) => {
        acc[analysis.departmentType] = analysis.summary;
        return acc;
      },
      {} as Record<DepartmentType, string>,
    );

    const orchestrator = this.getOrchestrationAgent(
      companyId,
      companyContext,
      departmentSummaries,
    );
    const { analysis: companyAnalysis } = await orchestrator.synthesize(departmentAnalyses);

    return { departmentAnalyses, companyAnalysis };
  }

  async getDepartmentRecommendations(
    companyId: string,
    departmentContext: DepartmentContext,
    companyContext: CompanyContext,
    metrics: MetricData[],
  ): Promise<Recommendation[]> {
    const agent = this.getDepartmentAgent(companyId, departmentContext, metrics);
    const { recommendations } = await agent.generateRecommendations(companyContext);
    return recommendations;
  }

  async getCompanyRecommendations(
    companyId: string,
    companyContext: CompanyContext,
    departmentAnalyses: DepartmentAnalysis[],
  ): Promise<Recommendation[]> {
    const orchestrator = this.getOrchestrationAgent(companyId, companyContext);
    const { recommendations } = await orchestrator.recommendResourceAllocation(
      departmentAnalyses,
    );
    return recommendations;
  }

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
    }>,
  ): Promise<GeneratedAlert[]> {
    const allAlerts: GeneratedAlert[] = [];

    for (const { context, metrics, thresholds } of departmentData) {
      const agent = this.getDepartmentAgent(companyId, context, metrics);
      const { alerts } = await agent.checkAlerts(thresholds);
      allAlerts.push(...alerts);
    }

    const severityOrder = { critical: 0, warning: 1, watch: 2, opportunity: 3 };
    allAlerts.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    return allAlerts;
  }

  async chatWithDepartment(
    companyId: string,
    context: DepartmentContext,
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = [],
  ) {
    const agent = this.getDepartmentAgent(companyId, context);
    return agent.chat(message, history);
  }

  async chatWithOrchestrator(
    companyId: string,
    context: CompanyContext,
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = [],
  ) {
    const agent = this.getOrchestrationAgent(companyId, context);
    return agent.chat(message, history);
  }

  clearAgents(): void {
    this.departmentAgents.clear();
    this.orchestrationAgent = null;
  }
}

export function createAIService(config: AIServiceConfig): AIService {
  return new AIService(config);
}
