import { BaseAgent } from "./base-agent";
import {
  getDepartmentSystemPrompt,
  getAnalysisPrompt,
  getRecommendationPrompt,
  departmentNames,
} from "../prompts/system-prompts";
import type {
  DepartmentType,
  DepartmentContext,
  CompanyContext,
  MetricData,
  Message,
  AgentConfig,
  DepartmentAnalysis,
  Recommendation,
  GeneratedAlert,
} from "../types";

export class DepartmentAgent extends BaseAgent {
  private context: DepartmentContext;
  private metrics: MetricData[];

  constructor(
    apiKey: string,
    context: DepartmentContext,
    metrics: MetricData[] = [],
    config?: AgentConfig
  ) {
    super(apiKey, config);
    this.context = context;
    this.metrics = metrics;
  }

  /**
   * Update the agent's context
   */
  updateContext(context: Partial<DepartmentContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Update the agent's metrics
   */
  updateMetrics(metrics: MetricData[]): void {
    this.metrics = metrics;
  }

  /**
   * Get the department type
   */
  get departmentType(): DepartmentType {
    return this.context.departmentType;
  }

  /**
   * Get the department display name
   */
  get departmentName(): string {
    return departmentNames[this.context.departmentType];
  }

  protected getSystemPrompt(): string {
    return getDepartmentSystemPrompt(this.context, this.metrics);
  }

  /**
   * Analyze current metrics and return insights
   */
  async analyze(): Promise<{
    analysis: DepartmentAnalysis;
    metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number };
  }> {
    if (this.metrics.length === 0) {
      return {
        analysis: {
          departmentType: this.context.departmentType,
          healthScore: 50,
          summary: "No metrics available for analysis.",
          keyInsights: ["Add metrics to enable detailed analysis."],
          concerns: [],
          opportunities: [],
          trends: [],
        },
        metadata: { inputTokens: 0, outputTokens: 0, responseTimeMs: 0 },
      };
    }

    const prompt = getAnalysisPrompt(this.metrics);
    const { data, metadata } = await this.sendJsonMessage<
      Omit<DepartmentAnalysis, "departmentType">
    >(prompt);

    return {
      analysis: {
        departmentType: this.context.departmentType,
        ...data,
      },
      metadata,
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(
    companyContext: CompanyContext,
    analysisResult?: DepartmentAnalysis
  ): Promise<{
    recommendations: Recommendation[];
    metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number };
  }> {
    // If no analysis provided, run one first
    let analysis: DepartmentAnalysis;
    if (analysisResult) {
      analysis = analysisResult;
    } else {
      const result = await this.analyze();
      analysis = result.analysis;
    }

    const prompt = getRecommendationPrompt(
      this.context.departmentType,
      JSON.stringify(analysis, null, 2),
      companyContext
    );

    const { data, metadata } = await this.sendJsonMessage<{
      recommendations: Recommendation[];
    }>(prompt);

    return {
      recommendations: data.recommendations,
      metadata,
    };
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  async checkAlerts(thresholds: Record<string, {
    criticalMin?: number;
    criticalMax?: number;
    warningMin?: number;
    warningMax?: number;
  }>): Promise<{
    alerts: GeneratedAlert[];
    metadata: { inputTokens: number; outputTokens: number; responseTimeMs: number };
  }> {
    const alerts: GeneratedAlert[] = [];
    let totalMetadata = { inputTokens: 0, outputTokens: 0, responseTimeMs: 0 };

    for (const metric of this.metrics) {
      const threshold = thresholds[metric.slug];
      if (!threshold) continue;

      let severity: GeneratedAlert["severity"] | null = null;
      let thresholdValue: string | undefined;

      // Check critical thresholds
      if (threshold.criticalMin !== undefined && metric.value < threshold.criticalMin) {
        severity = "critical";
        thresholdValue = `min: ${threshold.criticalMin}`;
      } else if (threshold.criticalMax !== undefined && metric.value > threshold.criticalMax) {
        severity = "critical";
        thresholdValue = `max: ${threshold.criticalMax}`;
      }
      // Check warning thresholds
      else if (threshold.warningMin !== undefined && metric.value < threshold.warningMin) {
        severity = "warning";
        thresholdValue = `min: ${threshold.warningMin}`;
      } else if (threshold.warningMax !== undefined && metric.value > threshold.warningMax) {
        severity = "warning";
        thresholdValue = `max: ${threshold.warningMax}`;
      }

      if (severity) {
        // Generate AI insight for the alert
        const insightPrompt = `The metric "${metric.name}" has triggered a ${severity} alert.
Current value: ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}
Threshold: ${thresholdValue}
Previous value: ${metric.previousValue ?? "N/A"}
Trend: ${metric.trend}

Provide a brief insight (1-2 sentences) about what this means and a recommended action (1-2 sentences).
Format as JSON: { "insight": "...", "recommendation": "..." }`;

        try {
          const { data, metadata } = await this.sendJsonMessage<{
            insight: string;
            recommendation: string;
          }>(insightPrompt);

          totalMetadata.inputTokens += metadata.inputTokens;
          totalMetadata.outputTokens += metadata.outputTokens;
          totalMetadata.responseTimeMs += metadata.responseTimeMs;

          alerts.push({
            severity,
            departmentType: this.context.departmentType,
            title: `${metric.name} ${severity === "critical" ? "Critical" : "Warning"}`,
            message: `${metric.name} is ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}, which breaches the ${thresholdValue} threshold.`,
            aiInsight: data.insight,
            aiRecommendation: data.recommendation,
            triggerValue: String(metric.value),
            thresholdValue,
          });
        } catch {
          // If AI insight fails, still create the alert without AI content
          alerts.push({
            severity,
            departmentType: this.context.departmentType,
            title: `${metric.name} ${severity === "critical" ? "Critical" : "Warning"}`,
            message: `${metric.name} is ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}, which breaches the ${thresholdValue} threshold.`,
            triggerValue: String(metric.value),
            thresholdValue,
          });
        }
      }
    }

    return { alerts, metadata: totalMetadata };
  }
}

/**
 * Factory function to create a department agent
 */
export function createDepartmentAgent(
  apiKey: string,
  context: DepartmentContext,
  metrics?: MetricData[],
  config?: AgentConfig
): DepartmentAgent {
  return new DepartmentAgent(apiKey, context, metrics, config);
}
