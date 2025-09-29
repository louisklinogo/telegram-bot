import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const notionSearchTool = createTool({
  id: 'notion-search-tool',
  description: 'Search across all Notion databases (clients, orders, measurements) with filters',
  inputSchema: z.object({
    query: z.string().describe('Search query text'),
    database: z.enum(['clients', 'orders', 'measurements', 'all']).default('all').describe('Which database to search'),
    filters: z.object({
      date_range: z.object({
        start: z.string().optional(),
        end: z.string().optional()
      }).optional(),
      client_name: z.string().optional(),
      status: z.string().optional(),
      paid: z.boolean().optional()
    }).optional().describe('Additional filters to apply')
  }),
  execute: async ({ context }) => {
    const { query, database, filters } = context;
    
    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
      throw new Error('Notion API key not configured');
    }

    const databases = {
      clients: process.env.NOTION_CLIENTS_DB_ID,
      orders: process.env.NOTION_ORDERS_DB_ID,
      measurements: process.env.NOTION_MEASUREMENTS_DB_ID
    };

    const results = [];
    const searchTargets = database === 'all' ? Object.keys(databases) : [database];

    for (const dbType of searchTargets) {
      try {
        const dbId = databases[dbType as keyof typeof databases];
        if (!dbId) continue;

        // Build search filter based on database type
        let searchFilter: any = {};
        
        if (query) {
          if (dbType === 'clients') {
            searchFilter = {
              property: 'Name',
              title: { contains: query }
            };
          } else if (dbType === 'orders') {
            searchFilter = {
              or: [
                { property: 'Order ID', title: { contains: query } },
                { property: 'Items', rich_text: { contains: query } }
              ]
            };
          } else if (dbType === 'measurements') {
            searchFilter = {
              property: 'Measurement Name',
              title: { contains: query }
            };
          }
        }

        // Apply additional filters
        if (filters) {
          const additionalFilters = [];
          
          if (filters.date_range?.start || filters.date_range?.end) {
            const dateFilter: any = { property: 'Date', date: {} };
            if (filters.date_range.start) dateFilter.date.on_or_after = filters.date_range.start;
            if (filters.date_range.end) dateFilter.date.on_or_before = filters.date_range.end;
            additionalFilters.push(dateFilter);
          }

          if (filters.status && dbType === 'orders') {
            additionalFilters.push({
              property: 'Status',
              select: { equals: filters.status }
            });
          }

          if (filters.paid !== undefined && dbType === 'orders') {
            additionalFilters.push({
              property: 'Paid?',
              checkbox: { equals: filters.paid }
            });
          }

          if (additionalFilters.length > 0) {
            searchFilter = {
              and: [searchFilter, ...additionalFilters].filter(Boolean)
            };
          }
        }

        const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notionApiKey}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            filter: Object.keys(searchFilter).length > 0 ? searchFilter : undefined,
            sorts: [{ property: 'Date', direction: 'descending' }],
            page_size: 20
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          for (const page of data.results) {
            const result: any = {
              type: dbType,
              id: page.id,
              url: page.url,
              created_time: page.created_time
            };

            // Extract relevant properties based on database type
            if (dbType === 'clients') {
              result.name = page.properties.Name?.title?.[0]?.text?.content || '';
              result.phone = page.properties['Phone Number']?.phone_number || '';
              result.first_contact = page.properties['First Contact Date']?.date?.start;
            } else if (dbType === 'orders') {
              result.order_id = page.properties['Order ID']?.title?.[0]?.text?.content || '';
              result.items = page.properties.Items?.rich_text?.[0]?.text?.content || '';
              result.total_price = page.properties['Total Price']?.number || 0;
              result.status = page.properties.Status?.select?.name || '';
              result.paid = page.properties['Paid?']?.checkbox || false;
            } else if (dbType === 'measurements') {
              result.measurement_name = page.properties['Measurement Name']?.title?.[0]?.text?.content || '';
              result.date_taken = page.properties['Date Taken']?.date?.start;
            }

            results.push(result);
          }
        }
      } catch (error) {
        console.error(`Error searching ${dbType}:`, error);
      }
    }

    return {
      success: true,
      total_results: results.length,
      results: results.slice(0, 10), // Limit results for response size
      searched_databases: searchTargets,
      query,
      filters
    };
  }
});