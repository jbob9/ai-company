export interface MetricData {
  slug: string;
  name: string;
  value: number;
  unit?: string;
  recordedAt: Date;
  source: string;
  sourceId?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface IntegrationAdapter {
  name: string;
  provider: string;
  connect(credentials: unknown): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  fetchMetrics(dateRange?: DateRange): Promise<MetricData[]>;
  testConnection(): Promise<boolean>;
}

export interface StripeCredentials {
  secretKey: string;
}

export interface StripeMetricConfig {
  enableMrr?: boolean;
  enableArr?: boolean;
  enableChurn?: boolean;
  enableCustomerCount?: boolean;
  enableRevenueGrowth?: boolean;
}
