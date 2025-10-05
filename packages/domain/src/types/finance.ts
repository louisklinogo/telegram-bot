/**
 * TypeScript interfaces for financial operations and business logic
 * Used by finance management and analytics tools
 */

import type { ToolResponse } from "./core";

// Financial Operations
export interface FinancialOperation {
  action: "create" | "read" | "update" | "delete" | "summary" | "report";
  entry_name?: string;
  type?: "Income" | "Expense" | "Transfer" | "Refund" | "Investment";
  category?:
    | "Fabric"
    | "Tailor Fee"
    | "Transport"
    | "Sale"
    | "Supplies"
    | "Rent"
    | "Utilities"
    | "Renovation"
    | "Salary"
    | "Food"
    | "Miscellaneous";
  amount?: number;
  date?: string;
  payment_method?:
    | "Cash"
    | "Mobile Money (Momo)"
    | "Bank Transfer"
    | "Debit Card"
    | "Credit Card"
    | "Check";
  linked_order?: string;
  notes?: string;
  receipt_file?: string;

  // Query filters
  filters?: {
    date_range?: {
      start: string;
      end: string;
    };
    category?: string;
    type?: string;
    amount_range?: {
      min: number;
      max: number;
    };
    payment_method?: string;
  };
}

// Financial Reports
export interface FinancialSummary {
  period: {
    start: string;
    end: string;
  };
  income: {
    total: number;
    by_category: Record<string, number>;
    by_payment_method: Record<string, number>;
    transaction_count: number;
  };
  expenses: {
    total: number;
    by_category: Record<string, number>;
    by_payment_method: Record<string, number>;
    transaction_count: number;
  };
  net_profit: number;
  profit_margin_percentage: number;
  top_income_categories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  top_expense_categories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface CashFlowAnalysis {
  period: {
    start: string;
    end: string;
  };
  opening_balance: number;
  total_inflow: number;
  total_outflow: number;
  closing_balance: number;
  net_cash_flow: number;
  daily_flows: Array<{
    date: string;
    inflow: number;
    outflow: number;
    net_flow: number;
    running_balance: number;
  }>;
  payment_method_breakdown: Record<
    string,
    {
      inflow: number;
      outflow: number;
      net: number;
    }
  >;
}

export interface ExpenseAnalysis {
  period: {
    start: string;
    end: string;
  };
  total_expenses: number;
  cost_structure: Record<
    string,
    {
      amount: number;
      percentage: number;
      transaction_count: number;
      average_per_transaction: number;
    }
  >;
  fabric_costs: {
    total: number;
    percentage_of_expenses: number;
    average_per_order: number;
  };
  operational_costs: {
    total: number;
    percentage_of_expenses: number;
    categories: Record<string, number>;
  };
}

// Budget Management
export interface BudgetCategory {
  category: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
  status: "under" | "on_track" | "over_budget";
}

export interface BudgetAnalysis {
  period: {
    start: string;
    end: string;
  };
  total_budget: number;
  total_actual: number;
  total_variance: number;
  categories: BudgetCategory[];
  alerts: Array<{
    category: string;
    message: string;
    severity: "low" | "medium" | "high";
  }>;
}

// Financial Health Indicators
export interface FinancialHealthMetrics {
  current_month: {
    revenue: number;
    expenses: number;
    profit: number;
    profit_margin: number;
  };
  previous_month: {
    revenue: number;
    expenses: number;
    profit: number;
    profit_margin: number;
  };
  growth_rates: {
    revenue_growth: number;
    expense_growth: number;
    profit_growth: number;
  };
  efficiency_ratios: {
    fabric_cost_ratio: number; // Fabric costs / Total revenue
    operational_efficiency: number; // Operational costs / Total revenue
    cash_conversion_rate: number; // Cash payments / Total payments
  };
  trends: {
    revenue_trend: "increasing" | "decreasing" | "stable";
    expense_trend: "increasing" | "decreasing" | "stable";
    profit_trend: "increasing" | "decreasing" | "stable";
  };
}

// Tool Response Types
export interface FinanceToolResponse extends ToolResponse {
  data?: {
    entries?: any[]; // Generic entries until FinanceEntry is defined
    summary?: FinancialSummary;
    cash_flow?: CashFlowAnalysis;
    expense_analysis?: ExpenseAnalysis;
    budget_analysis?: BudgetAnalysis;
    health_metrics?: FinancialHealthMetrics;
    created_entry?: any; // Generic entry
    updated_entry?: any; // Generic entry
  };
}

// Validation Types
export interface FinanceValidationRules {
  amount: {
    min: number;
    max: number;
  };
  date: {
    format: string;
    max_future_days: number;
    max_past_days: number;
  };
  required_fields: string[];
  category_rules: Record<
    string,
    {
      allowed_types: string[];
      required_fields: string[];
    }
  >;
}

// Ghana-specific financial data
export interface GhanaFinancialContext {
  currency: "GHS";
  common_payment_methods: ["Cash", "Mobile Money (Momo)", "Bank Transfer"];
  business_expense_categories: [
    "Fabric",
    "Tailor Fee",
    "Transport",
    "Supplies",
    "Rent",
    "Utilities",
    "Salary",
    "Food",
  ];
  tax_rates: {
    vat_rate: number; // 15% in Ghana
    income_tax_bands: Array<{
      min_amount: number;
      max_amount: number;
      rate: number;
    }>;
  };
}

export interface FinancialAlert {
  id: string;
  type: "budget_exceeded" | "low_cash_flow" | "unusual_expense" | "payment_overdue";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  category?: string;
  amount?: number;
  date: string;
  action_required: boolean;
  suggested_actions?: string[];
}
