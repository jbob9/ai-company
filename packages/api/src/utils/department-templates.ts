import { departmentKPIs, departmentNames } from "@ai-company/ai";
import type { DepartmentType } from "@ai-company/ai";

type DocumentCategory = "role" | "kpis" | "monitoring" | "actions" | "improvements";

export interface DocumentTemplate {
  category: DocumentCategory;
  title: string;
  content: string;
  sortOrder: number;
}

const departmentDescriptions: Record<DepartmentType, string> = {
  product:
    "Owns the product vision, roadmap, and feature prioritization. Works closely with Engineering and customers to deliver value.",
  engineering:
    "Builds and maintains the technical platform. Responsible for code quality, system reliability, and shipping features.",
  sales:
    "Drives revenue through new customer acquisition and expansion. Manages the sales pipeline and customer relationships.",
  marketing:
    "Generates demand, builds brand awareness, and creates content. Owns the top of the funnel and marketing campaigns.",
  customer_success:
    "Ensures customers achieve their goals. Manages onboarding, retention, and expansion of existing accounts.",
  finance:
    "Manages financial planning, budgeting, and reporting. Tracks burn rate, runway, and unit economics.",
  operations:
    "Optimizes internal processes, manages tools and vendors. Ensures the company runs efficiently day-to-day.",
  hr: "Manages talent acquisition, employee experience, culture, and compliance. Owns people operations and development.",
  legal:
    "Handles contracts, intellectual property, compliance, and risk management. Protects the company legally.",
  data_analytics:
    "Transforms raw data into actionable insights. Manages data infrastructure, reporting, and analytics tooling.",
  corporate_development:
    "Drives strategic partnerships, M&A evaluation, and corporate growth initiatives beyond organic growth.",
  security_compliance:
    "Protects company assets, data, and infrastructure. Manages compliance certifications and security protocols.",
};

const monitoringGuides: Record<DepartmentType, string> = {
  product: `- **Feature adoption rates** after each release
- **User feedback** and NPS scores trending over time
- **Roadmap completion** percentage per quarter
- **Support tickets** related to product usability`,
  engineering: `- **System uptime** and response times (SLA adherence)
- **Deployment frequency** and rollback rates
- **Bug rate** per sprint and severity distribution
- **Technical debt** score and remediation progress`,
  sales: `- **Pipeline velocity** (stage-to-stage conversion timing)
- **Win rate** trends and loss reason analysis
- **MRR growth** and churn on a weekly basis
- **Rep productivity** metrics (calls, meetings, proposals)`,
  marketing: `- **Lead flow** volume and quality (MQL to SQL conversion)
- **Campaign ROI** by channel
- **Website traffic** and organic search rankings
- **Content engagement** metrics (reads, shares, downloads)`,
  customer_success: `- **Customer health scores** and at-risk accounts
- **Net retention rate** and expansion revenue
- **Churn signals** (decreased usage, support escalations)
- **Onboarding completion** rates and time-to-value`,
  finance: `- **Monthly burn rate** versus budget
- **Runway** in months at current spend
- **Gross margin** trends
- **Cash flow** forecasts and variance to plan`,
  operations: `- **Process cycle times** for key workflows
- **Tool adoption** and utilization rates
- **Vendor SLA compliance** and cost benchmarks
- **Incident response** and resolution times`,
  hr: `- **Employee retention** and voluntary turnover rates
- **Time-to-hire** for open positions
- **Employee satisfaction** survey scores
- **Headcount plan** versus actuals`,
  legal: `- **Contract turnaround** times
- **Compliance certification** status and renewal dates
- **Pending legal matters** and risk exposure
- **Regulatory changes** relevant to the business`,
  data_analytics: `- **Data pipeline uptime** and freshness
- **Report delivery** SLAs and accuracy
- **Analytics adoption** across teams
- **Data quality scores** and anomaly detection`,
  corporate_development: `- **Partnership pipeline** health and stage progression
- **M&A target evaluation** progress
- **Strategic initiative** milestone tracking
- **Market landscape** changes and competitor moves`,
  security_compliance: `- **Security vulnerability** count and remediation time
- **Compliance audit** schedule and results
- **Incident response** metrics (MTTD, MTTR)
- **Access review** completion and policy violations`,
};

const actionPlaybooks: Record<DepartmentType, string> = {
  product: `- **Low feature adoption**: Run user interviews, simplify onboarding, add in-app guidance
- **Missed roadmap deadlines**: Review scope, break into smaller releases, increase Eng collaboration
- **Declining NPS**: Analyze detractor feedback, create rapid-response improvement plan`,
  engineering: `- **High bug rate**: Increase test coverage requirements, add automated regression tests
- **Low deployment frequency**: Invest in CI/CD improvements, reduce PR review bottlenecks
- **Uptime below SLA**: Implement better monitoring, add redundancy, review incident runbooks`,
  sales: `- **Pipeline stagnation**: Launch new outbound campaigns, review ICP targeting, increase demo quality
- **Declining win rate**: Improve sales enablement materials, review competitive positioning
- **Rising CAC**: Optimize channel mix, improve lead qualification, reduce sales cycle length`,
  marketing: `- **Low lead quality**: Tighten ICP definitions, improve scoring models, align with Sales
- **High cost per lead**: Shift budget to higher-performing channels, improve content conversion
- **Brand awareness gap**: Increase PR/content cadence, launch thought leadership program`,
  customer_success: `- **Rising churn**: Implement early warning system, increase QBR cadence, improve onboarding
- **Low health scores**: Proactive outreach campaign, success plan reviews, executive sponsorship
- **Expansion stall**: Launch upsell playbooks, train CSMs on expansion conversations`,
  finance: `- **Burn rate above plan**: Initiate cost review across departments, flag discretionary spend
- **Runway below 12 months**: Prepare fundraising materials, identify cost optimization opportunities
- **Margin compression**: Analyze COGS drivers, renegotiate vendor contracts`,
  operations: `- **Process bottlenecks**: Map and streamline workflows, automate repetitive tasks
- **Low tool adoption**: Run training sessions, gather feedback, simplify tooling stack
- **Vendor underperformance**: Issue formal SLA breach notices, evaluate alternatives`,
  hr: `- **High turnover**: Conduct exit interview analysis, review compensation benchmarks, improve culture
- **Slow hiring**: Optimize job descriptions, add sourcing channels, streamline interview process
- **Low satisfaction**: Address top concerns from surveys, launch manager training program`,
  legal: `- **Contract delays**: Create template library, implement CLM tool, set approval workflows
- **Compliance gap**: Prioritize remediation by risk, engage external counsel if needed
- **Rising legal costs**: Review outside counsel spend, bring more work in-house`,
  data_analytics: `- **Data quality issues**: Implement validation rules, create data contracts with source teams
- **Slow report delivery**: Optimize queries, pre-aggregate data, add caching layers
- **Low adoption**: Create self-service dashboards, run analytics training sessions`,
  corporate_development: `- **Stalled partnerships**: Escalate to exec sponsors, revisit value propositions
- **M&A pipeline dry**: Expand sourcing, attend industry events, engage investment bankers
- **Initiative delays**: Break into phases, assign dedicated owners, increase check-in frequency`,
  security_compliance: `- **Critical vulnerabilities**: Initiate emergency patching, isolate affected systems
- **Audit findings**: Create remediation plan with owners and deadlines, track weekly
- **Incident spike**: Review access controls, update training, strengthen monitoring`,
};

const improvementGuides: Record<DepartmentType, string> = {
  product: `- Establish regular customer discovery cadence (weekly interviews)
- Build data-driven feature prioritization framework (RICE, ICE)
- Create product metrics dashboard visible to the whole company
- Run monthly product retrospectives to learn from releases`,
  engineering: `- Allocate 20% of sprint capacity to technical debt reduction
- Implement architecture decision records (ADRs) for major changes
- Set up automated code quality gates in CI pipeline
- Foster a blameless postmortem culture for incidents`,
  sales: `- Build and maintain a living competitive intelligence library
- Implement structured deal review process for opportunities above threshold
- Create win/loss analysis program with quarterly reporting
- Invest in continuous sales training and certification`,
  marketing: `- Build attribution model to understand true channel performance
- Create content calendar with SEO-driven keyword strategy
- Implement A/B testing framework for campaigns and landing pages
- Develop marketing-sales SLA for lead handoff and follow-up`,
  customer_success: `- Build customer health scoring model based on usage and engagement
- Create standardized playbooks for each lifecycle stage
- Implement voice-of-customer program feeding into Product
- Develop customer advisory board for strategic feedback`,
  finance: `- Build rolling 13-week cash flow forecast
- Create department-level budget ownership and accountability
- Implement automated expense tracking and variance alerts
- Develop scenario models for key business decisions`,
  operations: `- Document and version all core business processes
- Build an internal knowledge base for tools and workflows
- Implement quarterly vendor reviews and benchmarking
- Create operations dashboard tracking key efficiency metrics`,
  hr: `- Build structured onboarding program with 30/60/90-day milestones
- Create career ladders and leveling frameworks for all roles
- Implement regular pulse surveys (not just annual)
- Develop manager training and development program`,
  legal: `- Create self-service contract template library for common agreements
- Build compliance calendar with automated reminders
- Implement matter management system for tracking legal work
- Develop legal risk assessment framework for new initiatives`,
  data_analytics: `- Build self-service analytics layer for business users
- Create data catalog documenting all available datasets
- Implement data quality monitoring with automated alerts
- Develop analytics onboarding program for new team members`,
  corporate_development: `- Build systematic market mapping and competitor tracking
- Create evaluation framework for partnership and M&A opportunities
- Develop integration playbook for post-deal execution
- Maintain relationships with potential targets before need arises`,
  security_compliance: `- Implement security awareness training with phishing simulations
- Build automated compliance evidence collection
- Create security champions program across engineering teams
- Develop incident response playbooks and run tabletop exercises`,
};

export function getDefaultDocuments(departmentType: DepartmentType): DocumentTemplate[] {
  const name = departmentNames[departmentType];
  const kpis = departmentKPIs[departmentType];
  const description = departmentDescriptions[departmentType];
  const monitoring = monitoringGuides[departmentType];
  const actions = actionPlaybooks[departmentType];
  const improvements = improvementGuides[departmentType];

  return [
    {
      category: "role",
      title: "Role & Mission",
      sortOrder: 0,
      content: `# ${name} Department

## Mission

${description}

## Responsibilities

- Define and execute the ${name.toLowerCase()} strategy
- Track and report on department performance
- Collaborate with other departments on cross-functional initiatives
- Continuously improve processes and outcomes

## Team Structure

_Describe the team structure, key roles, and reporting lines here._
`,
    },
    {
      category: "kpis",
      title: "KPIs & Targets",
      sortOrder: 1,
      content: `# Key Performance Indicators

## Core Metrics

${kpis.map((kpi) => `- **${kpi}**: _Set target here_`).join("\n")}

## How We Measure

| Metric | Source | Frequency | Owner |
|--------|--------|-----------|-------|
${kpis.map((kpi) => `| ${kpi} | _TBD_ | Weekly | _TBD_ |`).join("\n")}

## Targets & Thresholds

_Define green/yellow/red thresholds for each metric to trigger alerts._
`,
    },
    {
      category: "monitoring",
      title: "Monitoring & Alerts",
      sortOrder: 2,
      content: `# What to Monitor

## Key Indicators

${monitoring}

## Alert Rules

- **Critical**: Metric drops below _X_% of target — immediate action required
- **Warning**: Metric trends down for 2+ consecutive periods — investigate
- **Watch**: Metric is flat when growth is expected — review at next check-in

## Review Cadence

- **Daily**: Check dashboards for anomalies
- **Weekly**: Review all KPIs in team standup
- **Monthly**: Deep-dive analysis and trend review
`,
    },
    {
      category: "actions",
      title: "Actions & Playbooks",
      sortOrder: 3,
      content: `# Recommended Actions

## Playbooks by Scenario

${actions}

## Escalation Path

1. Department lead investigates and proposes action
2. Cross-functional review if other departments are affected
3. Executive escalation for critical issues or budget requests

## Decision Framework

When recommending actions, consider:
- **Impact**: How much will this move the needle?
- **Effort**: What resources and time are required?
- **Risk**: What could go wrong?
- **Dependencies**: Who else needs to be involved?
`,
    },
    {
      category: "improvements",
      title: "Improvement Plan",
      sortOrder: 4,
      content: `# How to Improve

## Improvement Areas

${improvements}

## Quarterly Goals

_Set specific, measurable improvement goals for this quarter._

- [ ] Goal 1: _Describe_
- [ ] Goal 2: _Describe_
- [ ] Goal 3: _Describe_

## Retrospective Notes

_After each quarter, record what worked, what didn't, and what to change._
`,
    },
  ];
}
