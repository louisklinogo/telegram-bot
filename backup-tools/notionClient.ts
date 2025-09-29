/**
 * Centralized Notion API client
 * Provides reusable functions for all Notion database operations
 */

import { 
  NotionApiResponse, 
  NotionQueryOptions, 
  NotionDatabaseQueryResult,
  CreateRecordOptions,
  UpdateRecordOptions,
  QueryRecordsOptions,
  Client,
  Order,
  Invoice,
  // FinanceEntry removed - not in core business databases
  Measurement,
  NotionError,
  ToolResponse
} from '../types/notion';

// Notion API configuration
const NOTION_VERSION = '2022-06-28';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

// Database IDs from environment variables
export const getDatabaseIds = () => ({
  clients: process.env.NOTION_CLIENTS_DB_ID!,
  orders: process.env.NOTION_ORDERS_DB_ID!,
  invoices: process.env.NOTION_INVOICES_DB_ID!,
  finances: process.env.NOTION_FINANCES_DB_ID!,
  measurements: process.env.NOTION_MEASUREMENTS_DB_ID!,
});

// Helper function to get API headers
const getHeaders = () => ({
  'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
  'Content-Type': 'application/json',
  'Notion-Version': NOTION_VERSION,
});

// Generic error handler for Notion API responses
export const handleNotionError = async (response: Response): Promise<never> => {
  const errorData = await response.text();
  let parsedError: NotionError;
  
  try {
    parsedError = JSON.parse(errorData);
  } catch {
    parsedError = {
      object: 'error',
      status: response.status,
      code: 'unknown_error',
      message: errorData || `HTTP ${response.status}`,
    };
  }
  
  console.error(`Notion API Error [${parsedError.status}]:`, parsedError);
  throw new Error(`Notion API Error: ${parsedError.message}`);
};

// Generic function to query any database
export async function queryDatabase<T>(options: QueryRecordsOptions): Promise<NotionDatabaseQueryResult<T>> {
  try {
    const { database_id, filter, sorts, page_size = 20, start_cursor } = options;
    
    const body: any = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (page_size) body.page_size = page_size;
    if (start_cursor) body.start_cursor = start_cursor;

    const response = await fetch(`${NOTION_BASE_URL}/databases/${database_id}/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleNotionError(response);
    }

    const data = await response.json();
    
    return {
      results: data.results.map((item: any) => parseNotionPage<T>(item)),
      has_more: data.has_more,
      next_cursor: data.next_cursor,
      total_count: data.results.length,
    };
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}

// Generic function to create a record in any database
export async function createRecord(options: CreateRecordOptions<any>): Promise<any> {
  try {
    const { database_id, properties } = options;
    
    const body = {
      parent: {
        type: 'database_id',
        database_id,
      },
      properties: formatPropertiesForNotion(properties),
    };

    const response = await fetch(`${NOTION_BASE_URL}/pages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleNotionError(response);
    }

    const data = await response.json();
    return parseNotionPage(data);
  } catch (error) {
    console.error('Error creating record:', error);
    throw error;
  }
}

// Generic function to update a record
export async function updateRecord(options: UpdateRecordOptions<any>): Promise<any> {
  try {
    const { page_id, properties } = options;
    
    const body = {
      properties: formatPropertiesForNotion(properties),
    };

    const response = await fetch(`${NOTION_BASE_URL}/pages/${page_id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleNotionError(response);
    }

    const data = await response.json();
    return parseNotionPage(data);
  } catch (error) {
    console.error('Error updating record:', error);
    throw error;
  }
}

// Get a single page by ID
export async function getPage(pageId: string): Promise<any> {
  try {
    const response = await fetch(`${NOTION_BASE_URL}/pages/${pageId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      await handleNotionError(response);
    }

    const data = await response.json();
    return parseNotionPage(data);
  } catch (error) {
    console.error('Error getting page:', error);
    throw error;
  }
}

// Delete a page (archive in Notion)
export async function deletePage(pageId: string): Promise<boolean> {
  try {
    const response = await fetch(`${NOTION_BASE_URL}/pages/${pageId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        archived: true,
      }),
    });

    if (!response.ok) {
      await handleNotionError(response);
    }

    return true;
  } catch (error) {
    console.error('Error deleting page:', error);
    throw error;
  }
}

// Helper function to format properties for Notion API
function formatPropertiesForNotion(properties: Record<string, any>): Record<string, any> {
  const formatted: Record<string, any> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) continue;

    // Handle different property types
    if (typeof value === 'string') {
      // Check if it's a title property (usually 'Name' or ends with 'Name')
      if (key.toLowerCase().includes('name') || key === 'Entry Name' || key === 'Invoice') {
        formatted[key] = {
          title: [{
            text: { content: value }
          }]
        };
      } else if (key.toLowerCase().includes('date')) {
        formatted[key] = {
          date: { start: value }
        };
      } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('file')) {
        formatted[key] = value.startsWith('http') ? { url: value } : { rich_text: [{ text: { content: value } }] };
      } else {
        formatted[key] = {
          rich_text: [{
            text: { content: value }
          }]
        };
      }
    } else if (typeof value === 'number') {
      formatted[key] = { number: value };
    } else if (typeof value === 'boolean') {
      formatted[key] = { checkbox: value };
    } else if (Array.isArray(value)) {
      // Handle relations
      formatted[key] = {
        relation: value.map(id => ({ id }))
      };
    } else if (value.type === 'select') {
      formatted[key] = {
        select: { name: value.name }
      };
    } else if (value.type === 'relation') {
      formatted[key] = {
        relation: [{ id: value.id }]
      };
    }
  }

  return formatted;
}

// Helper function to parse Notion page response
function parseNotionPage<T>(page: any): T {
  const parsed: any = {
    id: page.id,
    url: page.url,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
  };

  // Parse properties based on their types
  for (const [key, property] of Object.entries(page.properties || {})) {
    const prop = property as any;
    
    switch (prop.type) {
      case 'title':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.title?.[0]?.text?.content || '';
        break;
      case 'rich_text':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.rich_text?.[0]?.text?.content || '';
        break;
      case 'number':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.number || 0;
        break;
      case 'select':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.select?.name || '';
        break;
      case 'multi_select':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.multi_select?.map((item: any) => item.name) || [];
        break;
      case 'date':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.date?.start || '';
        break;
      case 'checkbox':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.checkbox || false;
        break;
      case 'url':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.url || '';
        break;
      case 'email':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.email || '';
        break;
      case 'phone_number':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.phone_number || '';
        break;
      case 'relation':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.relation?.map((item: any) => item.id) || [];
        break;
      case 'people':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.people?.map((person: any) => ({
          id: person.id,
          name: person.name,
          email: person.person?.email,
        })) || [];
        break;
      case 'files':
        parsed[key.toLowerCase().replace(/\s+/g, '_')] = prop.files?.map((file: any) => file.file?.url || file.external?.url) || [];
        break;
    }
  }

  return parsed as T;
}

// Specialized functions for each database
export const ClientOperations = {
  async findByName(name: string): Promise<Client | null> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<Client>({
      database_id: dbIds.clients,
      filter: {
        property: 'Name',
        title: { contains: name }
      },
      page_size: 1
    });
    
    return result.results.length > 0 ? result.results[0] : null;
  },

  async create(clientData: Partial<Client>): Promise<Client> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.clients,
      properties: clientData
    });
  },

  async getAll(): Promise<Client[]> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<Client>({
      database_id: dbIds.clients,
      sorts: [{ property: 'Name', direction: 'ascending' }]
    });
    
    return result.results;
  }
};

export const OrderOperations = {
  async findByOrderId(orderId: string): Promise<Order | null> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<Order>({
      database_id: dbIds.orders,
      filter: {
        property: 'Order ID',
        title: { equals: orderId }
      },
      page_size: 1
    });
    
    return result.results.length > 0 ? result.results[0] : null;
  },

  async create(orderData: Partial<Order>): Promise<Order> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.orders,
      properties: orderData
    });
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<Order>({
      database_id: dbIds.orders,
      filter: {
        and: [
          { property: 'Date', date: { on_or_after: startDate } },
          { property: 'Date', date: { on_or_before: endDate } }
        ]
      },
      sorts: [{ property: 'Date', direction: 'descending' }]
    });
    
    return result.results;
  }
};

export const InvoiceOperations = {
  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<Invoice>({
      database_id: dbIds.invoices,
      filter: {
        property: 'Invoice',
        title: { equals: invoiceNumber }
      },
      page_size: 1
    });
    
    return result.results.length > 0 ? result.results[0] : null;
  },

  async create(invoiceData: Partial<Invoice>): Promise<Invoice> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.invoices,
      properties: invoiceData
    });
  },

  async getUnpaid(): Promise<Invoice[]> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<Invoice>({
      database_id: dbIds.invoices,
      filter: {
        or: [
          { property: 'Status', select: { equals: 'Sent' } },
          { property: 'Status', select: { equals: 'Overdue' } }
        ]
      },
      sorts: [{ property: 'Due Date', direction: 'ascending' }]
    });
    
    return result.results;
  }
};

export const FinanceOperations = {
  async create(financeData: Partial<FinanceEntry>): Promise<FinanceEntry> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.finances,
      properties: financeData
    });
  },

  async getByDateRange(startDate: string, endDate: string): Promise<FinanceEntry[]> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<FinanceEntry>({
      database_id: dbIds.finances,
      filter: {
        and: [
          { property: 'Date', date: { on_or_after: startDate } },
          { property: 'Date', date: { on_or_before: endDate } }
        ]
      },
      sorts: [{ property: 'Date', direction: 'descending' }]
    });
    
    return result.results;
  },

  async getByType(type: 'Income' | 'Expense' | 'Transfer' | 'Refund' | 'Investment'): Promise<FinanceEntry[]> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<FinanceEntry>({
      database_id: dbIds.finances,
      filter: {
        property: 'Type',
        select: { equals: type }
      },
      sorts: [{ property: 'Date', direction: 'descending' }]
    });
    
    return result.results;
  },

  async getByCategory(category: string): Promise<FinanceEntry[]> {
    const dbIds = getDatabaseIds();
    const result = await queryDatabase<FinanceEntry>({
      database_id: dbIds.finances,
      filter: {
        property: 'Category',
        select: { equals: category }
      },
      sorts: [{ property: 'Date', direction: 'descending' }]
    });
    
    return result.results;
  }
};

// Utility function to create standardized tool responses
export function createToolResponse<T>(
  success: boolean, 
  data?: T, 
  message?: string, 
  error?: string
): ToolResponse<T> {
  return {
    success,
    data,
    message,
    error,
  };
}

// Consolidated NotionClient class for easy import and usage
export class NotionClient {
  // Client operations
  async getClientRecord(clientId: string): Promise<Client | null> {
    try {
      return await getPage(clientId) as Client;
    } catch {
      return null;
    }
  }

  async queryClientRecords(filters?: any, limit = 50): Promise<Client[]> {
    const dbIds = getDatabaseIds();
    const queryOptions: QueryRecordsOptions = {
      database_id: dbIds.clients,
      page_size: Math.min(limit, 100)
    };
    
    if (filters) {
      if (filters.name) {
        queryOptions.filter = {
          property: 'Name',
          title: { contains: filters.name }
        };
      }
    }
    
    const result = await queryDatabase<Client>(queryOptions);
    return result.results;
  }

  async createClientRecord(clientData: any): Promise<Client> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.clients,
      properties: clientData
    });
  }

  async updateClientRecord(clientId: string, updates: any): Promise<Client> {
    return await updateRecord({
      page_id: clientId,
      properties: updates
    });
  }

  // Order operations
  async getOrderRecord(orderId: string): Promise<Order | null> {
    try {
      return await getPage(orderId) as Order;
    } catch {
      return null;
    }
  }

  async queryOrderRecords(filters?: any, limit = 50): Promise<Order[]> {
    const dbIds = getDatabaseIds();
    const queryOptions: QueryRecordsOptions = {
      database_id: dbIds.orders,
      page_size: Math.min(limit, 100)
    };
    
    if (filters) {
      if (filters.client_id) {
        queryOptions.filter = {
          property: 'Client',
          relation: { contains: filters.client_id }
        };
      }
    }
    
    const result = await queryDatabase<Order>(queryOptions);
    return result.results;
  }

  async createOrderRecord(orderData: any): Promise<Order> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.orders,
      properties: orderData
    });
  }

  async updateOrderRecord(orderId: string, updates: any): Promise<Order> {
    return await updateRecord({
      page_id: orderId,
      properties: updates
    });
  }

  // Invoice operations
  async getInvoiceRecord(invoiceId: string): Promise<Invoice | null> {
    try {
      return await getPage(invoiceId) as Invoice;
    } catch {
      return null;
    }
  }

  async queryInvoiceRecords(filters?: any, limit = 50): Promise<Invoice[]> {
    const dbIds = getDatabaseIds();
    const queryOptions: QueryRecordsOptions = {
      database_id: dbIds.invoices,
      page_size: Math.min(limit, 100)
    };
    
    if (filters) {
      if (filters.client_id) {
        queryOptions.filter = {
          property: 'Client',
          relation: { contains: filters.client_id }
        };
      } else if (filters.unpaid_only) {
        queryOptions.filter = {
          or: [
            { property: 'Status', select: { equals: 'Sent' } },
            { property: 'Status', select: { equals: 'Overdue' } }
          ]
        };
      }
    }
    
    const result = await queryDatabase<Invoice>(queryOptions);
    return result.results;
  }

  async createInvoiceRecord(invoiceData: any): Promise<Invoice> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.invoices,
      properties: invoiceData
    });
  }

  async updateInvoiceRecord(invoiceId: string, updates: any): Promise<Invoice> {
    return await updateRecord({
      page_id: invoiceId,
      properties: updates
    });
  }

  // Finance operations
  async getFinanceRecord(financeId: string): Promise<FinanceEntry | null> {
    try {
      return await getPage(financeId) as FinanceEntry;
    } catch {
      return null;
    }
  }

  async queryFinanceRecords(filters?: any, limit = 50): Promise<FinanceEntry[]> {
    const dbIds = getDatabaseIds();
    const queryOptions: QueryRecordsOptions = {
      database_id: dbIds.finances,
      page_size: Math.min(limit, 100)
    };
    
    if (filters) {
      if (filters.type) {
        queryOptions.filter = {
          property: 'Type',
          select: { equals: filters.type }
        };
      } else if (filters.linked_order) {
        queryOptions.filter = {
          property: 'Linked Order',
          relation: { contains: filters.linked_order }
        };
      }
    }
    
    const result = await queryDatabase<FinanceEntry>(queryOptions);
    return result.results;
  }

  async createFinanceRecord(financeData: any): Promise<FinanceEntry> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.finances,
      properties: financeData
    });
  }

  async updateFinanceRecord(financeId: string, updates: any): Promise<FinanceEntry> {
    return await updateRecord({
      page_id: financeId,
      properties: updates
    });
  }

  // Measurement operations
  async getMeasurementRecord(measurementId: string): Promise<Measurement | null> {
    try {
      return await getPage(measurementId) as Measurement;
    } catch {
      return null;
    }
  }

  async queryMeasurementRecords(filters?: any, limit = 50): Promise<Measurement[]> {
    const dbIds = getDatabaseIds();
    const queryOptions: QueryRecordsOptions = {
      database_id: dbIds.measurements,
      page_size: Math.min(limit, 100)
    };
    
    if (filters) {
      if (filters.client_id) {
        queryOptions.filter = {
          property: 'Client',
          relation: { contains: filters.client_id }
        };
      }
    }
    
    const result = await queryDatabase<Measurement>(queryOptions);
    return result.results;
  }

  async createMeasurementRecord(measurementData: any): Promise<Measurement> {
    const dbIds = getDatabaseIds();
    return await createRecord({
      database_id: dbIds.measurements,
      properties: measurementData
    });
  }

  async updateMeasurementRecord(measurementId: string, updates: any): Promise<Measurement> {
    return await updateRecord({
      page_id: measurementId,
      properties: updates
    });
  }

  // Generic operations
  async deleteRecord(recordId: string): Promise<boolean> {
    return await deletePage(recordId);
  }

  async testConnection(): Promise<boolean> {
    try {
      const dbIds = getDatabaseIds();
      await queryDatabase({
        database_id: dbIds.clients,
        page_size: 1
      });
      return true;
    } catch (error) {
      console.error('Notion connection test failed:', error);
      return false;
    }
  }
}

// Test connection function (legacy support)
export async function testNotionConnection(): Promise<boolean> {
  const client = new NotionClient();
  return await client.testConnection();
}
