import Anthropic from "@anthropic-ai/sdk";

export interface RecommendationOutcome {
  recommendationId: string;
  type: string;
  title: string;
  status: string;
  accepted: boolean;
  implemented: boolean;
  outcome?: {
    success: boolean;
    metricChanges?: Array<{
      metricName: string;
      beforeValue: number;
      afterValue: number;
      changePercent: number;
    }>;
    feedback?: string;
    lessonsLearned?: string;
  };
}

export interface LearningInsights {
  totalRecommendations: number;
  acceptanceRate: number;
  implementationRate: number;
  successRate: number;
  byType: Record<string, {
    total: number;
    accepted: number;
    implemented: number;
    successful: number;
  }>;
  patterns: string[];
  improvements: string[];
}

export interface ImprovedPromptContext {
  successfulPatterns: string[];
  failedPatterns: string[];
  preferredTypes: string[];
  avoidedTypes: string[];
  contextualGuidance: string;
}

export class LearningService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  analyzeOutcomes(outcomes: RecommendationOutcome[]): LearningInsights {
    const total = outcomes.length;
    const accepted = outcomes.filter((o) => o.accepted).length;
    const implemented = outcomes.filter((o) => o.implemented).length;
    const successful = outcomes.filter((o) => o.outcome?.success).length;

    const byType: LearningInsights["byType"] = {};

    for (const outcome of outcomes) {
      if (!byType[outcome.type]) {
        byType[outcome.type] = {
          total: 0,
          accepted: 0,
          implemented: 0,
          successful: 0,
        };
      }
      byType[outcome.type].total++;
      if (outcome.accepted) byType[outcome.type].accepted++;
      if (outcome.implemented) byType[outcome.type].implemented++;
      if (outcome.outcome?.success) byType[outcome.type].successful++;
    }

    const patterns: string[] = [];
    const improvements: string[] = [];

    for (const [type, stats] of Object.entries(byType)) {
      const acceptRate = stats.total > 0 ? stats.accepted / stats.total : 0;
      const successRate = stats.implemented > 0 ? stats.successful / stats.implemented : 0;

      if (acceptRate > 0.7) {
        patterns.push(type + " recommendations have high acceptance (" + Math.round(acceptRate * 100) + "%)");
      } else if (acceptRate < 0.3) {
        improvements.push("Consider improving " + type + " recommendations (low acceptance: " + Math.round(acceptRate * 100) + "%)");
      }

      if (successRate > 0.8) {
        patterns.push(type + " recommendations are highly effective (" + Math.round(successRate * 100) + "% success)");
      } else if (successRate < 0.5 && stats.implemented > 2) {
        improvements.push(type + " recommendations need refinement (low success: " + Math.round(successRate * 100) + "%)");
      }
    }

    return {
      totalRecommendations: total,
      acceptanceRate: total > 0 ? accepted / total : 0,
      implementationRate: accepted > 0 ? implemented / accepted : 0,
      successRate: implemented > 0 ? successful / implemented : 0,
      byType,
      patterns,
      improvements,
    };
  }

  async generateImprovedContext(
    outcomes: RecommendationOutcome[]
  ): Promise<ImprovedPromptContext> {
    const insights = this.analyzeOutcomes(outcomes);

    const successfulOutcomes = outcomes.filter((o) => o.outcome?.success);
    const failedOutcomes = outcomes.filter(
      (o) => o.implemented && o.outcome && !o.outcome.success
    );
    const rejectedOutcomes = outcomes.filter((o) => !o.accepted);

    const prompt = `Analyze these recommendation outcomes and provide guidance for future recommendations:

OVERALL STATS:
- Total Recommendations: ${insights.totalRecommendations}
- Acceptance Rate: ${Math.round(insights.acceptanceRate * 100)}%
- Implementation Rate: ${Math.round(insights.implementationRate * 100)}%
- Success Rate: ${Math.round(insights.successRate * 100)}%

SUCCESSFUL RECOMMENDATIONS:
${successfulOutcomes.slice(0, 5).map((o) => "- " + o.title + " (" + o.type + "): " + (o.outcome?.feedback || "No feedback")).join("\n") || "None yet"}

FAILED RECOMMENDATIONS:
${failedOutcomes.slice(0, 5).map((o) => "- " + o.title + " (" + o.type + "): " + (o.outcome?.lessonsLearned || "No lessons recorded")).join("\n") || "None yet"}

REJECTED RECOMMENDATIONS:
${rejectedOutcomes.slice(0, 5).map((o) => "- " + o.title + " (" + o.type + ")").join("\n") || "None yet"}

Provide learning insights as JSON:
{
  "successfulPatterns": ["pattern that led to success", ...],
  "failedPatterns": ["pattern that led to failure", ...],
  "preferredTypes": ["recommendation types that work well"],
  "avoidedTypes": ["recommendation types to be cautious with"],
  "contextualGuidance": "A paragraph of guidance for future recommendations"
}`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    const content = textContent?.type === "text" ? textContent.text : "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        successfulPatterns: [],
        failedPatterns: [],
        preferredTypes: [],
        avoidedTypes: [],
        contextualGuidance: "Continue making data-driven recommendations.",
      };
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        successfulPatterns: [],
        failedPatterns: [],
        preferredTypes: [],
        avoidedTypes: [],
        contextualGuidance: "Continue making data-driven recommendations.",
      };
    }
  }

  generateLearningPromptAddition(context: ImprovedPromptContext): string {
    let addition = "\n\nLEARNING FROM PAST RECOMMENDATIONS:\n";

    if (context.successfulPatterns.length > 0) {
      addition += "Successful patterns: " + context.successfulPatterns.join("; ") + "\n";
    }

    if (context.failedPatterns.length > 0) {
      addition += "Avoid these patterns: " + context.failedPatterns.join("; ") + "\n";
    }

    if (context.preferredTypes.length > 0) {
      addition += "Preferred recommendation types: " + context.preferredTypes.join(", ") + "\n";
    }

    if (context.avoidedTypes.length > 0) {
      addition += "Be cautious with: " + context.avoidedTypes.join(", ") + "\n";
    }

    addition += "\nGuidance: " + context.contextualGuidance;

    return addition;
  }
}

export function createLearningService(apiKey: string): LearningService {
  return new LearningService(apiKey);
}
