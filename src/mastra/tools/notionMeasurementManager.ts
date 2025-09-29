import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { Measurement } from '../types/notion';

/**
 * Notion Measurement Manager - Simple CRUD operations for Measurements database
 * Handles: Create, Read, Update, Search measurement records
 * 
 * Matches Notion database fields:
 * - Measurement Name (Title)
 * - Client (Relation)
 * - Date Taken (Date)
 * - Chest, Shoulder, Sleeves, Neck, Waist, Lap, Stomach, Hip (Numbers)
 * - RD, RD 2 (Text) - Bicep measurements
 * - LT (Text) - Top length (supports dual entries like "31/37")
 * - LT 2 (Text) - Trouser length (single value)
 */

// Simple measurement text parser
const parseMeasurementText = (text: string): Record<string, string> => {
  const measurements: Record<string, string> = {};
  const parts = text.split(/\s+/);
  
  for (let i = 0; i < parts.length - 1; i += 2) {
    const key = parts[i]?.toUpperCase();
    const value = parts[i + 1];
    if (key && value && !isNaN(Number(value)) || key === 'LT' || key === 'RD') {
      measurements[key] = value;
    }
  }
  
  return measurements;
};

export const notionMeasurementManager = createTool({
  id: 'notion-measurement-manager',
  description: 'Manage measurement records in Notion - create, read, update, and search measurements',
  
  inputSchema: z.object({
    action: z.enum(['create', 'read', 'update', 'search']).describe('Action to perform'),
    
    // For create/update
    measurement_data: z.object({
      measurement_name: z.string().min(1).describe('Measurement record name'),
      client_id: z.string().describe('Client Notion page ID'),
      date_taken: z.string().optional().describe('Date measurements were taken (YYYY-MM-DD)'),
      chest: z.number().optional(),
      shoulder: z.number().optional(),
      sleeves: z.number().optional(),
      neck: z.number().optional(),
      waist: z.number().optional(),
      lap: z.number().optional(),
      stomach: z.number().optional(),
      hip: z.number().optional(),
      rd: z.string().optional().describe('Bicep round measurement'),
      rd2: z.string().optional().describe('Additional bicep measurement'),
      lt: z.string().optional().describe('Top length - supports dual entries like 31/37'),
      lt2: z.string().optional().describe('Trouser length - single value only')
    }).optional(),
    
    // For read/update
    measurement_id: z.string().optional().describe('Notion page ID of the measurement'),
    
    // For search
    client_id: z.string().optional().describe('Filter by client ID'),
    search_query: z.string().optional().describe('Search by measurement name'),
    
    // For parsing text measurements
    measurement_text: z.string().optional().describe('Raw measurement text to parse'),
    
    // General options
    limit: z.number().min(1).max(100).default(10).describe('Max results to return')
  }),
  
  execute: async ({ context }) => {
    const { action, measurement_data, measurement_id, client_id, search_query, measurement_text, limit } = context;
    
    try {
      // Get environment variables
      const notionApiKey = process.env.NOTION_API_KEY;
      const measurementsDbId = process.env.NOTION_MEASUREMENTS_DB_ID;
      
      if (!notionApiKey || !measurementsDbId) {
        return {
          success: false,
          error: 'Notion API key or Measurements database ID not configured'
        };
      }
      
      const headers = {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      };
      
      // Special action: parse measurement text
      if (measurement_text) {
        const parsed = parseMeasurementText(measurement_text);
        return {
          success: true,
          data: {
            parsed_measurements: parsed,
            raw_text: measurement_text
          }
        };
      }
      
      switch (action) {
        case 'create':
          if (!measurement_data) {
            return { success: false, error: 'Measurement data required for creation' };
          }
          
          const createData = {
            parent: { database_id: measurementsDbId },
            properties: {
              'Measurement Name': {
                title: [{ text: { content: measurement_data.measurement_name } }]
              },
              'Client': {
                relation: [{ id: measurement_data.client_id }]
              },
              ...(measurement_data.date_taken && {
                'Date Taken': { date: { start: measurement_data.date_taken } }
              }),
              ...(measurement_data.chest && {
                'Chest': { number: measurement_data.chest }
              }),
              ...(measurement_data.shoulder && {
                'Shoulder': { number: measurement_data.shoulder }
              }),
              ...(measurement_data.sleeves && {
                'Sleeves': { number: measurement_data.sleeves }
              }),
              ...(measurement_data.neck && {
                'Neck': { number: measurement_data.neck }
              }),
              ...(measurement_data.waist && {
                'Waist': { number: measurement_data.waist }
              }),
              ...(measurement_data.lap && {
                'Lap': { number: measurement_data.lap }
              }),
              ...(measurement_data.stomach && {
                'Stomach': { number: measurement_data.stomach }
              }),
              ...(measurement_data.hip && {
                'Hip': { number: measurement_data.hip }
              }),
              ...(measurement_data.rd && {
                'RD': { rich_text: [{ text: { content: measurement_data.rd } }] }
              }),
              ...(measurement_data.rd2 && {
                'RD 2': { rich_text: [{ text: { content: measurement_data.rd2 } }] }
              }),
              ...(measurement_data.lt && {
                'LT': { rich_text: [{ text: { content: measurement_data.lt } }] }
              }),
              ...(measurement_data.lt2 && {
                'LT 2': { rich_text: [{ text: { content: measurement_data.lt2 } }] }
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
            return { success: false, error: `Failed to create measurement: ${error}` };
          }
          
          const createdMeasurement = await createResponse.json();
          return {
            success: true,
            data: {
              measurement_id: createdMeasurement.id,
              url: createdMeasurement.url,
              name: measurement_data.measurement_name
            }
          };
          
        case 'read':
          if (!measurement_id) {
            return { success: false, error: 'Measurement ID required for read operation' };
          }
          
          const readResponse = await fetch(`https://api.notion.com/v1/pages/${measurement_id}`, {
            headers
          });
          
          if (!readResponse.ok) {
            return { success: false, error: 'Measurement not found' };
          }
          
          const measurementData = await readResponse.json();
          const measurement: Partial<Measurement> = {
            id: measurementData.id,
            measurement_name: measurementData.properties['Measurement Name']?.title?.[0]?.text?.content || '',
            client: {
              id: measurementData.properties.Client?.relation?.[0]?.id || '',
              name: 'Client' // Would need another query to get client name
            },
            date_taken: measurementData.properties['Date Taken']?.date?.start || undefined,
            chest: measurementData.properties.Chest?.number || undefined,
            shoulder: measurementData.properties.Shoulder?.number || undefined,
            sleeves: measurementData.properties.Sleeves?.number || undefined,
            neck: measurementData.properties.Neck?.number || undefined,
            waist: measurementData.properties.Waist?.number || undefined,
            lap: measurementData.properties.Lap?.number || undefined,
            stomach: measurementData.properties.Stomach?.number || undefined,
            hip: measurementData.properties.Hip?.number || undefined,
            rd: measurementData.properties.RD?.rich_text?.[0]?.text?.content || undefined,
            rd2: measurementData.properties['RD 2']?.rich_text?.[0]?.text?.content || undefined,
            lt: measurementData.properties.LT?.rich_text?.[0]?.text?.content || undefined,
            lt2: measurementData.properties['LT 2']?.rich_text?.[0]?.text?.content || undefined,
            url: measurementData.url,
            created_time: measurementData.created_time
          };
          
          return { success: true, data: { measurement } };
          
        case 'search':
          const searchData: any = {
            sorts: [
              { property: 'Date Taken', direction: 'descending' as const }
            ],
            page_size: limit
          };
          
          // Build filter
          const filters: any[] = [];
          
          if (client_id) {
            filters.push({
              property: 'Client',
              relation: { contains: client_id }
            });
          }
          
          if (search_query) {
            filters.push({
              property: 'Measurement Name',
              title: { contains: search_query }
            });
          }
          
          if (filters.length > 0) {
            searchData.filter = filters.length === 1 ? filters[0] : { and: filters };
          }
          
          const searchResponse = await fetch(`https://api.notion.com/v1/databases/${measurementsDbId}/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify(searchData)
          });
          
          if (!searchResponse.ok) {
            const error = await searchResponse.text();
            return { success: false, error: `Search failed: ${error}` };
          }
          
          const searchResults = await searchResponse.json();
          const measurements = searchResults.results.map((result: any) => ({
            id: result.id,
            measurement_name: result.properties['Measurement Name']?.title?.[0]?.text?.content || '',
            client_id: result.properties.Client?.relation?.[0]?.id || '',
            date_taken: result.properties['Date Taken']?.date?.start || undefined,
            chest: result.properties.Chest?.number || undefined,
            lt: result.properties.LT?.rich_text?.[0]?.text?.content || undefined,
            url: result.url
          }));
          
          return {
            success: true,
            data: {
              measurements,
              total: measurements.length,
              client_id,
              query: search_query
            }
          };
          
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
      
    } catch (error) {
      console.error('Measurement Manager Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
});