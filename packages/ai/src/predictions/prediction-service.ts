import type { AIProvider } from "../providers/types";
import type { MetricData, CompanyContext } from "../types";

export interface PredictionResult {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  reasoning: string;
  factors: string[];
}

export interface ChurnPrediction {
  customerId?: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: string[];
  recommendedActions: string[];
}

export interface RevenueForecast {
  period: string;
  predictedRevenue: number;
  confidence: number;
  growthRate: number;
  assumptions: string[];
}

export class PredictionService {
  private provider: AIProvider;
  private model: string;

  constructor(provider: AIProvider, model: string) {
    this.provider = provider;
    this.model = model;
  }

  private async ask<T>(prompt: string, maxTokens = 1024): Promise<T | null> {
    const result = await this.provider.chat({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      maxTokens,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      return null;
    }
  }

  async predictMetric(
    metricHistory: MetricData[],
    forecastPeriods: number = 3
  ): Promise<PredictionResult[]> {
    if (metricHistory.length < 3) return [];

    const sorted = [...metricHistory].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    const prompt = `Analyze this metric history and predict future values:

Metric: ${sorted[0]?.name}
History (oldest to newest):
${sorted.map((m) => `- ${new Date(m.recordedAt).toLocaleDateString()}: ${m.value}${m.unit ? " " + m.unit : ""}`).join("\n")}

Predict the next ${forecastPeriods} periods. Provide your response as JSON:
{
  "predictions": [
    {
      "period": "description of time period",
      "predictedValue": number,
      "confidence": number (0-100),
      "reasoning": "brief explanation"
    }
  ],
  "factors": ["key factor 1", "key factor 2"]
}`;

    const data = await this.ask<{
      predictions: Array<{
        period: string;
        predictedValue: number;
        confidence: number;
        reasoning: string;
      }>;
      factors: string[];
    }>(prompt);

    if (!data) return [];

    return data.predictions.map((p) => ({
      metric: sorted[0]?.name ?? "",
      currentValue: sorted[sorted.length - 1]?.value ?? 0,
      predictedValue: p.predictedValue,
      confidence: p.confidence,
      timeframe: p.period,
      reasoning: p.reasoning,
      factors: data.factors,
    }));
  }

  async predictChurn(
    customerMetrics: Array<{
      customerId: string;
      metrics: Record<string, number>;
      lastActivity: Date;
      subscriptionAge: number;
    }>
  ): Promise<ChurnPrediction[]> {
    const predictions: ChurnPrediction[] = [];

    for (const customer of customerMetrics) {
      const prompt = `Analyze this customer and predict churn risk:

Customer Metrics:
${Object.entries(customer.metrics).map(([k, v]) => `- ${k}: ${v}`).join("\n")}
- Last Activity: ${customer.lastActivity.toLocaleDateString()}
- Subscription Age: ${customer.subscriptionAge} days

Provide churn prediction as JSON:
{
  "riskScore": number (0-100),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "signals": ["warning signal 1", "warning signal 2"],
  "recommendedActions": ["action 1", "action 2"]
}`;

      const data = await this.ask<ChurnPrediction>(prompt, 512);
      if (data) {
        predictions.push({ ...data, customerId: customer.customerId });
      }
    }

    return predictions;
  }

  async forecastRevenue(
    historicalRevenue: Array<{ period: string; revenue: number }>,
    context: CompanyContext,
    forecastMonths: number = 6
  ): Promise<RevenueForecast[]> {
    const prompt = `Forecast revenue for the next ${forecastMonths} months:

Company Context:
- Stage: ${context.stage}
- Current ARR: ${context.arrCents ? "$" + (context.arrCents / 100).toLocaleString() : "Unknown"}
- Team Size: ${context.employeeCount || "Unknown"}
- Industry: ${context.industry || "Unknown"}

Historical Revenue:
${historicalRevenue.map((r) => `- ${r.period}: $${r.revenue.toLocaleString()}`).join("\n")}

Provide forecast as JSON:
{
  "forecasts": [
    {
      "period": "Month Year",
      "predictedRevenue": number,
      "confidence": number (0-100),
      "growthRate": number (percentage)
    }
  ],
  "assumptions": ["assumption 1", "assumption 2"]
}`;

    const data = await this.ask<{
      forecasts: Array<{
        period: string;
        predictedRevenue: number;
        confidence: number;
        growthRate: number;
      }>;
      assumptions: string[];
    }>(prompt);

    if (!data) return [];

    return data.forecasts.map((f) => ({
      period: f.period,
      predictedRevenue: f.predictedRevenue,
      confidence: f.confidence,
      growthRate: f.growthRate,
      assumptions: data.assumptions,
    }));
  }

  async predictDealProbability(
    deal: {
      value: number;
      stage: string;
      daysInStage: number;
      interactions: number;
      competitorMentioned: boolean;
    }
  ): Promise<{
    probability: number;
    confidence: number;
    factors: Array<{ factor: string; impact: "positive" | "negative" | "neutral" }>;
    recommendedActions: string[];
  }> {
    const prompt = `Analyze this deal and predict win probability:

Deal Information:
- Value: $${deal.value.toLocaleString()}
- Current Stage: ${deal.stage}
- Days in Current Stage: ${deal.daysInStage}
- Number of Interactions: ${deal.interactions}
- Competitor Mentioned: ${deal.competitorMentioned ? "Yes" : "No"}

Provide prediction as JSON:
{
  "probability": number (0-100),
  "confidence": number (0-100),
  "factors": [
    { "factor": "description", "impact": "positive" | "negative" | "neutral" }
  ],
  "recommendedActions": ["action 1", "action 2"]
}`;

    const data = await this.ask<{
      probability: number;
      confidence: number;
      factors: Array<{ factor: string; impact: "positive" | "negative" | "neutral" }>;
      recommendedActions: string[];
    }>(prompt, 512);

    return data ?? {
      probability: 50,
      confidence: 0,
      factors: [],
      recommendedActions: [],
    };
  }
}

export function createPredictionService(provider: AIProvider, model: string): PredictionService {
  return new PredictionService(provider, model);
}
