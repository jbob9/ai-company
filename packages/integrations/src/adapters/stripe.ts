import Stripe from "stripe";
import type {
  IntegrationAdapter,
  MetricData,
  DateRange,
  StripeCredentials,
  StripeMetricConfig,
} from "../types";

export class StripeAdapter implements IntegrationAdapter {
  name = "Stripe";
  provider = "stripe";
  private client: Stripe | null = null;
  private config: StripeMetricConfig;

  constructor(config?: StripeMetricConfig) {
    this.config = {
      enableMrr: true,
      enableArr: true,
      enableChurn: true,
      enableCustomerCount: true,
      enableRevenueGrowth: true,
      ...config,
    };
  }

  async connect(credentials: StripeCredentials): Promise<void> {
    this.client = new Stripe(credentials.secretKey, {
      apiVersion: "2025-01-27.acacia",
    });
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.balance.retrieve();
      return true;
    } catch {
      return false;
    }
  }

  async fetchMetrics(dateRange?: DateRange): Promise<MetricData[]> {
    if (!this.client) {
      throw new Error("Stripe client not connected");
    }

    const metrics: MetricData[] = [];
    const now = new Date();
    const endDate = dateRange?.end || now;
    const startDate = dateRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    try {
      if (this.config.enableMrr || this.config.enableArr) {
        const mrr = await this.calculateMrr();
        if (this.config.enableMrr) {
          metrics.push({
            slug: "mrr",
            name: "Monthly Recurring Revenue",
            value: mrr / 100,
            unit: "USD",
            recordedAt: now,
            source: "stripe",
          });
        }
        if (this.config.enableArr) {
          metrics.push({
            slug: "arr",
            name: "Annual Recurring Revenue",
            value: (mrr * 12) / 100,
            unit: "USD",
            recordedAt: now,
            source: "stripe",
          });
        }
      }

      if (this.config.enableCustomerCount) {
        const customerCount = await this.getCustomerCount();
        metrics.push({
          slug: "customer_count",
          name: "Total Customers",
          value: customerCount,
          recordedAt: now,
          source: "stripe",
        });
      }

      if (this.config.enableChurn) {
        const churnRate = await this.calculateChurnRate(startTimestamp, endTimestamp);
        metrics.push({
          slug: "churn_rate",
          name: "Monthly Churn Rate",
          value: churnRate,
          unit: "%",
          recordedAt: now,
          source: "stripe",
        });
      }

      if (this.config.enableRevenueGrowth) {
        const revenueGrowth = await this.calculateRevenueGrowth(startTimestamp, endTimestamp);
        metrics.push({
          slug: "revenue_growth",
          name: "Revenue Growth",
          value: revenueGrowth,
          unit: "%",
          recordedAt: now,
          source: "stripe",
        });
      }
    } catch (error) {
      console.error("Error fetching Stripe metrics:", error);
      throw error;
    }

    return metrics;
  }

  private async calculateMrr(): Promise<number> {
    if (!this.client) throw new Error("Not connected");

    let mrr = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const subscriptions = await this.client.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
      });

      for (const sub of subscriptions.data) {
        for (const item of sub.items.data) {
          const price = item.price;
          if (price.recurring) {
            let monthlyAmount = price.unit_amount || 0;
            if (price.recurring.interval === "year") {
              monthlyAmount = monthlyAmount / 12;
            } else if (price.recurring.interval === "week") {
              monthlyAmount = monthlyAmount * 4.33;
            } else if (price.recurring.interval === "day") {
              monthlyAmount = monthlyAmount * 30;
            }
            mrr += monthlyAmount * (item.quantity || 1);
          }
        }
      }

      hasMore = subscriptions.has_more;
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    return mrr;
  }

  private async getCustomerCount(): Promise<number> {
    if (!this.client) throw new Error("Not connected");

    let count = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const customers = await this.client.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });

      count += customers.data.length;
      hasMore = customers.has_more;
      if (customers.data.length > 0) {
        startingAfter = customers.data[customers.data.length - 1].id;
      }
    }

    return count;
  }

  private async calculateChurnRate(startTimestamp: number, endTimestamp: number): Promise<number> {
    if (!this.client) throw new Error("Not connected");

    const canceledSubs = await this.client.subscriptions.list({
      status: "canceled",
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
    });

    const activeSubs = await this.client.subscriptions.list({
      status: "active",
      limit: 1,
    });

    const activeCount = activeSubs.data.length > 0 ? await this.getActiveSubscriptionCount() : 0;
    const canceledCount = canceledSubs.data.length;

    if (activeCount === 0) return 0;

    return (canceledCount / (activeCount + canceledCount)) * 100;
  }

  private async getActiveSubscriptionCount(): Promise<number> {
    if (!this.client) throw new Error("Not connected");

    let count = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const subs = await this.client.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
      });

      count += subs.data.length;
      hasMore = subs.has_more;
      if (subs.data.length > 0) {
        startingAfter = subs.data[subs.data.length - 1].id;
      }
    }

    return count;
  }

  private async calculateRevenueGrowth(startTimestamp: number, endTimestamp: number): Promise<number> {
    if (!this.client) throw new Error("Not connected");

    const midTimestamp = Math.floor((startTimestamp + endTimestamp) / 2);

    const firstHalfCharges = await this.client.charges.list({
      created: {
        gte: startTimestamp,
        lt: midTimestamp,
      },
      limit: 100,
    });

    const secondHalfCharges = await this.client.charges.list({
      created: {
        gte: midTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
    });

    const firstHalfRevenue = firstHalfCharges.data
      .filter((c) => c.status === "succeeded")
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const secondHalfRevenue = secondHalfCharges.data
      .filter((c) => c.status === "succeeded")
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    if (firstHalfRevenue === 0) return secondHalfRevenue > 0 ? 100 : 0;

    return ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;
  }
}

export function createStripeAdapter(config?: StripeMetricConfig): StripeAdapter {
  return new StripeAdapter(config);
}
