import type { IntegrationAdapter, MetricData, DateRange } from "../types";

export interface LinearCredentials {
  apiKey: string;
}

export class LinearAdapter implements IntegrationAdapter {
  name = "Linear";
  provider = "linear";
  private apiKey: string | null = null;

  async connect(credentials: LinearCredentials): Promise<void> {
    this.apiKey = credentials.apiKey;
  }

  async disconnect(): Promise<void> {
    this.apiKey = null;
  }

  isConnected(): boolean {
    return this.apiKey !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.apiKey,
        },
        body: JSON.stringify({
          query: "{ viewer { id } }",
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchMetrics(dateRange?: DateRange): Promise<MetricData[]> {
    if (!this.apiKey) {
      throw new Error("Linear not connected");
    }

    const metrics: MetricData[] = [];
    const now = new Date();

    try {
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.apiKey,
        },
        body: JSON.stringify({
          query: `{
            issues(first: 100) {
              nodes {
                id
                state { type }
                createdAt
                completedAt
              }
            }
            cycles(first: 10) {
              nodes {
                id
                progress
                issueCountHistory
              }
            }
          }`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const issues = data.data?.issues?.nodes || [];
        const cycles = data.data?.cycles?.nodes || [];

        let completed = 0;
        let inProgress = 0;
        let backlog = 0;

        for (const issue of issues) {
          const stateType = issue.state?.type;
          if (stateType === "completed") completed++;
          else if (stateType === "started") inProgress++;
          else if (stateType === "backlog" || stateType === "unstarted") backlog++;
        }

        metrics.push({
          slug: "issues_completed",
          name: "Issues Completed",
          value: completed,
          recordedAt: now,
          source: "linear",
        });

        metrics.push({
          slug: "issues_in_progress",
          name: "Issues In Progress",
          value: inProgress,
          recordedAt: now,
          source: "linear",
        });

        metrics.push({
          slug: "backlog_size",
          name: "Backlog Size",
          value: backlog,
          recordedAt: now,
          source: "linear",
        });

        if (cycles.length > 0) {
          const latestCycle = cycles[0];
          metrics.push({
            slug: "cycle_progress",
            name: "Cycle Progress",
            value: (latestCycle.progress || 0) * 100,
            unit: "%",
            recordedAt: now,
            source: "linear",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching Linear metrics:", error);
      throw error;
    }

    return metrics;
  }
}

export function createLinearAdapter(): LinearAdapter {
  return new LinearAdapter();
}
