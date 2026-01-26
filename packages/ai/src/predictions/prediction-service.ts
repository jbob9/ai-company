import Anthropic from "@anthropic-ai/sdk";
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
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async predictMetric(
    metricHistory: MetricData[],
    forecastPeriods: number = 3
  ): Promise<PredictionResult[]> {
    if (metricHistory.length < 3) {
      return [];
    }

    const sortedHistory = [...metricHistory].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    const prompt = `Analyze this metric history and predict future values:

Metric: ${sortedHistory[0].name}
History (oldest to newest):
${sortedHistory.map((m) => `- ${new Date(m.recordedAt).toLocaleDateString()}: ${m.value}${m.unit ? " " + m.unit : ""}`).join("\n")}

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

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    const content = textContent?.type === "text" ? textContent.text : "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return [];

    try {
      const data = JSON.parse(jsonMatch[0]);
      return data.predictions.map((p: Record<string, unknown>) => ({
        metric: sortedHistory[0].name,
        currentValue: sortedHistory[sortedHistory.length - 1].value,
        predictedValue: p.predictedValue as number,
        confidence: p.confidence as number,
        timeframe: p.period as string,
        reasoning: p.reasoning as string,
        factors: data.factors,
      }));
    } catch {
      return [];
    }
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

      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      const content = textContent?.type === "text" ? textContent.text : "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0]);
          predictions.push({
            customerId: customer.customerId,
            riskScore: data.riskScore,
            riskLevel: data.riskLevel,
            signals: data.signals,
            recommendedActions: data.recommendedActions,
          });
        } catch {
          // Skip this customer if parsing fails
        }
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

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    const content = textContent?.type === "text" ? textContent.text : "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return [];

    try {
      const data = JSON.parse(jsonMatch[0]);
      return data.forecasts.map((f: Record<string, unknown>) => ({
        period: f.period as string,
        predictedRevenue: f.predictedRevenue as number,
        confidence: f.confidence as number,
        growthRate: f.growthRate as number,
        assumptions: data.assumptions,
      }));
    } catch {
      return [];
    }
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

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    const content = textContent?.type === "text" ? textContent.text : "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        probability: 50,
        confidence: 0,
        factors: [],
        recommendedActions: [],
      };
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        probability: 50,
        confidence: 0,
        factors: [],
        recommendedActions: [],
      };
    }
  }
}

export function createPredictionService(apiKey: string): PredictionService {
  return new PredictionService(apiKey);
}
