import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Agent as HttpsAgent } from 'https';

// Create a persistent HTTPS agent for Notion API connections
const notionAgent = new HttpsAgent({
  keepAlive: true,
  maxSockets: 5,
  maxFreeSockets: 2,
  timeout: 30000,
});

export const notionOrdersTool = createTool({
  id: 'notion-orders-tool',
  description: 'Create and manage orders in Notion database',
  inputSchema: z.object({
    customer_name: z.string().describe('Customer name'),
    phone_number: z.string().optional().describe('Customer phone number'),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      unit_cost: z.number(),
      total_cost: z.number(),
    })).describe('Order items'),
    total_price: z.number().describe('Total price of the order'),
    invoice_file_url: z.string().nullable().optional().describe('URL to the generated invoice PDF'),
    notes: z.string().optional().describe('Order notes'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    order_id: z.string().optional(),
    order_page_id: z.string().optional(),
    order_url: z.string().optional(),
    client_name: z.string().optional(),
    total_price: z.number().optional(),
    created_at: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }, options) => {
    const { customer_name, phone_number, items, total_price, invoice_file_url, notes } = context;

    try {
      // Get Notion API key from environment
      const notionApiKey = process.env.NOTION_API_KEY;
      const ordersDbId = process.env.NOTION_ORDERS_DB_ID;
      const clientsDbId = process.env.NOTION_CLIENTS_DB_ID;

      if (!notionApiKey || !ordersDbId || !clientsDbId) {
        throw new Error('Notion API key or database IDs not configured');
      }

      // First, find or create the client
      const clientPage = await findOrCreateClient(notionApiKey, clientsDbId, customer_name, phone_number);

      if (!clientPage) {
        throw new Error('Failed to find or create client');
      }

      // Generate next Order ID
      const nextOrderId = await getNextOrderId(notionApiKey, ordersDbId);

      // Format items for Notion
      const itemsText = items.map(item => `${item.name} (Qty: ${item.quantity}, Cost: GHS ${item.unit_cost})`).join(', ');

      // Create order page in Notion
      const orderData = {
        parent: {
          type: 'database_id',
          database_id: ordersDbId,
        },
        properties: {
          'Order ID': {
            title: [
              {
                text: {
                  content: nextOrderId,
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
          'Date': {
            date: {
              start: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            },
          },
          'Status': {
            select: {
              name: 'New',
            },
          },
          'Items': {
            rich_text: [
              {
                text: {
                  content: itemsText,
                },
              },
            ],
          },
          'Quantity': {
            number: items.reduce((sum, item) => sum + item.quantity, 0),
          },
          'Total Price': {
            number: total_price,
          },
          'Paid?': {
            checkbox: false,
          },
          'Invoice/File': {
            url: invoice_file_url || null,
          },
          'Notes': {
            rich_text: notes ? [
              {
                text: {
                  content: notes,
                },
              },
            ] : [],
          },
        },
      };

      // Create order page in Notion with retry logic
      let response: Response | undefined;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${notionApiKey}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify(orderData),
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });

          if (response.ok) break;

          retryCount++;
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(`Notion API error after ${maxRetries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!response || !response.ok) {
        const errorText = response ? await response.text() : 'No response received';
        const statusCode = response?.status || 'Unknown';
        throw new Error(`Failed to create order: ${statusCode} - ${errorText}`);
      }

      const orderPage = await response.json();

      console.log(`Order created: ${orderPage.id}`);

      // Return success response with validation
      const result = {
        success: true,
        order_id: nextOrderId,
        order_page_id: orderPage.id,
        order_url: orderPage.url,
        client_name: customer_name,
        total_price,
        created_at: new Date().toISOString(),
      };

      // Validate result
      const outputSchema = z.object({
        success: z.boolean(),
        order_id: z.string().optional(),
        order_page_id: z.string().optional(),
        order_url: z.string().optional(),
        client_name: z.string().optional(),
        total_price: z.number().optional(),
        created_at: z.string().optional(),
        error: z.string().optional(),
      });

      const validationResult = outputSchema.safeParse(result);
      if (!validationResult.success) {
        console.error('Tool result validation failed:', validationResult.error);
        throw new Error('Internal tool validation error');
      }

      return result;

    } catch (error) {
      console.error('Error creating order in Notion:', error);

      // Return error response with validation
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      const outputSchema = z.object({
        success: z.boolean(),
        order_id: z.string().optional(),
        order_page_id: z.string().optional(),
        order_url: z.string().optional(),
        client_name: z.string().optional(),
        items: z.array(z.object({
          name: z.string(),
          quantity: z.number(),
          unit_cost: z.number(),
          total_cost: z.number(),
        })).optional(),
        total_price: z.number().optional(),
        created_at: z.string().optional(),
        error: z.string().optional(),
      });
      
      const errorValidation = outputSchema.safeParse(errorResult);
      if (!errorValidation.success) {
        console.error('Error result validation failed:', errorValidation.error);
        throw new Error('Internal error validation error');
      }

      return errorResult;
    }
  },
});

// Helper function to find or create a client
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

// Helper function to get next Order ID
async function getNextOrderId(notionApiKey: string, ordersDbId: string): Promise<string> {
  try {
    // Query existing orders to find the highest Order ID
    const response = await fetch(`https://api.notion.com/v1/databases/${ordersDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        sorts: [
          {
            property: 'Order ID',
            direction: 'descending',
          },
        ],
        page_size: 1,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.results.length > 0) {
        const lastOrder = data.results[0];
        const lastOrderId = lastOrder.properties['Order ID'].title[0].text.content;

        // Extract number from Order ID (assuming format like "ORD-001")
        const match = lastOrderId.match(/(\d+)$/);
        if (match) {
          const nextNumber = parseInt(match[1]) + 1;
          return `ORD-${nextNumber.toString().padStart(3, '0')}`;
        }
      }
    }

    // If no orders found or error, start with ORD-001
    return 'ORD-001';

  } catch (error) {
    console.error('Error getting next Order ID:', error);
    return 'ORD-001';
  }
}