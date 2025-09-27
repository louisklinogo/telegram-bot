import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const notionInvoicesTool = createTool({
  id: 'notion-invoices-tool',
  description: 'Create and manage invoices in Notion database',
  inputSchema: z.object({
    customer_name: z.string().describe('Customer name'),
    phone_number: z.string().optional().describe('Customer phone number'),
    invoice_number: z.string().describe('Invoice number/identifier'),
    amount: z.number().describe('Total invoice amount'),
    amount_paid: z.number().optional().describe('Amount paid (default: 0)'),
    payment_method: z.string().optional().describe('Payment method: Credit Card, Bank Transfer, PayPal, Check, Cash, Other'),
    status: z.string().optional().describe('Invoice status: Draft, Sent, Paid, Overdue'),
    invoice_pdf_url: z.string().optional().describe('URL to the generated invoice PDF'),
    date_issued: z.string().optional().describe('Date issued (YYYY-MM-DD format)'),
    due_date: z.string().optional().describe('Due date (YYYY-MM-DD format)'),
    notes: z.string().optional().describe('Invoice notes'),
  }),
  execute: async ({ context }, options) => {
    const {
      customer_name,
      phone_number,
      invoice_number,
      amount,
      amount_paid = 0,
      payment_method,
      status = 'Draft',
      invoice_pdf_url,
      date_issued,
      due_date,
      notes
    } = context;

    try {
      // Get Notion API key from environment
      const notionApiKey = process.env.NOTION_API_KEY;
      const invoicesDbId = process.env.NOTION_INVOICES_DB_ID;
      const clientsDbId = process.env.NOTION_CLIENTS_DB_ID;

      if (!notionApiKey || !invoicesDbId || !clientsDbId) {
        throw new Error('Notion API key or database IDs not configured');
      }

      // First, find or create the client
      const clientPage = await findOrCreateClient(notionApiKey, clientsDbId, customer_name, phone_number);

      if (!clientPage) {
        throw new Error('Failed to find or create client');
      }

      // Calculate amount due
      const amountDue = amount - amount_paid;

      // Set default dates if not provided
      const issuedDate = date_issued || new Date().toISOString().split('T')[0];
      const dueDateValue = due_date || getDefaultDueDate(issuedDate);

      // Create invoice page in Notion
      const invoiceData = {
        parent: {
          type: 'database_id',
          database_id: invoicesDbId,
        },
        properties: {
          'Invoice': {
            title: [
              {
                text: {
                  content: invoice_number,
                },
              },
            ],
          },
          'Client': {
            relation: [
              {
                id: clientPage.id,
              },
            ],
          },
          'Amount': {
            number: amount,
          },
          'Amount Paid': {
            number: amount_paid,
          },
          'Amount Due': {
            number: amountDue,
          },
          'Status': {
            status: {
              name: status,
            },
          },
          'Date Issued': {
            date: {
              start: issuedDate,
            },
          },
          'Due Date': {
            date: {
              start: dueDateValue,
            },
          },
        },
      };

      // Add optional properties if provided
      if (payment_method) {
        (invoiceData.properties as any)['Payment Method'] = {
          select: {
            name: payment_method,
          },
        };
      }

      if (invoice_pdf_url) {
        (invoiceData.properties as any)['Invoice PDF'] = {
          url: invoice_pdf_url,
        };
      }

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create invoice: ${response.status} - ${errorText}`);
      }

      const invoicePage = await response.json();

      console.log(`Invoice created: ${invoicePage.id}`);

      return {
        success: true,
        invoice_number,
        invoice_page_id: invoicePage.id,
        invoice_url: invoicePage.url,
        client_name: customer_name,
        amount,
        amount_paid,
        amount_due: amountDue,
        status,
        created_at: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error creating invoice in Notion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// Helper function to find or create a client (reused from orders tool)
async function findOrCreateClient(
  notionApiKey: string,
  clientsDbId: string,
  customerName: string,
  phoneNumber?: string
) {
  try {
    // First, try to find existing client
    const searchResponse = await fetch(`https://api.notion.com/v1/databases/${clientsDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          property: 'Name',
          title: {
            contains: customerName,
          },
        },
      }),
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.results.length > 0) {
        // Client found
        console.log(`Found existing client: ${searchData.results[0].id}`);
        return searchData.results[0];
      }
    }

    // Client not found, create new one
    const clientData = {
      parent: {
        type: 'database_id',
        database_id: clientsDbId,
      },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: customerName,
              },
            },
          ],
        },
        'Phone Number': phoneNumber ? {
          phone_number: phoneNumber,
        } : null,
        'First Contact Date': {
          date: {
            start: new Date().toISOString().split('T')[0],
          },
        },
        'Last Contact': {
          date: {
            start: new Date().toISOString().split('T')[0],
          },
        },
      },
    };

    const createResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(clientData),
    });

    if (createResponse.ok) {
      const clientPage = await createResponse.json();
      console.log(`Created new client: ${clientPage.id}`);
      return clientPage;
    }

    throw new Error('Failed to create new client');

  } catch (error) {
    console.error('Error finding/creating client:', error);
    throw error;
  }
}

// Helper function to get default due date (30 days from issue date)
function getDefaultDueDate(issueDate: string): string {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}