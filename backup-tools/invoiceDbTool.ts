/**
 * Invoice Database Manager Tool
 * 
 * Comprehensive tool for managing the Invoices database with:
 * - CRUD operations for invoices
 * - Payment tracking and status management
 * - Integration with Orders and Clients databases
 * - Overdue invoice monitoring
 * - Payment reminder system
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { NotionClient } from '../utils/notionClient';
import { ValidationSchemas, ValidationHelper } from '../utils/dataValidation';
import type { 
  Invoice
} from '../types/notion';

// Define missing types locally
interface InvoiceFilters {
  status?: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  client_id?: string;
  client_name?: string;
  invoice_number?: string;
  date_range?: {
    start: string;
    end: string;
  };
  due_date_range?: {
    start: string;
    end: string;
  };
  amount_range?: {
    min: number;
    max: number;
  };
  payment_method?: string;
  overdue_only?: boolean;
  unpaid_only?: boolean;
}

interface InvoiceReport {
  summary: any;
  details: Invoice[];
  generated_at: string;
}

type PaymentStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export const invoiceDbTool = createTool({
  id: 'invoice-database-manager',
  description: `Comprehensive invoice database management for professional business operations.

Key capabilities:
- Create, read, update, and delete invoice records
- Track payment status (Draft, Sent, Paid, Overdue)
- Monitor payment progress and outstanding balances
- Generate payment reminders and overdue reports
- Link invoices to clients and orders for complete tracking
- Support for multiple payment methods including Ghana-specific options
- Calculate due dates and payment schedules

Invoice lifecycle management:
- Draft: Initial invoice creation and editing
- Sent: Invoice sent to customer (readonly unless admin)
- Paid: Full payment received (final status)
- Overdue: Past due date with outstanding balance

Payment methods supported:
- Credit Card, Bank Transfer, PayPal, Check, Cash
- Mobile Money (popular in Ghana)
- Other custom payment methods

Perfect for professional invoicing, payment tracking, and accounts receivable management.`,

  inputSchema: z.object({
    action: z.enum([
      'create', 'read', 'update', 'delete',
      'update_payment', 'mark_paid', 'mark_overdue',
      'payment_reminder', 'overdue_report', 'payment_status',
      'revenue_report', 'aging_report'
    ]).describe('The invoice operation to perform'),
    
    // Invoice data for create/update operations
    invoice_data: z.object({
      invoice_number: z.string().min(1).max(50).describe('Unique invoice number/identifier'),
      client_id: z.string().describe('Notion page ID of the client'),
      amount: z.number().min(0).max(1000000).describe('Total invoice amount in GHS'),
      amount_paid: z.number().min(0).max(1000000).optional().describe('Amount already paid (default: 0)'),
      status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue']).optional().describe('Invoice status (default: Draft)'),
      date_issued: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Invoice issue date (YYYY-MM-DD)'),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Payment due date (YYYY-MM-DD)'),
      payment_method: z.enum([
        'Credit Card', 'Bank Transfer', 'PayPal', 'Check', 'Cash', 'Mobile Money', 'Other'
      ]).optional().describe('Method of payment (if payment received)'),
      invoice_pdf: z.string().url().optional().describe('URL to the invoice PDF file'),
      notes: z.string().max(500).optional().describe('Additional notes or payment terms'),
    }).optional().describe('Invoice data for create/update operations'),
    
    // Record ID for read/update/delete operations
    record_id: z.string().optional().describe('Notion page ID of the invoice record'),
    
    // Payment update data
    payment_data: z.object({
      amount_paid: z.number().min(0).max(1000000).describe('Amount being paid'),
      payment_method: z.enum([
        'Credit Card', 'Bank Transfer', 'PayPal', 'Check', 'Cash', 'Mobile Money', 'Other'
      ]).describe('Method of payment'),
      payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date of payment (default: today)'),
      payment_reference: z.string().optional().describe('Payment reference or transaction ID'),
      notes: z.string().max(200).optional().describe('Payment notes'),
    }).optional().describe('Payment information for payment updates'),
    
    // Filters for search operations
    filters: z.object({
      status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue']).optional(),
      client_id: z.string().optional().describe('Filter by specific client'),
      client_name: z.string().optional().describe('Search by client name'),
      invoice_number: z.string().optional().describe('Search by invoice number'),
      date_range: z.object({
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).optional().describe('Filter by date range (issue date)'),
      due_date_range: z.object({
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).optional().describe('Filter by due date range'),
      amount_range: z.object({
        min: z.number().min(0),
        max: z.number().min(0),
      }).optional().describe('Filter by invoice amount range'),
      payment_method: z.enum([
        'Credit Card', 'Bank Transfer', 'PayPal', 'Check', 'Cash', 'Mobile Money', 'Other'
      ]).optional(),
      overdue_only: z.boolean().optional().describe('Show only overdue invoices'),
      unpaid_only: z.boolean().optional().describe('Show only unpaid or partially paid invoices'),
    }).optional().describe('Filters for searching invoices'),
    
    // Report configuration
    report_config: z.object({
      group_by: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().describe('How to group the report data'),
      include_details: z.boolean().optional().describe('Include detailed invoice breakdowns'),
      aging_buckets: z.array(z.number()).optional().describe('Days for aging analysis (e.g., [30, 60, 90])'),
    }).optional().describe('Configuration for reports'),
    
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
          return await createInvoice(notionClient, input.invoice_data!);
        
        case 'read':
          if (input.record_id) {
            return await getInvoice(notionClient, input.record_id);
          } else {
            return await searchInvoices(notionClient, input.filters, input.limit);
          }
        
        case 'update':
          return await updateInvoice(notionClient, input.record_id!, input.invoice_data!);
        
        case 'delete':
          return await deleteInvoice(notionClient, input.record_id!);
        
        case 'update_payment':
          return await updatePayment(notionClient, input.record_id!, input.payment_data!);
        
        case 'mark_paid':
          return await markInvoicePaid(notionClient, input.record_id!, input.payment_data);
        
        case 'mark_overdue':
          return await markInvoicesOverdue(notionClient);
        
        case 'payment_reminder':
          return await generatePaymentReminder(notionClient, input.record_id, input.filters);
        
        case 'overdue_report':
          return await generateOverdueReport(notionClient, input.filters);
        
        case 'payment_status':
          return await getPaymentStatus(notionClient, input.filters);
        
        case 'revenue_report':
          return await generateRevenueReport(notionClient, input.filters, input.report_config);
        
        case 'aging_report':
          return await generateAgingReport(notionClient, input.filters, input.report_config);
        
        default:
          return {
            success: false,
            error: `Unknown action: ${input.action}`,
          };
      }
    } catch (error) {
      console.error('Invoice Database Tool Error:', error);
      return {
        success: false,
        error: `Failed to execute invoice operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Helper Functions

async function validateInput(input: any) {
  const { action, invoice_data, payment_data, record_id, filters } = input;
  
  // Validate based on action type
  if (['create', 'update'].includes(action) && !invoice_data) {
    return {
      success: false,
      errors: ['Invoice data is required for create/update operations'],
    };
  }
  
  if (['read', 'update', 'delete', 'update_payment', 'mark_paid', 'payment_reminder'].includes(action) && !record_id && !filters) {
    return {
      success: false,
      errors: ['Record ID or filters required for this operation'],
    };
  }
  
  if (['update_payment'].includes(action) && !payment_data) {
    return {
      success: false,
      errors: ['Payment data is required for payment operations'],
    };
  }
  
  // Validate invoice data if provided
  if (invoice_data) {
    const schema = action === 'create' 
      ? ValidationSchemas.Invoice.create 
      : ValidationSchemas.Invoice.update;
    
    const result = ValidationHelper.validate(schema, invoice_data);
    if (!result.success) {
      return result;
    }
  }
  
  // Validate payment amounts
  if (invoice_data?.amount && invoice_data?.amount_paid) {
    const amountValidation = ValidationHelper.validateInvoiceAmounts(
      invoice_data.amount,
      invoice_data.amount_paid
    );
    if (!amountValidation.valid) {
      return {
        success: false,
        errors: [amountValidation.error!],
      };
    }
  }
  
  // Validate filters if provided
  if (filters) {
    const result = ValidationHelper.validate(ValidationSchemas.Invoice.search, filters);
    if (!result.success) {
      return result;
    }
  }
  
  return { success: true };
}

async function createInvoice(client: NotionClient, invoiceData: any) {
  try {
    // Auto-generate invoice number if not provided
    if (!invoiceData.invoice_number) {
      const timestamp = Date.now();
      invoiceData.invoice_number = `INV-${timestamp}`;
    }
    
    // Set defaults
    invoiceData.amount_paid = invoiceData.amount_paid || 0;
    invoiceData.status = invoiceData.status || 'Draft';
    
    // Validate client exists
    const client_exists = await client.getClientRecord(invoiceData.client_id);
    if (!client_exists) {
      return {
        success: false,
        error: 'Client not found. Please provide a valid client ID.',
      };
    }
    
    const result = await client.createInvoiceRecord(invoiceData);
    
    return {
      success: true,
      message: `Invoice ${invoiceData.invoice_number} created successfully`,
      data: {
        record_id: result.id,
        invoice_number: invoiceData.invoice_number,
        client_name: client_exists.name,
        amount: invoiceData.amount,
        status: invoiceData.status,
        due_date: invoiceData.due_date,
        amount_due: invoiceData.amount - invoiceData.amount_paid,
        created_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function getInvoice(client: NotionClient, recordId: string) {
  try {
    const invoice = await client.getInvoiceRecord(recordId);
    
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    
    // Get client details
    let clientName = 'Unknown Client';
    if (invoice.client_id) {
      try {
        const clientRecord = await client.getClientRecord(invoice.client_id);
        if (clientRecord) {
          clientName = clientRecord.name;
        }
      } catch (error) {
        console.warn('Could not fetch client details:', error);
      }
    }
    
    // Calculate additional fields
    const amountDue = (invoice.amount || 0) - (invoice.amount_paid || 0);
    const isOverdue = invoice.status !== 'Paid' && invoice.due_date && new Date(invoice.due_date) < new Date();
    
    return {
      success: true,
      data: {
        ...invoice,
        client_name: clientName,
        amount_due: amountDue,
        is_overdue: isOverdue,
        days_overdue: isOverdue ? Math.floor((new Date().getTime() - new Date(invoice.due_date!).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to retrieve invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function searchInvoices(client: NotionClient, filters?: any, limit = 50) {
  try {
    const invoices = await client.queryInvoiceRecords(filters, limit);
    
    // Enrich invoices with client names and calculated fields
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        let clientName = 'Unknown Client';
        if (invoice.client_id) {
          try {
            const clientRecord = await client.getClientRecord(invoice.client_id);
            if (clientRecord) {
              clientName = clientRecord.name;
            }
          } catch (error) {
            console.warn('Could not fetch client details:', error);
          }
        }
        
        const amountDue = (invoice.amount || 0) - (invoice.amount_paid || 0);
        const isOverdue = invoice.status !== 'Paid' && invoice.due_date && new Date(invoice.due_date) < new Date();
        
        return {
          ...invoice,
          client_name: clientName,
          amount_due: amountDue,
          is_overdue: isOverdue,
          days_overdue: isOverdue ? Math.floor((new Date().getTime() - new Date(invoice.due_date!).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        };
      })
    );
    
    // Calculate summary statistics
    const summary = {
      total_invoices: enrichedInvoices.length,
      total_amount: enrichedInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      total_paid: enrichedInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0),
      total_outstanding: enrichedInvoices.reduce((sum, inv) => sum + inv.amount_due, 0),
      overdue_count: enrichedInvoices.filter(inv => inv.is_overdue).length,
      overdue_amount: enrichedInvoices
        .filter(inv => inv.is_overdue)
        .reduce((sum, inv) => sum + inv.amount_due, 0),
      status_breakdown: {
        Draft: enrichedInvoices.filter(inv => inv.status === 'Draft').length,
        Sent: enrichedInvoices.filter(inv => inv.status === 'Sent').length,
        Paid: enrichedInvoices.filter(inv => inv.status === 'Paid').length,
        Overdue: enrichedInvoices.filter(inv => inv.status === 'Overdue').length,
      },
    };
    
    return {
      success: true,
      message: `Found ${enrichedInvoices.length} invoices`,
      data: enrichedInvoices,
      summary,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search invoices: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function updateInvoice(client: NotionClient, recordId: string, updates: any) {
  try {
    // Get current invoice to validate updates
    const currentInvoice = await client.getInvoiceRecord(recordId);
    if (!currentInvoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    
    // Validate amount updates
    if (updates.amount || updates.amount_paid) {
      const newAmount = updates.amount || currentInvoice.amount;
      const newAmountPaid = updates.amount_paid || currentInvoice.amount_paid;
      
      const validation = ValidationHelper.validateInvoiceAmounts(newAmount, newAmountPaid);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }
    }
    
    const result = await client.updateInvoiceRecord(recordId, updates);
    
    return {
      success: true,
      message: `Invoice updated successfully`,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function deleteInvoice(client: NotionClient, recordId: string) {
  try {
    // Get invoice details for confirmation
    const invoice = await client.getInvoiceRecord(recordId);
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    
    // Prevent deletion of paid invoices
    if (invoice.status === 'Paid') {
      return {
        success: false,
        error: 'Cannot delete paid invoices. Please contact administrator if deletion is necessary.',
      };
    }
    
    await client.deleteRecord(recordId);
    
    return {
      success: true,
      message: `Invoice ${invoice.invoice_number} deleted successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function updatePayment(client: NotionClient, recordId: string, paymentData: any) {
  try {
    // Get current invoice
    const invoice = await client.getInvoiceRecord(recordId);
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    
    const currentPaid = invoice.amount_paid || 0;
    const newTotalPaid = currentPaid + paymentData.amount_paid;
    const invoiceAmount = invoice.amount || 0;
    
    // Validate payment amount
    if (newTotalPaid > invoiceAmount) {
      return {
        success: false,
        error: `Payment amount would exceed invoice total. Current paid: GHS ${currentPaid}, Invoice total: GHS ${invoiceAmount}`,
      };
    }
    
    // Determine new status
    let newStatus = invoice.status;
    if (newTotalPaid >= invoiceAmount) {
      newStatus = 'Paid';
    } else if (invoice.status === 'Draft') {
      newStatus = 'Sent'; // Assume invoice was sent when payment is received
    }
    
    const updates = {
      amount_paid: newTotalPaid,
      status: newStatus,
      payment_method: paymentData.payment_method,
    };
    
    // Add payment date to notes if provided
    if (paymentData.payment_date || paymentData.payment_reference || paymentData.notes) {
      const paymentDate = paymentData.payment_date || new Date().toISOString().split('T')[0];
      const paymentNote = `Payment: GHS ${paymentData.amount_paid} on ${paymentDate}` +
        (paymentData.payment_reference ? ` (Ref: ${paymentData.payment_reference})` : '') +
        (paymentData.notes ? ` - ${paymentData.notes}` : '');
      
      const existingNotes = invoice.notes || '';
      updates.notes = existingNotes ? `${existingNotes}\n${paymentNote}` : paymentNote;
    }
    
    const result = await client.updateInvoiceRecord(recordId, updates);
    
    return {
      success: true,
      message: newStatus === 'Paid' 
        ? `Payment recorded successfully. Invoice is now fully paid!` 
        : `Payment of GHS ${paymentData.amount_paid} recorded. Outstanding balance: GHS ${invoiceAmount - newTotalPaid}`,
      data: {
        ...result,
        amount_paid: newTotalPaid,
        amount_due: invoiceAmount - newTotalPaid,
        status: newStatus,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function markInvoicePaid(client: NotionClient, recordId: string, paymentData?: any) {
  try {
    const invoice = await client.getInvoiceRecord(recordId);
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    
    if (invoice.status === 'Paid') {
      return {
        success: false,
        error: 'Invoice is already marked as paid',
      };
    }
    
    const invoiceAmount = invoice.amount || 0;
    const currentPaid = invoice.amount_paid || 0;
    const remainingAmount = invoiceAmount - currentPaid;
    
    const updates = {
      amount_paid: invoiceAmount,
      status: 'Paid' as const,
      payment_method: paymentData?.payment_method,
    };
    
    // Add payment completion note
    const paymentDate = paymentData?.payment_date || new Date().toISOString().split('T')[0];
    const paymentNote = `Final payment: GHS ${remainingAmount} on ${paymentDate} - Invoice fully paid`;
    const existingNotes = invoice.notes || '';
    updates.notes = existingNotes ? `${existingNotes}\n${paymentNote}` : paymentNote;
    
    await client.updateInvoiceRecord(recordId, updates);
    
    return {
      success: true,
      message: `Invoice ${invoice.invoice_number} marked as fully paid`,
      data: {
        invoice_number: invoice.invoice_number,
        amount: invoiceAmount,
        payment_completed_on: paymentDate,
        final_payment_amount: remainingAmount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to mark invoice as paid: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function markInvoicesOverdue(client: NotionClient) {
  try {
    // Find invoices that are past due but not marked as overdue
    const filters = {
      overdue_only: false,
      unpaid_only: true,
    };
    
    const invoices = await client.queryInvoiceRecords(filters);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueInvoices = invoices.filter(invoice => {
      if (invoice.status === 'Paid' || invoice.status === 'Overdue') return false;
      if (!invoice.due_date) return false;
      
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate < today;
    });
    
    if (overdueInvoices.length === 0) {
      return {
        success: true,
        message: 'No invoices found that need to be marked overdue',
        data: {
          checked_invoices: invoices.length,
          overdue_invoices: 0,
        },
      };
    }
    
    // Update overdue invoices
    const updatePromises = overdueInvoices.map(invoice =>
      client.updateInvoiceRecord(invoice.id!, { status: 'Overdue' })
    );
    
    await Promise.all(updatePromises);
    
    return {
      success: true,
      message: `Marked ${overdueInvoices.length} invoices as overdue`,
      data: {
        checked_invoices: invoices.length,
        overdue_invoices: overdueInvoices.length,
        marked_overdue: overdueInvoices.map(inv => ({
          invoice_number: inv.invoice_number,
          client_id: inv.client_id,
          amount_due: (inv.amount || 0) - (inv.amount_paid || 0),
          days_overdue: Math.floor((today.getTime() - new Date(inv.due_date!).getTime()) / (1000 * 60 * 60 * 24)),
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to mark invoices overdue: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generatePaymentReminder(client: NotionClient, recordId?: string, filters?: any) {
  try {
    let invoices: any[] = [];
    
    if (recordId) {
      const invoice = await client.getInvoiceRecord(recordId);
      if (invoice) {
        invoices = [invoice];
      }
    } else {
      // Get all unpaid/overdue invoices
      const searchFilters = {
        ...filters,
        unpaid_only: true,
      };
      invoices = await client.queryInvoiceRecords(searchFilters);
    }
    
    if (invoices.length === 0) {
      return {
        success: true,
        message: 'No invoices found for payment reminders',
        data: { reminder_count: 0 },
      };
    }
    
    // Generate reminder data for each invoice
    const reminders = await Promise.all(
      invoices.map(async (invoice) => {
        // Get client details
        let clientName = 'Unknown Client';
        let clientPhone = '';
        let clientEmail = '';
        
        if (invoice.client_id) {
          try {
            const client = await client.getClientRecord(invoice.client_id);
            if (client) {
              clientName = client.name;
              clientPhone = client.phone_number || '';
              clientEmail = client.email || '';
            }
          } catch (error) {
            console.warn('Could not fetch client details:', error);
          }
        }
        
        const amountDue = (invoice.amount || 0) - (invoice.amount_paid || 0);
        const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();
        const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(invoice.due_date!).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        return {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          amount_due: amountDue,
          due_date: invoice.due_date,
          is_overdue: isOverdue,
          days_overdue: daysOverdue,
          urgency: isOverdue ? (daysOverdue > 30 ? 'HIGH' : 'MEDIUM') : 'LOW',
          reminder_message: generateReminderMessage(invoice, clientName, amountDue, isOverdue, daysOverdue),
        };
      })
    );
    
    // Sort by urgency and days overdue
    reminders.sort((a, b) => {
      if (a.urgency !== b.urgency) {
        const urgencyOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
      return b.days_overdue - a.days_overdue;
    });
    
    return {
      success: true,
      message: `Generated ${reminders.length} payment reminders`,
      data: {
        reminder_count: reminders.length,
        high_priority: reminders.filter(r => r.urgency === 'HIGH').length,
        medium_priority: reminders.filter(r => r.urgency === 'MEDIUM').length,
        low_priority: reminders.filter(r => r.urgency === 'LOW').length,
        total_amount_due: reminders.reduce((sum, r) => sum + r.amount_due, 0),
        reminders,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate payment reminders: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generateOverdueReport(client: NotionClient, filters?: any) {
  try {
    const overdueFilters = {
      ...filters,
      overdue_only: true,
    };
    
    const overdueInvoices = await client.queryInvoiceRecords(overdueFilters);
    
    if (overdueInvoices.length === 0) {
      return {
        success: true,
        message: 'No overdue invoices found',
        data: {
          overdue_count: 0,
          total_overdue_amount: 0,
        },
      };
    }
    
    // Enrich with client data and calculate aging
    const enrichedInvoices = await Promise.all(
      overdueInvoices.map(async (invoice) => {
        let clientName = 'Unknown Client';
        
        if (invoice.client_id) {
          try {
            const clientRecord = await client.getClientRecord(invoice.client_id);
            if (clientRecord) {
              clientName = clientRecord.name;
            }
          } catch (error) {
            console.warn('Could not fetch client details:', error);
          }
        }
        
        const amountDue = (invoice.amount || 0) - (invoice.amount_paid || 0);
        const daysOverdue = invoice.due_date 
          ? Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        return {
          ...invoice,
          client_name: clientName,
          amount_due: amountDue,
          days_overdue: daysOverdue,
          aging_bucket: getAgingBucket(daysOverdue),
        };
      })
    );
    
    // Calculate aging analysis
    const agingAnalysis = {
      '1-30 days': { count: 0, amount: 0 },
      '31-60 days': { count: 0, amount: 0 },
      '61-90 days': { count: 0, amount: 0 },
      '90+ days': { count: 0, amount: 0 },
    };
    
    enrichedInvoices.forEach(invoice => {
      const bucket = invoice.aging_bucket;
      agingAnalysis[bucket].count += 1;
      agingAnalysis[bucket].amount += invoice.amount_due;
    });
    
    return {
      success: true,
      message: `Generated overdue report with ${enrichedInvoices.length} overdue invoices`,
      data: {
        overdue_count: enrichedInvoices.length,
        total_overdue_amount: enrichedInvoices.reduce((sum, inv) => sum + inv.amount_due, 0),
        aging_analysis: agingAnalysis,
        invoices: enrichedInvoices.sort((a, b) => b.days_overdue - a.days_overdue),
        oldest_invoice: enrichedInvoices.reduce((oldest, current) => 
          current.days_overdue > oldest.days_overdue ? current : oldest, enrichedInvoices[0]
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate overdue report: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function getPaymentStatus(client: NotionClient, filters?: any) {
  try {
    const invoices = await client.queryInvoiceRecords(filters);
    
    const status = {
      total_invoices: invoices.length,
      total_invoice_value: 0,
      total_paid: 0,
      total_outstanding: 0,
      payment_completion_rate: 0,
      status_breakdown: {
        Draft: { count: 0, amount: 0 },
        Sent: { count: 0, amount: 0 },
        Paid: { count: 0, amount: 0 },
        Overdue: { count: 0, amount: 0 },
      },
      payment_methods: {} as Record<string, { count: number; amount: number }>,
      recent_payments: [] as any[],
    };
    
    // Calculate status breakdown
    for (const invoice of invoices) {
      const invoiceAmount = invoice.amount || 0;
      const amountPaid = invoice.amount_paid || 0;
      const amountDue = invoiceAmount - amountPaid;
      
      status.total_invoice_value += invoiceAmount;
      status.total_paid += amountPaid;
      status.total_outstanding += amountDue;
      
      // Status breakdown
      if (invoice.status) {
        status.status_breakdown[invoice.status].count += 1;
        status.status_breakdown[invoice.status].amount += amountDue;
      }
      
      // Payment methods
      if (invoice.payment_method && amountPaid > 0) {
        if (!status.payment_methods[invoice.payment_method]) {
          status.payment_methods[invoice.payment_method] = { count: 0, amount: 0 };
        }
        status.payment_methods[invoice.payment_method].count += 1;
        status.payment_methods[invoice.payment_method].amount += amountPaid;
      }
    }
    
    status.payment_completion_rate = status.total_invoice_value > 0 
      ? (status.total_paid / status.total_invoice_value) * 100 
      : 0;
    
    return {
      success: true,
      message: 'Payment status analysis completed',
      data: status,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generateRevenueReport(client: NotionClient, filters?: any, config?: any) {
  try {
    const invoices = await client.queryInvoiceRecords(filters);
    
    // Group by time period if specified
    const groupBy = config?.group_by || 'month';
    const revenueData = groupRevenueByPeriod(invoices, groupBy);
    
    const report = {
      period: filters?.date_range || { start: 'All time', end: 'All time' },
      group_by: groupBy,
      revenue_data: revenueData,
      total_revenue: invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0),
      potential_revenue: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      outstanding_revenue: invoices.reduce((sum, inv) => sum + ((inv.amount || 0) - (inv.amount_paid || 0)), 0),
      collection_rate: 0,
      average_invoice_value: 0,
      payment_velocity: {
        average_payment_days: 0, // Would need payment dates to calculate
        on_time_payments: 0,
        overdue_payments: 0,
      },
    };
    
    if (report.potential_revenue > 0) {
      report.collection_rate = (report.total_revenue / report.potential_revenue) * 100;
    }
    
    if (invoices.length > 0) {
      report.average_invoice_value = report.potential_revenue / invoices.length;
    }
    
    return {
      success: true,
      message: 'Revenue report generated successfully',
      data: report,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate revenue report: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function generateAgingReport(client: NotionClient, filters?: any, config?: any) {
  try {
    const invoices = await client.queryInvoiceRecords({ ...filters, unpaid_only: true });
    
    const agingBuckets = config?.aging_buckets || [30, 60, 90];
    const today = new Date();
    
    // Initialize aging buckets
    const agingReport = {
      current: { count: 0, amount: 0, invoices: [] },
    } as any;
    
    // Create dynamic buckets
    for (let i = 0; i < agingBuckets.length; i++) {
      const start = i === 0 ? 1 : agingBuckets[i - 1] + 1;
      const end = agingBuckets[i];
      const key = `${start}-${end} days`;
      agingReport[key] = { count: 0, amount: 0, invoices: [] };
    }
    
    const lastBucket = agingBuckets[agingBuckets.length - 1];
    agingReport[`${lastBucket + 1}+ days`] = { count: 0, amount: 0, invoices: [] };
    
    // Categorize invoices
    for (const invoice of invoices) {
      const amountDue = (invoice.amount || 0) - (invoice.amount_paid || 0);
      
      if (amountDue <= 0) continue; // Skip fully paid invoices
      
      let daysOverdue = 0;
      if (invoice.due_date) {
        const dueDate = new Date(invoice.due_date);
        daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      let bucket = 'current';
      
      if (daysOverdue > 0) {
        // Find appropriate aging bucket
        for (let i = 0; i < agingBuckets.length; i++) {
          const start = i === 0 ? 1 : agingBuckets[i - 1] + 1;
          const end = agingBuckets[i];
          
          if (daysOverdue >= start && daysOverdue <= end) {
            bucket = `${start}-${end} days`;
            break;
          }
        }
        
        // If still not found, must be in the highest bucket
        if (bucket === 'current' && daysOverdue > agingBuckets[agingBuckets.length - 1]) {
          bucket = `${agingBuckets[agingBuckets.length - 1] + 1}+ days`;
        }
      }
      
      agingReport[bucket].count += 1;
      agingReport[bucket].amount += amountDue;
      agingReport[bucket].invoices.push({
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id,
        amount_due: amountDue,
        days_overdue: daysOverdue,
        due_date: invoice.due_date,
      });
    }
    
    // Calculate totals
    let totalAmount = 0;
    let totalCount = 0;
    
    Object.values(agingReport).forEach((bucket: any) => {
      totalAmount += bucket.amount;
      totalCount += bucket.count;
    });
    
    // Add percentages
    Object.keys(agingReport).forEach(key => {
      agingReport[key].percentage = totalAmount > 0 
        ? (agingReport[key].amount / totalAmount) * 100 
        : 0;
    });
    
    return {
      success: true,
      message: `Aging report generated with ${totalCount} outstanding invoices`,
      data: {
        total_outstanding_amount: totalAmount,
        total_outstanding_invoices: totalCount,
        aging_buckets: agingReport,
        generated_at: today.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate aging report: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Utility Functions

function getAgingBucket(daysOverdue: number): string {
  if (daysOverdue <= 30) return '1-30 days';
  if (daysOverdue <= 60) return '31-60 days';
  if (daysOverdue <= 90) return '61-90 days';
  return '90+ days';
}

function generateReminderMessage(invoice: any, clientName: string, amountDue: number, isOverdue: boolean, daysOverdue: number): string {
  const invoiceNumber = invoice.invoice_number || 'N/A';
  const dueDate = invoice.due_date || 'N/A';
  
  if (isOverdue) {
    return `OVERDUE PAYMENT REMINDER: Dear ${clientName}, your invoice ${invoiceNumber} is ${daysOverdue} days overdue. Amount due: GHS ${amountDue.toFixed(2)}. Original due date: ${dueDate}. Please arrange payment as soon as possible.`;
  } else {
    return `PAYMENT REMINDER: Dear ${clientName}, this is a friendly reminder that invoice ${invoiceNumber} is due on ${dueDate}. Amount due: GHS ${amountDue.toFixed(2)}. Thank you for your business.`;
  }
}

function groupRevenueByPeriod(invoices: any[], groupBy: string) {
  const groups = {} as Record<string, { invoiced: number; collected: number; outstanding: number }>;
  
  for (const invoice of invoices) {
    if (!invoice.date_issued) continue;
    
    const date = new Date(invoice.date_issued);
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
      groups[groupKey] = { invoiced: 0, collected: 0, outstanding: 0 };
    }
    
    const invoiceAmount = invoice.amount || 0;
    const amountPaid = invoice.amount_paid || 0;
    const amountDue = invoiceAmount - amountPaid;
    
    groups[groupKey].invoiced += invoiceAmount;
    groups[groupKey].collected += amountPaid;
    groups[groupKey].outstanding += amountDue;
  }
  
  return groups;
}

export default invoiceDbTool;