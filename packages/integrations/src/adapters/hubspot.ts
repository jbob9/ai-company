import type { IntegrationAdapter, MetricData, DateRange } from "../types";

export interface HubSpotCredentials {
  accessToken: string;
}

export class HubSpotAdapter implements IntegrationAdapter {
  name = "HubSpot";
  provider = "hubspot";
  private accessToken: string | null = null;

  async connect(credentials: HubSpotCredentials): Promise<void> {
    this.accessToken = credentials.accessToken;
  }

  async disconnect(): Promise<void> {
    this.accessToken = null;
  }

  isConnected(): boolean {
    return this.accessToken !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.accessToken) return false;
    try {
      const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
        headers: {
          Authorization: "Bearer " + this.accessToken,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchMetrics(dateRange?: DateRange): Promise<MetricData[]> {
    if (!this.accessToken) {
      throw new Error("HubSpot not connected");
    }

    const metrics: MetricData[] = [];
    const now = new Date();

    try {
      const dealsResponse = await fetch(
        "https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=amount,dealstage,closedate",
        {
          headers: { Authorization: "Bearer " + this.accessToken },
        }
      );

      if (dealsResponse.ok) {
        const dealsData = await dealsResponse.json();
        const deals = dealsData.results || [];

        let pipelineValue = 0;
        let wonDeals = 0;
        let totalDeals = deals.length;

        for (const deal of deals) {
          const amount = parseFloat(deal.properties?.amount || "0");
          pipelineValue += amount;
          if (deal.properties?.dealstage === "closedwon") {
            wonDeals++;
          }
        }

        metrics.push({
          slug: "pipeline_value",
          name: "Pipeline Value",
          value: pipelineValue,
          unit: "USD",
          recordedAt: now,
          source: "hubspot",
        });

        metrics.push({
          slug: "win_rate",
          name: "Win Rate",
          value: totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0,
          unit: "%",
          recordedAt: now,
          source: "hubspot",
        });
      }

      const contactsResponse = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
        {
          headers: { Authorization: "Bearer " + this.accessToken },
        }
      );

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        metrics.push({
          slug: "lead_count",
          name: "Total Leads",
          value: contactsData.total || 0,
          recordedAt: now,
          source: "hubspot",
        });
      }
    } catch (error) {
      console.error("Error fetching HubSpot metrics:", error);
      throw error;
    }

    return metrics;
  }
}

export function createHubSpotAdapter(): HubSpotAdapter {
  return new HubSpotAdapter();
}
