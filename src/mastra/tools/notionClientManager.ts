import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { Client } from '../types/notion';

/**
 * Notion Client Manager - Simple CRUD operations for Clients database
 * Handles: Create, Read, Update, Search client records
 * 
 * Matches Notion database fields:
 * - Name (Title)
 * - Phone (Phone Number) 
 * - Email (Email)
 * - Address (Rich Text)
 * - Date (Date - registration date)
 */

export const notionClientManager = createTool({
  id: 'notion-client-manager',
  description: 'Manage client records in Notion - create, read, update, and search clients',
  
  inputSchema: z.object({
    action: z.enum(['create', 'read', 'update', 'search']).describe('Action to perform'),
    
    // For create/update
    client_data: z.object({
      name: z.string().min(1).describe('Client full name'),
      phone: z.string().optional().describe('Client phone number'),
      email: z.string().email().optional().describe('Client email address'),
      address: z.string().optional().describe('Client physical address'),
      date: z.string().optional().describe('Registration date (YYYY-MM-DD)')
    }).optional(),
    
    // For read/update
    client_id: z.string().optional().describe('Notion page ID of the client'),
    
    // For search
    search_query: z.string().optional().describe('Search by name or phone'),
    
    // General options
    limit: z.number().min(1).max(100).default(10).describe('Max results to return')
  }),
  
  execute: async ({ context }) => {
    const { action, client_data, client_id, search_query, limit } = context;
    
    try {
      // Get environment variables
      const notionApiKey = process.env.NOTION_API_KEY;
      const clientsDbId = process.env.NOTION_CLIENTS_DB_ID;
      
      if (!notionApiKey || !clientsDbId) {
        return {
          success: false,
          error: 'Notion API key or Clients database ID not configured'
        };
      }
      
      const headers = {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      };
      
      switch (action) {
        case 'create':
          if (!client_data) {
            return { success: false, error: 'Client data required for creation' };
          }
          
          const createData = {
            parent: { database_id: clientsDbId },
            properties: {
              'Name': {
                title: [{ text: { content: client_data.name } }]
              },
              ...(client_data.phone && {
                'Phone': { phone_number: client_data.phone }
              }),
              ...(client_data.email && {
                'Email': { email: client_data.email }
              }),
              ...(client_data.address && {
                'Address': { rich_text: [{ text: { content: client_data.address } }] }
              }),
              ...(client_data.date && {
                'Date': { date: { start: client_data.date } }
              })
            }
          };
          
          const createResponse = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers,
            body: JSON.stringify(createData)
          });
          
          if (!createResponse.ok) {
            const error = await createResponse.text();
            return { success: false, error: `Failed to create client: ${error}` };
          }
          
          const createdClient = await createResponse.json();
          return {
            success: true,
            data: {
              client_id: createdClient.id,
              url: createdClient.url,
              name: client_data.name
            }
          };
          
        case 'read':
          if (!client_id) {
            return { success: false, error: 'Client ID required for read operation' };
          }
          
          const readResponse = await fetch(`https://api.notion.com/v1/pages/${client_id}`, {
            headers
          });
          
          if (!readResponse.ok) {
            return { success: false, error: 'Client not found' };
          }
          
          const clientData = await readResponse.json();
          const client: Partial<Client> = {
            id: clientData.id,
            name: clientData.properties.Name?.title?.[0]?.text?.content || '',
            phone: clientData.properties.Phone?.phone_number || undefined,
            email: clientData.properties.Email?.email || undefined,
            address: clientData.properties.Address?.rich_text?.[0]?.text?.content || undefined,
            date: clientData.properties.Date?.date?.start || undefined,
            url: clientData.url,
            created_time: clientData.created_time
          };
          
          return { success: true, data: { client } };
          
        case 'update':
          if (!client_id || !client_data) {
            return { success: false, error: 'Client ID and data required for update' };
          }
          
          const updateData = {
            properties: {
              ...(client_data.name && {
                'Name': { title: [{ text: { content: client_data.name } }] }
              }),
              ...(client_data.phone && {
                'Phone': { phone_number: client_data.phone }
              }),
              ...(client_data.email && {
                'Email': { email: client_data.email }
              }),
              ...(client_data.address && {
                'Address': { rich_text: [{ text: { content: client_data.address } }] }
              }),
              ...(client_data.date && {
                'Date': { date: { start: client_data.date } }
              })
            }
          };
          
          const updateResponse = await fetch(`https://api.notion.com/v1/pages/${client_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateData)
          });
          
          if (!updateResponse.ok) {
            const error = await updateResponse.text();
            return { success: false, error: `Failed to update client: ${error}` };
          }
          
          return { success: true, data: { client_id, updated: true } };
          
        case 'search':
          if (!search_query) {
            return { success: false, error: 'Search query required' };
          }
          
          const searchData = {
            filter: {
              or: [
                {
                  property: 'Name',
                  title: { contains: search_query }
                },
                {
                  property: 'Phone',
                  phone_number: { contains: search_query }
                }
              ]
            },
            sorts: [
              { property: 'Name', direction: 'ascending' as const }
            ],
            page_size: limit
          };
          
          const searchResponse = await fetch(`https://api.notion.com/v1/databases/${clientsDbId}/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify(searchData)
          });
          
          if (!searchResponse.ok) {
            const error = await searchResponse.text();
            return { success: false, error: `Search failed: ${error}` };
          }
          
          const searchResults = await searchResponse.json();
          const clients = searchResults.results.map((result: any) => ({
            id: result.id,
            name: result.properties.Name?.title?.[0]?.text?.content || '',
            phone: result.properties.Phone?.phone_number || undefined,
            email: result.properties.Email?.email || undefined,
            url: result.url
          }));
          
          return {
            success: true,
            data: {
              clients,
              total: clients.length,
              query: search_query
            }
          };
          
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
      
    } catch (error) {
      console.error('Client Manager Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
});