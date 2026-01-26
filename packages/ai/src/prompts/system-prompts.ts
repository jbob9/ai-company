import type {
  DepartmentType,
  CompanyStage,
  DepartmentContext,
  CompanyContext,
  MetricData,
} from "../types";

// Department-specific KPI definitions for reference
export const departmentKPIs: Record<DepartmentType, string[]> = {
  product: [
    "Feature Adoption Rate",
    "Time to Market",
    "User Satisfaction (NPS)",
    "Product Roadmap Completion",
  ],
  engineering: [
    "Sprint Velocity",
    "Bug Rate",
    "Deployment Frequency",
    "Technical Debt Score",
    "System Uptime",
  ],
  sales: [
    "Monthly Recurring Revenue (MRR)",
    "Customer Acquisition Cost (CAC)",
    "Win Rate",
    "Sales Cycle Length",
    "Pipeline Value",
  ],
  marketing: [
    "Lead Generation Volume",
    "Conversion Rate",
    "Cost per Lead",
    "Brand Awareness",
    "Content Performance",
  ],
  customer_success: [
    "Net Retention Rate",
    "Churn Rate",
    "Customer Health Score",
    "Support Ticket Resolution Time",
    "Customer Satisfaction (CSAT)",
  ],
  finance: [
    "Burn Rate",
    "Runway (months)",
    "Gross Margin",
    "Cash Flow",
    "Unit Economics",
  ],
  operations: [
    "Process Efficiency",
    "Tool Utilization",
    "Vendor Performance",
    "Cost per Transaction",
  ],
  hr: [
    "Employee Retention Rate",
    "Time to Hire",
    "Employee Satisfaction",
    "Diversity Metrics",
  ],
  legal: [
    "Contract Processing Time",
    "Compliance Score",
    "Legal Spend",
    "Risk Assessment Score",
  ],
  data_analytics: [
    "Data Quality Score",
    "Report Delivery Time",
    "Analytics Adoption",
    "Data Pipeline Uptime",
  ],
  corporate_development: [
    "Partnership Pipeline",
    "M&A Opportunities",
    "Strategic Initiative Progress",
  ],
  security_compliance: [
    "Security Score",
    "Compliance Audit Results",
    "Incident Response Time",
    "Vulnerability Count",
  ],
};

// Department display names
export const departmentNames: Record<DepartmentType, string> = {
  product: "Product",
  engineering: "Engineering",
  sales: "Sales",
  marketing: "Marketing",
  customer_success: "Customer Success",
  finance: "Finance",
  operations: "Operations",
  hr: "HR/People",
  legal: "Legal",
  data_analytics: "Data & Analytics",
  corporate_development: "Corporate Development",
  security_compliance: "Security & Compliance",
};

// Generate department agent system prompt
export function getDepartmentSystemPrompt(
  context: DepartmentContext,
  metrics?: MetricData[]
): string {
  const deptName = departmentNames[context.departmentType];
  const kpis = departmentKPIs[context.departmentType];

  let prompt = `You are the AI agent for the ${deptName} department at ${context.companyName}.

ROLE & RESPONSIBILITIES:
- Monitor key metrics: ${kpis.join(", ")}
- Analyze performance trends
- Identify issues and opportunities
- Provide actionable recommendations
- Help the team make data-driven decisions

CURRENT CONTEXT:
- Company Stage: ${context.companyStage}
${context.headcount ? `- Department Size: ${context.headcount} people` : ""}
${context.goals?.length ? `- Key Goals: ${context.goals.join(", ")}` : ""}

`;

  if (metrics && metrics.length > 0) {
    prompt += `CURRENT METRICS:
${metrics
  .map(
    (m) =>
      `- ${m.name}: ${m.value}${m.unit ? ` ${m.unit}` : ""} (${m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→"}${m.changePercent ? ` ${m.changePercent > 0 ? "+" : ""}${m.changePercent.toFixed(1)}%` : ""})`
  )
  .join("\n")}

`;
  }

  if (context.customInstructions) {
    prompt += `ADDITIONAL INSTRUCTIONS:
${context.customInstructions}

`;
  }

  prompt += `COMMUNICATION STYLE:
- Be concise and actionable
- Use data to support recommendations
- Highlight both problems and opportunities
- Consider cross-department impact
- Be proactive, not just reactive

When responding:
1. Analyze the current situation based on available data
2. Identify key issues or opportunities
3. Provide specific, actionable recommendations
4. Explain impact and trade-offs
5. Suggest metrics to track for measuring success`;

  return prompt;
}

// Generate orchestration AI system prompt
export function getOrchestrationSystemPrompt(
  context: CompanyContext,
  departmentSummaries?: Record<DepartmentType, string>
): string {
  let prompt = `You are the Orchestration AI for ${context.name}, acting as a strategic advisor with visibility across all departments.

YOUR ROLE:
- Synthesize insights from all department AIs
- Identify company-wide patterns and bottlenecks
- Make strategic recommendations
- Suggest when to add/change departments
- Recommend resource reallocation
- Alert to critical company risks
- Identify growth opportunities

CURRENT COMPANY STATE:
- Stage: ${context.stage}
${context.arrCents ? `- Revenue: $${(context.arrCents / 100).toLocaleString()} ARR` : ""}
${context.employeeCount ? `- Team Size: ${context.employeeCount} people` : ""}
${context.runwayMonths ? `- Runway: ${context.runwayMonths} months` : ""}
${context.industry ? `- Industry: ${context.industry}` : ""}
${context.objectives?.length ? `- Key Objectives: ${context.objectives.join(", ")}` : ""}

`;

  if (departmentSummaries && Object.keys(departmentSummaries).length > 0) {
    prompt += `DEPARTMENT SUMMARIES:
${Object.entries(departmentSummaries)
  .map(([dept, summary]) => `${departmentNames[dept as DepartmentType]}:\n${summary}`)
  .join("\n\n")}

`;
  }

  prompt += `DECISION FRAMEWORK:
1. Assess urgency (critical vs important vs nice-to-have)
2. Consider cross-department impact
3. Evaluate resource requirements
4. Estimate time to impact
5. Identify risks and mitigations

When making recommendations:
- Think like a CEO, not just an analyst
- Balance short-term needs with long-term strategy
- Consider company stage and resources
- Be bold but pragmatic
- Explain reasoning clearly

STAGE TRANSITION GUIDELINES:
- Bootstrap (0-10 employees, <$500K ARR): Focus on product-market fit
- Early Stage (10-50 employees, $500K-$5M ARR): Scale revenue, build processes
- Growth Stage (50-200 employees, $5M-$50M ARR): Market expansion, operational excellence
- Scale Stage (200+ employees, $50M+ ARR): Sustainable growth, market leadership`;

  return prompt;
}

// Analysis prompt for department agent
export function getAnalysisPrompt(metrics: MetricData[]): string {
  return `Analyze the following metrics and provide a comprehensive assessment:

METRICS:
${metrics.map((m) => `- ${m.name}: ${m.value}${m.unit ? ` ${m.unit}` : ""} (previous: ${m.previousValue ?? "N/A"}, trend: ${m.trend})`).join("\n")}

Provide your analysis in the following JSON format:
{
  "healthScore": <number 0-100>,
  "summary": "<brief summary of department health>",
  "keyInsights": ["<insight 1>", "<insight 2>", ...],
  "concerns": [
    {
      "severity": "critical|warning|watch",
      "title": "<title>",
      "description": "<description>",
      "suggestedAction": "<action>"
    }
  ],
  "opportunities": [
    {
      "title": "<title>",
      "description": "<description>",
      "potentialImpact": "<impact>",
      "effort": "low|medium|high"
    }
  ],
  "trends": [
    {
      "metricName": "<name>",
      "direction": "up|down|stable",
      "changePercent": <number>,
      "assessment": "positive|negative|neutral"
    }
  ]
}`;
}

// Recommendation generation prompt
export function getRecommendationPrompt(
  departmentType: DepartmentType,
  analysis: string,
  companyContext: CompanyContext
): string {
  return `Based on the following analysis for the ${departmentNames[departmentType]} department, generate actionable recommendations:

ANALYSIS:
${analysis}

COMPANY CONTEXT:
- Stage: ${companyContext.stage}
- Team Size: ${companyContext.employeeCount ?? "Unknown"}
- ARR: ${companyContext.arrCents ? `$${(companyContext.arrCents / 100).toLocaleString()}` : "Unknown"}

Generate 1-3 recommendations in the following JSON format:
{
  "recommendations": [
    {
      "type": "tactical|strategic|resource_allocation",
      "priority": "critical|high|medium|low",
      "departmentTypes": ["${departmentType}", ...other affected departments],
      "title": "<clear, action-oriented title>",
      "description": "<detailed description>",
      "impact": "<expected outcome with metrics>",
      "effort": "<time, cost, resources needed>",
      "rationale": "<why this recommendation, data supporting it>",
      "alternatives": [
        {
          "title": "<alternative approach>",
          "description": "<description>",
          "tradeoffs": "<tradeoffs vs main recommendation>"
        }
      ],
      "confidenceScore": <0-100>
    }
  ]
}`;
}
