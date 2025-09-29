/**
 * Financial Records Manager Tool
 * 
 * Comprehensive tool for managing financial records with:
 * - CRUD operations for financial entries
 * - Financial reporting and summaries
 * - Categorization and analysis
 * - Ghana-specific business context
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { NotionClient } from '../utils/notionClient';
import { ValidationSchemas, ValidationHelper } from '../utils/dataValidation';
import type { 
  FinanceEntry 
} from '../types/notion';
import type {
  FinancialSummary,
  CashFlowAnalysis,
  ExpenseAnalysis,
  FinancialHealthMetrics
} from '../types/finance';

export const financeRecordsTool = createTool({
  id: 'finance-records-manager',
  description: `Comprehensive financial records management for Ghana-based business operations.

Key capabilities:
- Create, read, update, and delete financial entries
- Generate detailed financial reports and summaries
- Track income, expenses, transfers, refunds, and investments
- Monitor cash flow with Ghana-specific categories
- Link transactions to orders for complete business tracking
- Support for local payment methods (Mobile Money, Bank Transfers, Cash)

Financial categories supported:
- Income: Sale, Tailor Fee, Investment returns
- Expenses: Fabric, Supplies, Transport, Rent, Utilities, Food
- Business: Renovation, Salary, Miscellaneous

Payment methods: Cash, Mobile Money (Momo), Bank Transfer, Debit/Credit Cards, Check

Perfect for daily financial tracking, monthly reporting, and business performance analysis.`,

  inputSchema: z.object({
    action: z.enum([
      'create', 'read', 'update', 'delete', 
      'summary', 'report', 'kpis', 'cashflow',
      'monthly_report', 'category_analysis'
    ]).describe('The financial operation to perform'),
    
    // Entry data for create/update operations
    entry_data: z.object({
      entry_name: z.string().min(1).max(200).describe('Name/description of the financial entry'),
      type: z.enum(['Income', 'Expense', 'Transfer', 'Refund', 'Investment']).describe('Type of financial transaction'),
      category: z.enum([
        'Fabric', 'Tailor Fee', 'Transport', 'Sale', 'Supplies', 
        'Rent', 'Utilities', 'Renovation', 'Salary', 'Food', 'Miscellaneous'
      ]).describe('Specific category for the transaction'),
      amount: z.number().min(0).max(1000000).describe('Amount in Ghana Cedis (GHS)'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Transaction date (YYYY-MM-DD)'),
      payment_method: z.enum([
        'Cash', 'Mobile Money (Momo)', 'Bank Transfer', 'Debit Card', 'Credit Card', 'Check'
      ]).describe('Method of payment used'),
      linked_order: z.string().optional().describe('Notion page ID of related order (if applicable)'),
      notes: z.string().max(500).optional().describe('Additional notes or context'),
      receipt_file: z.string().url().optional().describe('URL to receipt or supporting document'),
    }).optional().describe('Financial entry data for create/update operations'),
    
    // Record ID for read/update/delete operations
    record_id: z.string().optional().describe('Notion page ID of the financial record'),
    
    // Filters for read/search operations
    filters: z.object({
      type: z.enum(['Income', 'Expense', 'Transfer', 'Refund', 'Investment']).optional(),
      category: z.enum([
        'Fabric', 'Tailor Fee', 'Transport', 'Sale', 'Supplies', 
        'Rent', 'Utilities', 'Renovation', 'Salary', 'Food', 'Miscellaneous'
      ]).optional(),
      date_range: z.object({
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).optional().describe('Date range filter (YYYY-MM-DD)'),
      amount_range: z.object({
        min: z.number().min(0),
        max: z.number().min(0),
      }).optional().describe('Amount range filter in GHS'),
      payment_method: z.enum([
        'Cash', 'Mobile Money (Momo)', 'Bank Transfer', 'Debit Card', 'Credit Card', 'Check'
      ]).optional(),
      search_term: z.string().optional().describe('Search in entry names and notes'),
    }).optional().describe('Filters for searching and reporting'),
    
    // Report configuration
    report_config: z.object({
      group_by: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().describe('How to group the report data'),
      include_trends: z.boolean().optional().describe('Include trend analysis'),
      compare_previous: z.boolean().optional().describe('Compare with previous period'),
      detailed_breakdown: z.boolean().optional().describe('Include detailed category breakdown'),
    }).optional().describe('Configuration for reports and summaries'),
    
    limit: z.number().min(1).max(100).optional().describe('Maximum number of records to return (default: 50)'),
  }),

  execute: async ({ context }) => {
    const input = context;
    try {
      const notionClient = new NotionClient();
      
      // Validate input based on action
      const validationResult = await validateInput(input);
      if (!validationResult.success) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors?.join(', ')}`,
        };
      }

      switch (input.action) {
        case 'create':
          return await createFinanceEntry(notionClient, input.entry_data!);
        
        case 'read':
          if (input.record_id) {
            return await getFinanceEntry(notionClient, input.record_id);
          } else {
            return await searchFinanceEntries(notionClient, input.filters, input.limit);
          }
        
        case 'update':
          return await updateFinanceEntry(notionClient, input.record_id!, input.entry_data!);
        
        case 'delete':
          return await deleteFinanceEntry(notionClient, input.record_id!);
        
        case 'summary':
          return await generateFinanceSummary(notionClient, input.filters, input.report_config);
        
        case 'report':
          return await generateFinanceReport(notionClient, input.filters, input.report_config);
        
        case 'kpis':
          return await calculateFinanceKPIs(notionClient, input.filters);
        
        case 'cashflow':
          return await generateCashflowAnalysis(notionClient, input.filters, input.report_config);
        
        case 'monthly_report':
          return await generateMonthlyReport(notionClient, input.filters);
        
        case 'category_analysis':
          return await generateCategoryAnalysis(notionClient, input.filters);
        
        default:
          return {
            success: false,
            error: `Unknown action: ${input.action}`,
          };
      }
    } catch (error) {
      console.error('Finance Records Tool Error:', error);
      return {
        success: false,
        error: `Failed to execute finance operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Helper Functions

async function validateInput(input: any) {
  const { action, entry_data, record_id, filters } = input;
  
  // Validate based on action type
  if (['create', 'update'].includes(action) && !entry_data) {
    return {
      success: false,
      errors: ['Entry data is required for create/update operations'],
    };
  }
  
  if (['read', 'update', 'delete'].includes(action) && !record_id && !filters) {
    return {
      success: false,
      errors: ['Record ID or filters required for this operation'],
    };
  }
  
  // Validate entry data if provided
  if (entry_data) {
    const schema = action === 'create' 
      ? ValidationSchemas.Finance.create 
      : ValidationSchemas.Finance.update;
    
    const result = ValidationHelper.validate(schema, entry_data);
    if (!result.success) {
      return result;
    }
  }
  
  // Validate filters if provided
  if (filters) {
    const result = ValidationHelper.validate(ValidationSchemas.Finance.search, filters);
    if (!result.success) {
      return result;
    }
    
    // Additional date range validation
    if (filters.date_range) {
      const dateValidation = ValidationHelper.validateDateRange(
        filters.date_range.start,
        filters.date_range.end
      );
      if (!dateValidation.valid) {
        return {
          success: false,
          errors: [dateValidation.error!],
        };
      }
    }
  }
  
  return { success: true };
}

async function createFinanceEntry(client: NotionClient, entryData: any) {
  try {
    const result = await client.createFinanceRecord(entryData);
    
    return {
      success: true,
      message: `Financial entry "${entryData.entry_name}" created successfully`,
      data: {
        record_id: result.id,
        entry_name: entryData.entry_name,
        type: entryData.type,
        category: entryData.category,
        amount: entryData.amount,
        date: entryData.date,
        payment_method: entryData.payment_method,
        created_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create financial entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function getFinanceEntry(client: NotionClient, recordId: string) {
  try {
    const record = await client.getFinanceRecord(recordId);
    
    if (!record) {
      return {
        success: false,
        error: 'Financial record not found',
      };
    }
    
    return {
      success: true,
      data: record,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to retrieve financial record: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function searchFinanceEntries(client: NotionClient, filters?: any, limit = 50) {
  try {
    const records = await client.queryFinanceRecords(filters, limit);
    
    return {
      success: true,
      message: `Found ${records.length} financial records`,
      data: records,
      summary: {
        total_records: records.length,
        total_income: records
          .filter(r => r.type === 'Income')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
        total_expenses: records
          .filter(r => r.type === 'Expense')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
        net_flow: records.reduce((sum, r) => {
          return sum + (r.type === 'Income' ? (r.amount || 0) : -(r.amount || 0));
        }, 0),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search financial records: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function updateFinanceEntry(client: NotionClient, recordId: string, updates: any) {
  try {
    const result = await client.updateFinanceRecord(recordId, updates);
    
    return {
      success: true,
      message: `Financial record updated successfully`,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update financial record: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function deleteFinanceEntry(client: NotionClient, recordId: string) {
  try {
    await client.deleteRecord(recordId);
    
    return {
      success: true,
      message: 'Financial record deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete financial record: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generateFinanceSummary(client: NotionClient, filters?: any, config?: any) {
  try {
    const records = await client.queryFinanceRecords(filters);
    
    // Calculate totals by type
    const summary = {
      period: filters?.date_range || { start: 'All time', end: 'All time' },
      total_records: records.length,
      income: {
        total: 0,
        count: 0,
        categories: {} as Record<string, { amount: number; count: number }>,
      },
      expenses: {
        total: 0,
        count: 0,
        categories: {} as Record<string, { amount: number; count: number }>,
      },
      other: {
        transfers: 0,
        refunds: 0,
        investments: 0,
      },
      net_cashflow: 0,
      payment_methods: {} as Record<string, { amount: number; count: number }>,
      top_categories: [] as Array<{ category: string; amount: number; type: string }>,
    };
    
    // Process each record
    for (const record of records) {
      const amount = record.amount || 0;
      
      // Track payment methods
      if (record.payment_method) {
        if (!summary.payment_methods[record.payment_method]) {
          summary.payment_methods[record.payment_method] = { amount: 0, count: 0 };
        }
        summary.payment_methods[record.payment_method].amount += amount;
        summary.payment_methods[record.payment_method].count += 1;
      }
      
      // Process by type
      switch (record.type) {
        case 'Income':
          summary.income.total += amount;
          summary.income.count += 1;
          summary.net_cashflow += amount;
          
          if (record.category) {
            if (!summary.income.categories[record.category]) {
              summary.income.categories[record.category] = { amount: 0, count: 0 };
            }
            summary.income.categories[record.category].amount += amount;
            summary.income.categories[record.category].count += 1;
          }
          break;
          
        case 'Expense':
          summary.expenses.total += amount;
          summary.expenses.count += 1;
          summary.net_cashflow -= amount;
          
          if (record.category) {
            if (!summary.expenses.categories[record.category]) {
              summary.expenses.categories[record.category] = { amount: 0, count: 0 };
            }
            summary.expenses.categories[record.category].amount += amount;
            summary.expenses.categories[record.category].count += 1;
          }
          break;
          
        case 'Transfer':
          summary.other.transfers += amount;
          break;
          
        case 'Refund':
          summary.other.refunds += amount;
          summary.net_cashflow += amount;
          break;
          
        case 'Investment':
          summary.other.investments += amount;
          break;
      }
    }
    
    // Calculate top categories
    const allCategories: Array<{ category: string; amount: number; type: string }> = [];
    
    Object.entries(summary.income.categories).forEach(([category, data]) => {
      allCategories.push({ category, amount: data.amount, type: 'Income' });
    });
    
    Object.entries(summary.expenses.categories).forEach(([category, data]) => {
      allCategories.push({ category, amount: data.amount, type: 'Expense' });
    });
    
    summary.top_categories = allCategories
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    
    return {
      success: true,
      message: 'Financial summary generated successfully',
      data: summary,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate financial summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generateFinanceReport(client: NotionClient, filters?: any, config?: any) {
  try {
    const records = await client.queryFinanceRecords(filters);
    
    // Get summary first
    const summaryResult = await generateFinanceSummary(client, filters, config);
    if (!summaryResult.success) {
      return summaryResult;
    }
    
    const summary = summaryResult.data;
    
    // Generate detailed report
    const report = {
      report_title: 'Financial Performance Report',
      generated_at: new Date().toISOString(),
      period: summary.period,
      
      executive_summary: {
        total_income: summary.income.total,
        total_expenses: summary.expenses.total,
        net_profit: summary.net_cashflow,
        profit_margin: summary.income.total > 0 ? (summary.net_cashflow / summary.income.total * 100).toFixed(2) + '%' : '0%',
        transaction_count: summary.total_records,
      },
      
      income_analysis: {
        total: summary.income.total,
        count: summary.income.count,
        average_per_transaction: summary.income.count > 0 ? (summary.income.total / summary.income.count).toFixed(2) : '0',
        categories: summary.income.categories,
        top_income_source: Object.entries(summary.income.categories)
          .sort(([,a], [,b]) => b.amount - a.amount)[0]?.[0] || 'None',
      },
      
      expense_analysis: {
        total: summary.expenses.total,
        count: summary.expenses.count,
        average_per_transaction: summary.expenses.count > 0 ? (summary.expenses.total / summary.expenses.count).toFixed(2) : '0',
        categories: summary.expenses.categories,
        biggest_expense_category: Object.entries(summary.expenses.categories)
          .sort(([,a], [,b]) => b.amount - a.amount)[0]?.[0] || 'None',
      },
      
      cashflow_analysis: {
        net_cashflow: summary.net_cashflow,
        status: summary.net_cashflow > 0 ? 'Positive' : summary.net_cashflow < 0 ? 'Negative' : 'Neutral',
        other_transactions: summary.other,
      },
      
      payment_methods_analysis: summary.payment_methods,
      
      insights: generateFinancialInsights(summary),
      
      recommendations: generateFinancialRecommendations(summary),
    };
    
    return {
      success: true,
      message: 'Detailed financial report generated successfully',
      data: report,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate financial report: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function calculateFinanceKPIs(client: NotionClient, filters?: any) {
  try {
    const records = await client.queryFinanceRecords(filters);
    
    const kpis = {
      revenue_kpis: {
        total_revenue: 0,
        average_order_value: 0,
        revenue_growth: 0, // Would need comparison period
        recurring_revenue: 0,
      },
      expense_kpis: {
        total_expenses: 0,
        cost_of_goods_sold: 0, // Fabric + Supplies
        operating_expenses: 0, // Rent + Utilities + Salary
        expense_ratio: 0, // Expenses / Revenue
      },
      profitability_kpis: {
        gross_profit: 0,
        net_profit: 0,
        profit_margin: 0,
        break_even_point: 0,
      },
      efficiency_kpis: {
        transactions_per_day: 0,
        average_transaction_size: 0,
        cash_conversion_cycle: 0, // Would need more data
        inventory_turnover: 0, // Would need inventory data
      },
    };
    
    const totalRecords = records.length;
    const incomeRecords = records.filter(r => r.type === 'Income');
    const expenseRecords = records.filter(r => r.type === 'Expense');
    
    // Calculate revenue KPIs
    kpis.revenue_kpis.total_revenue = incomeRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    kpis.revenue_kpis.average_order_value = incomeRecords.length > 0 
      ? kpis.revenue_kpis.total_revenue / incomeRecords.length 
      : 0;
    
    // Calculate expense KPIs
    kpis.expense_kpis.total_expenses = expenseRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    kpis.expense_kpis.cost_of_goods_sold = expenseRecords
      .filter(r => ['Fabric', 'Supplies'].includes(r.category || ''))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    kpis.expense_kpis.operating_expenses = expenseRecords
      .filter(r => ['Rent', 'Utilities', 'Salary'].includes(r.category || ''))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    kpis.expense_kpis.expense_ratio = kpis.revenue_kpis.total_revenue > 0 
      ? kpis.expense_kpis.total_expenses / kpis.revenue_kpis.total_revenue 
      : 0;
    
    // Calculate profitability KPIs
    kpis.profitability_kpis.gross_profit = kpis.revenue_kpis.total_revenue - kpis.expense_kpis.cost_of_goods_sold;
    kpis.profitability_kpis.net_profit = kpis.revenue_kpis.total_revenue - kpis.expense_kpis.total_expenses;
    kpis.profitability_kpis.profit_margin = kpis.revenue_kpis.total_revenue > 0 
      ? (kpis.profitability_kpis.net_profit / kpis.revenue_kpis.total_revenue) * 100 
      : 0;
    
    // Calculate efficiency KPIs
    kpis.efficiency_kpis.average_transaction_size = totalRecords > 0 
      ? records.reduce((sum, r) => sum + (r.amount || 0), 0) / totalRecords 
      : 0;
    
    // Calculate transactions per day if we have date range
    if (filters?.date_range) {
      const startDate = new Date(filters.date_range.start);
      const endDate = new Date(filters.date_range.end);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      kpis.efficiency_kpis.transactions_per_day = totalRecords / daysDiff;
    }
    
    return {
      success: true,
      message: 'Financial KPIs calculated successfully',
      data: kpis,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to calculate financial KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generateCashflowAnalysis(client: NotionClient, filters?: any, config?: any) {
  try {
    const records = await client.queryFinanceRecords(filters);
    
    // Group by time period if specified
    const groupBy = config?.group_by || 'month';
    const cashflowData = groupCashflowByPeriod(records, groupBy);
    
    const analysis = {
      period: filters?.date_range || { start: 'All time', end: 'All time' },
      group_by: groupBy,
      cashflow_data: cashflowData,
      total_inflow: records
        .filter(r => ['Income', 'Refund'].includes(r.type || ''))
        .reduce((sum, r) => sum + (r.amount || 0), 0),
      total_outflow: records
        .filter(r => r.type === 'Expense')
        .reduce((sum, r) => sum + (r.amount || 0), 0),
      net_cashflow: 0,
      cashflow_trend: 'stable', // Would calculate based on period comparison
      liquidity_analysis: {
        current_cash_position: 0, // Would need current balances
        operating_cash_flow: 0,
        free_cash_flow: 0,
      },
    };
    
    analysis.net_cashflow = analysis.total_inflow - analysis.total_outflow;
    
    return {
      success: true,
      message: 'Cashflow analysis generated successfully',
      data: analysis,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate cashflow analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generateMonthlyReport(client: NotionClient, filters?: any) {
  try {
    // Set default to current month if no filters provided
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthFilters = {
      ...filters,
      date_range: filters?.date_range || {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0],
      },
    };
    
    const reportResult = await generateFinanceReport(client, monthFilters);
    if (!reportResult.success) {
      return reportResult;
    }
    
    const monthName = new Date(monthFilters.date_range.start).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    return {
      success: true,
      message: `Monthly report for ${monthName} generated successfully`,
      data: {
        ...reportResult.data,
        report_title: `Monthly Financial Report - ${monthName}`,
        report_type: 'monthly',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate monthly report: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generateCategoryAnalysis(client: NotionClient, filters?: any) {
  try {
    const records = await client.queryFinanceRecords(filters);
    
    const categories = {} as Record<string, {
      income: number;
      expenses: number;
      net: number;
      transaction_count: number;
      percentage_of_total: number;
    }>;
    
    let totalAmount = 0;
    
    // Collect all categories and their totals
    for (const record of records) {
      const category = record.category || 'Uncategorized';
      const amount = record.amount || 0;
      
      if (!categories[category]) {
        categories[category] = {
          income: 0,
          expenses: 0,
          net: 0,
          transaction_count: 0,
          percentage_of_total: 0,
        };
      }
      
      categories[category].transaction_count += 1;
      
      if (record.type === 'Income') {
        categories[category].income += amount;
        categories[category].net += amount;
      } else if (record.type === 'Expense') {
        categories[category].expenses += amount;
        categories[category].net -= amount;
      }
      
      totalAmount += Math.abs(amount);
    }
    
    // Calculate percentages
    for (const category of Object.keys(categories)) {
      const categoryTotal = categories[category].income + categories[category].expenses;
      categories[category].percentage_of_total = totalAmount > 0 
        ? (categoryTotal / totalAmount) * 100 
        : 0;
    }
    
    // Sort by total transaction value
    const sortedCategories = Object.entries(categories)
      .sort(([,a], [,b]) => (b.income + b.expenses) - (a.income + a.expenses))
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    
    return {
      success: true,
      message: 'Category analysis generated successfully',
      data: {
        period: filters?.date_range || { start: 'All time', end: 'All time' },
        categories: sortedCategories,
        top_income_category: Object.entries(categories)
          .sort(([,a], [,b]) => b.income - a.income)[0]?.[0] || 'None',
        top_expense_category: Object.entries(categories)
          .sort(([,a], [,b]) => b.expenses - a.expenses)[0]?.[0] || 'None',
        most_active_category: Object.entries(categories)
          .sort(([,a], [,b]) => b.transaction_count - a.transaction_count)[0]?.[0] || 'None',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate category analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Utility Functions

function groupCashflowByPeriod(records: any[], groupBy: string) {
  const groups = {} as Record<string, { inflow: number; outflow: number; net: number }>;
  
  for (const record of records) {
    if (!record.date) continue;
    
    const date = new Date(record.date);
    let groupKey = '';
    
    switch (groupBy) {
      case 'day':
        groupKey = date.toISOString().split('T')[0];
        break;
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        groupKey = startOfWeek.toISOString().split('T')[0];
        break;
      case 'month':
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        groupKey = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        groupKey = String(date.getFullYear());
        break;
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = { inflow: 0, outflow: 0, net: 0 };
    }
    
    const amount = record.amount || 0;
    if (['Income', 'Refund'].includes(record.type)) {
      groups[groupKey].inflow += amount;
      groups[groupKey].net += amount;
    } else if (record.type === 'Expense') {
      groups[groupKey].outflow += amount;
      groups[groupKey].net -= amount;
    }
  }
  
  return groups;
}

function generateFinancialInsights(summary: any): string[] {
  const insights = [];
  
  // Profit/Loss insights
  if (summary.net_cashflow > 0) {
    insights.push(`✅ Business is profitable with GHS ${summary.net_cashflow.toFixed(2)} net positive cashflow`);
  } else if (summary.net_cashflow < 0) {
    insights.push(`⚠️ Business is operating at a loss of GHS ${Math.abs(summary.net_cashflow).toFixed(2)}`);
  } else {
    insights.push('📊 Business is breaking even with neutral cashflow');
  }
  
  // Top category insights
  const topIncomeCategory = Object.entries(summary.income.categories)
    .sort(([,a], [,b]) => (b as any).amount - (a as any).amount)[0];
  if (topIncomeCategory) {
    insights.push(`💰 Top income source: ${topIncomeCategory[0]} (GHS ${(topIncomeCategory[1] as any).amount.toFixed(2)})`);
  }
  
  const topExpenseCategory = Object.entries(summary.expenses.categories)
    .sort(([,a], [,b]) => (b as any).amount - (a as any).amount)[0];
  if (topExpenseCategory) {
    insights.push(`💸 Biggest expense: ${topExpenseCategory[0]} (GHS ${(topExpenseCategory[1] as any).amount.toFixed(2)})`);
  }
  
  // Payment method insights
  const topPaymentMethod = Object.entries(summary.payment_methods)
    .sort(([,a], [,b]) => (b as any).amount - (a as any).amount)[0];
  if (topPaymentMethod) {
    insights.push(`🏦 Most used payment method: ${topPaymentMethod[0]} (GHS ${(topPaymentMethod[1] as any).amount.toFixed(2)})`);
  }
  
  // Transaction volume insights
  if (summary.total_records > 0) {
    const avgTransactionSize = (summary.income.total + summary.expenses.total) / summary.total_records;
    insights.push(`📈 Average transaction size: GHS ${avgTransactionSize.toFixed(2)} across ${summary.total_records} transactions`);
  }
  
  return insights;
}

function generateFinancialRecommendations(summary: any): string[] {
  const recommendations = [];
  
  // Profitability recommendations
  if (summary.net_cashflow < 0) {
    recommendations.push('🎯 Focus on increasing income or reducing expenses to achieve profitability');
    
    if (summary.expenses.total > summary.income.total * 0.8) {
      recommendations.push('💡 Consider reviewing high-expense categories for cost reduction opportunities');
    }
  }
  
  // Expense management recommendations
  const expenseToIncomeRatio = summary.income.total > 0 ? summary.expenses.total / summary.income.total : 0;
  if (expenseToIncomeRatio > 0.7) {
    recommendations.push('⚡ High expense ratio detected - review spending patterns and identify areas to optimize');
  }
  
  // Cash flow recommendations
  if (summary.other.transfers > summary.income.total * 0.1) {
    recommendations.push('🔄 High transfer activity - ensure proper cash flow management between accounts');
  }
  
  // Payment method recommendations
  const mobileMoneyUsage = summary.payment_methods['Mobile Money (Momo)'];
  if (mobileMoneyUsage && mobileMoneyUsage.amount < summary.income.total * 0.3) {
    recommendations.push('📱 Consider increasing Mobile Money usage for better transaction tracking and customer convenience');
  }
  
  // Growth recommendations
  if (summary.income.total > 0 && summary.net_cashflow > summary.income.total * 0.2) {
    recommendations.push('🚀 Strong profitability - consider reinvesting profits into business growth opportunities');
  }
  
  return recommendations;
}

export default financeRecordsTool;