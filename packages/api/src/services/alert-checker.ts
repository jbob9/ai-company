import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@ai-company/db";
import { kpiDefinition, kpiValue, type KpiThresholds } from "@ai-company/db/schema/metrics";
import { alert, type AlertDetails } from "@ai-company/db/schema/alerts";
import { createAIService } from "@ai-company/ai";
import { env } from "@ai-company/env/server";

interface AlertCheckResult {
  created: number;
  checked: number;
}

export async function checkAlertsForCompany(companyId: string): Promise<AlertCheckResult> {
  const definitions = await db.query.kpiDefinition.findMany({
    where: eq(kpiDefinition.companyId, companyId),
    with: {
      values: {
        orderBy: [desc(kpiValue.recordedAt)],
        limit: 2,
      },
    },
  });

  let created = 0;
  const checked = definitions.length;

  for (const def of definitions) {
    if (!def.thresholds || def.values.length === 0) continue;

    const [latest, previous] = def.values;
    const value = Number(latest.value);
    const thresholds = def.thresholds as KpiThresholds;

    let severity: "critical" | "warning" | "watch" | null = null;
    let thresholdType: AlertDetails["thresholdType"] = undefined;
    let thresholdValue: number | undefined;

    if (thresholds.criticalMin !== undefined && value < thresholds.criticalMin) {
      severity = "critical";
      thresholdType = "criticalMin";
      thresholdValue = thresholds.criticalMin;
    } else if (thresholds.criticalMax !== undefined && value > thresholds.criticalMax) {
      severity = "critical";
      thresholdType = "criticalMax";
      thresholdValue = thresholds.criticalMax;
    } else if (thresholds.warningMin !== undefined && value < thresholds.warningMin) {
      severity = "warning";
      thresholdType = "warningMin";
      thresholdValue = thresholds.warningMin;
    } else if (thresholds.warningMax !== undefined && value > thresholds.warningMax) {
      severity = "warning";
      thresholdType = "warningMax";
      thresholdValue = thresholds.warningMax;
    }

    if (severity) {
      const existingAlert = await db.query.alert.findFirst({
        where: and(
          eq(alert.companyId, companyId),
          eq(alert.kpiDefinitionId, def.id),
          eq(alert.status, "active")
        ),
      });

      if (!existingAlert) {
        const previousValue = previous ? Number(previous.value) : undefined;
        const changePercent = previousValue
          ? ((value - previousValue) / Math.abs(previousValue)) * 100
          : undefined;

        let aiInsight: string | undefined;
        let aiRecommendation: string | undefined;

        if (env.ANTHROPIC_API_KEY) {
          try {
            const aiService = createAIService({ apiKey: env.ANTHROPIC_API_KEY });
            const agent = aiService.getDepartmentAgent(
              companyId,
              {
                departmentType: def.departmentType,
                companyName: "Company",
                companyStage: "bootstrap",
              },
              [{
                name: def.name,
                slug: def.slug,
                value,
                previousValue,
                unit: def.unit || undefined,
                trend: changePercent && changePercent > 1 ? "up" : changePercent && changePercent < -1 ? "down" : "stable",
                changePercent,
                recordedAt: latest.recordedAt,
              }]
            );

            const response = await agent.chat(
              "The metric " + def.name + " has breached its " + severity + " threshold. " +
              "Current value: " + value + ", threshold: " + thresholdValue + ". " +
              "Provide a brief 1-2 sentence insight about what this means and a recommended action."
            );

            const parts = response.content.split(/recommendation[s]?[:.]?/i);
            if (parts.length > 1) {
              aiInsight = parts[0].trim();
              aiRecommendation = parts[1].trim();
            } else {
              aiInsight = response.content;
            }
          } catch (error) {
            console.error("Failed to generate AI insight:", error);
          }
        }

        await db.insert(alert).values({
          id: nanoid(),
          companyId,
          departmentType: def.departmentType,
          kpiDefinitionId: def.id,
          severity,
          status: "active",
          title: def.name + " " + (severity === "critical" ? "Critical Alert" : "Warning"),
          message: def.name + " is " + value + (def.unit ? " " + def.unit : "") +
            ", which breaches the " + thresholdType + " threshold of " + thresholdValue + ".",
          details: {
            thresholdType,
            previousValue,
            changePercent,
          } as AlertDetails,
          triggerValue: String(value),
          thresholdValue: String(thresholdValue),
          aiInsight,
          aiRecommendation,
        });

        created++;
      }
    }
  }

  return { created, checked };
}

export async function checkOpportunityAlerts(companyId: string): Promise<AlertCheckResult> {
  const definitions = await db.query.kpiDefinition.findMany({
    where: eq(kpiDefinition.companyId, companyId),
    with: {
      values: {
        orderBy: [desc(kpiValue.recordedAt)],
        limit: 2,
      },
    },
  });

  let created = 0;
  const checked = definitions.length;

  for (const def of definitions) {
    if (!def.thresholds || def.values.length < 2) continue;

    const [latest, previous] = def.values;
    const value = Number(latest.value);
    const prevValue = Number(previous.value);
    const thresholds = def.thresholds as KpiThresholds;

    if (!thresholds.target || !thresholds.goodDirection) continue;

    const reachedTarget =
      (thresholds.goodDirection === "up" && value >= thresholds.target && prevValue < thresholds.target) ||
      (thresholds.goodDirection === "down" && value <= thresholds.target && prevValue > thresholds.target);

    if (reachedTarget) {
      const existingAlert = await db.query.alert.findFirst({
        where: and(
          eq(alert.companyId, companyId),
          eq(alert.kpiDefinitionId, def.id),
          eq(alert.severity, "opportunity"),
          eq(alert.status, "active")
        ),
      });

      if (!existingAlert) {
        await db.insert(alert).values({
          id: nanoid(),
          companyId,
          departmentType: def.departmentType,
          kpiDefinitionId: def.id,
          severity: "opportunity",
          status: "active",
          title: def.name + " Target Reached",
          message: def.name + " has reached the target of " + thresholds.target +
            (def.unit ? " " + def.unit : "") + ". Current value: " + value + ".",
          triggerValue: String(value),
          thresholdValue: String(thresholds.target),
        });

        created++;
      }
    }
  }

  return { created, checked };
}
