// Types
export * from "./types";

// Prompts
export {
  departmentKPIs,
  departmentNames,
  getDepartmentSystemPrompt,
  getOrchestrationSystemPrompt,
  getAnalysisPrompt,
  getRecommendationPrompt,
} from "./prompts/system-prompts";

// Agents
export { BaseAgent } from "./agents/base-agent";
export { DepartmentAgent, createDepartmentAgent } from "./agents/department-agent";
export {
  OrchestrationAgent,
  createOrchestrationAgent,
} from "./agents/orchestration-agent";

// Service
export { AIService, createAIService } from "./service";
export type { AIServiceConfig } from "./service";

// Predictions
export {
  PredictionService,
  createPredictionService,
  type PredictionResult,
  type ChurnPrediction,
  type RevenueForecast,
} from "./predictions/prediction-service";

// Learning
export {
  LearningService,
  createLearningService,
  type RecommendationOutcome,
  type LearningInsights,
  type ImprovedPromptContext,
} from "./learning/learning-service";
