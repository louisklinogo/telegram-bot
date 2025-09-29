/**
 * TypeScript interfaces for business analytics and KPI calculations
 * Used by business analytics and enhanced search tools
 */

import { Client, Order, Invoice, ToolResponse } from './notion';

// Business Analytics Operations
export interface BusinessAnalyticsOperation {
  report_type: 'kpis' | 'trends' | 'customers' | 'products' | 'cashflow' | 'performance';
  date_range: {
    start: string;
    end: string;
  };
  group_by?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  filters?: {
    customer?: string;
    category?: string;
    product_type?: string;
    payment_method?: string;
    status?: string;
  };
  comparison_period?: {
    start: string;
    end: string;
  };
}

// Key Performance Indicators
export interface BusinessKPIs {
  period: {
    start: string;
    end: string;
  };
  revenue: {
    total: number;
    growth_rate: number;
    average_per_day: number;
    recurring_percentage: number;
  };
  orders: {
    total_count: number;
    completion_rate: number;
    average_order_value: number;
    delivery_rate: number;
  };
  customers: {
    total_count: number;
    new_customers: number;
    returning_customers: number;
    retention_rate: number;
    customer_lifetime_value: number;
  };
  financial: {
    profit_margin: number;
    cost_of_goods_sold: number;
    operational_expenses: number;
    net_profit: number;
  };
  operational: {
    average_delivery_time: number;
    order_fulfillment_rate: number;
    customer_satisfaction_score?: number;
  };
}

// Customer Analytics
export interface CustomerAnalytics {
  period: {
    start: string;
    end: string;
  };
  customer_segments: Array<{
    segment: 'high_value' | 'regular' | 'occasional' | 'new';
    count: number;
    total_revenue: number;
    average_order_value: number;
    order_frequency: number;
  }>;
  top_customers: Array<{
    client: {
      id: string;
      name: string;
    };
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    last_order_date: string;
    loyalty_score: number;
  }>;
  customer_acquisition: {
    total_new_customers: number;
    acquisition_sources: Record<string, number>;
    acquisition_cost_per_customer: number;
    conversion_rate: number;
  };
  customer_retention: {
    retention_rate: number;
    churn_rate: number;
    repeat_purchase_rate: number;
    days_between_orders: number;
  };
}

// Product Analytics
export interface ProductAnalytics {
  period: {
    start: string;
    end: string;
  };
  product_performance: Array<{
    product_name: string;
    total_orders: number;
    total_revenue: number;
    average_price: number;
    profit_margin: number;
    customer_count: number;
  }>;
  category_performance: Record<string, {
    order_count: number;
    revenue: number;
    profit_margin: number;
    growth_rate: number;
  }>;
  seasonal_trends: Array<{
    period: string;
    top_products: string[];
    revenue: number;
    order_count: number;
  }>;
  fabric_utilization: {
    total_fabric_cost: number;
    fabric_waste_percentage: number;
    most_used_fabrics: Array<{
      fabric_type: string;
      usage_count: number;
      total_cost: number;
    }>;
  };
}

// Trend Analysis
export interface TrendAnalysis {
  period: {
    start: string;
    end: string;
  };
  revenue_trends: Array<{
    period: string;
    revenue: number;
    orders: number;
    average_order_value: number;
    growth_rate: number;
  }>;
  seasonal_patterns: {
    peak_months: string[];
    low_months: string[];
    seasonal_variance: number;
  };
  customer_behavior_trends: {
    order_frequency_trend: 'increasing' | 'decreasing' | 'stable';
    average_order_value_trend: 'increasing' | 'decreasing' | 'stable';
    customer_acquisition_trend: 'increasing' | 'decreasing' | 'stable';
  };
  market_insights: Array<{
    insight: string;
    impact: 'positive' | 'negative' | 'neutral';
    confidence: number;
    recommendation: string;
  }>;
}

// Business Performance Metrics
export interface BusinessPerformance {
  efficiency_metrics: {
    order_processing_time: number;
    customer_response_time: number;
    inventory_turnover: number;
    payment_collection_efficiency: number;
  };
  profitability_metrics: {
    gross_margin: number;
    net_margin: number;
    return_on_investment: number;
    cost_per_acquisition: number;
  };
  growth_metrics: {
    monthly_growth_rate: number;
    customer_growth_rate: number;
    market_share_growth: number;
    revenue_per_customer_growth: number;
  };
  operational_metrics: {
    capacity_utilization: number;
    quality_score: number;
    delivery_performance: number;
    customer_satisfaction: number;
  };
}

// Forecasting
export interface BusinessForecast {
  forecast_period: {
    start: string;
    end: string;
  };
  revenue_forecast: Array<{
    period: string;
    forecasted_revenue: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
  }>;
  customer_forecast: {
    expected_new_customers: number;
    expected_total_customers: number;
    churn_prediction: number;
  };
  cash_flow_forecast: Array<{
    period: string;
    expected_inflow: number;
    expected_outflow: number;
    net_cash_flow: number;
    cumulative_balance: number;
  }>;
  recommendations: Array<{
    category: 'revenue' | 'cost' | 'customer' | 'operational';
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    expected_impact: string;
  }>;
}

// Search and Query Types
export interface BusinessQuery {
  query_type: 'search' | 'analytics' | 'report' | 'insight';
  natural_language_query: string;
  filters?: {
    databases?: ('clients' | 'orders' | 'invoices' | 'finances' | 'measurements')[];
    date_range?: {
      start: string;
      end: string;
    };
    amount_range?: {
      min: number;
      max: number;
    };
    status?: string[];
    categories?: string[];
  };
  response_format?: 'summary' | 'detailed' | 'raw_data' | 'chart_data';
}

export interface BusinessInsight {
  insight_id: string;
  category: 'revenue' | 'customer' | 'operational' | 'financial' | 'market';
  title: string;
  description: string;
  impact_score: number; // 1-10 scale
  confidence_level: number; // 0-1 scale
  supporting_data: any;
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimated_impact: string;
    timeline: string;
  }>;
  generated_at: string;
}

// Record Management Types
export interface RecordUpdateOperation {
  database: 'clients' | 'orders' | 'invoices' | 'finances' | 'measurements';
  operation: 'update' | 'delete' | 'bulk_update';
  record_id?: string;
  record_ids?: string[]; // For bulk operations
  updates: Record<string, any>;
  validation_mode: 'strict' | 'lenient' | 'skip';
  create_backup: boolean;
  reason?: string; // For audit trail
}

export interface RecordUpdateResult {
  success: boolean;
  updated_records: number;
  failed_updates: number;
  backup_created?: boolean;
  backup_id?: string;
  validation_errors?: Array<{
    record_id: string;
    field: string;
    error: string;
  }>;
  updated_data?: any[];
}

// Tool Response Types
export interface BusinessAnalyticsResponse extends ToolResponse {
  data?: {
    kpis?: BusinessKPIs;
    customer_analytics?: CustomerAnalytics;
    product_analytics?: ProductAnalytics;
    trend_analysis?: TrendAnalysis;
    performance_metrics?: BusinessPerformance;
    forecast?: BusinessForecast;
    insights?: BusinessInsight[];
    query_results?: any[];
    chart_data?: any;
  };
}

export interface SearchResponse extends ToolResponse {
  data?: {
    results: any[];
    total_results: number;
    query_interpretation: string;
    insights?: BusinessInsight[];
    related_suggestions?: string[];
    export_options?: string[];
  };
}

// Export and Reporting
export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  include_charts: boolean;
  date_range: {
    start: string;
    end: string;
  };
  sections: string[];
  recipient_email?: string;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    day_of_week?: number;
    day_of_month?: number;
  };
}

// Ghana-specific business context
export interface GhanaBusinessContext {
  currency: 'GHS';
  business_hours: {
    start: string;
    end: string;
    timezone: 'GMT';
  };
  cultural_considerations: {
    preferred_communication: ['WhatsApp', 'Phone Call', 'SMS'];
    payment_preferences: ['Cash', 'Mobile Money', 'Bank Transfer'];
    peak_business_seasons: string[];
    cultural_events_impact: Array<{
      event: string;
      months: string[];
      business_impact: 'high' | 'medium' | 'low';
    }>;
  };
  market_context: {
    target_demographics: string[];
    competitive_landscape: string[];
    growth_opportunities: string[];
  };
}