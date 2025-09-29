import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Agent as HttpsAgent } from 'https';
// Basic measurement validation functions (simplified)
interface MeasurementValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  measurements: Record<string, string>;
}

const validateCustomerMeasurements = (measurements: Record<string, string>): MeasurementValidationResult => {
  const result: MeasurementValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    measurements
  };
  
  // Basic validation - check if we have some measurements
  if (!measurements || Object.keys(measurements).length === 0) {
    result.isValid = false;
    result.errors.push('No measurements provided');
  }
  
  return result;
};

const formatMeasurementsForNotion = (validated: MeasurementValidationResult): Record<string, string> => {
  const formatted: Record<string, string> = {};
  
  // Map common abbreviations to full names
  const fieldMap: Record<string, string> = {
    'CH': 'Chest',
    'ST': 'Stomach', 
    'SL': 'Sleeve Length',
    'SH': 'Shoulder',
    'LT': 'Length',
    'RD': 'Round',
    'WS': 'Waist'
  };
  
  for (const [key, value] of Object.entries(validated.measurements)) {
    const notionField = fieldMap[key.toUpperCase()] || key;
    formatted[notionField] = value;
  }
  
  return formatted;
};

const getValidationSummary = (validated: MeasurementValidationResult): string => {
  if (validated.isValid) {
    return `✅ Measurements validated successfully (${Object.keys(validated.measurements).length} measurements)`;
  } else {
    return `❌ Validation failed: ${validated.errors.join(', ')}`;
  }
};

// Create a persistent HTTPS agent for Notion API connections
const notionAgent = new HttpsAgent({
  keepAlive: true,
  maxSockets: 5,
  maxFreeSockets: 2,
  timeout: 30000,
});

export const notionMeasurementsTool = createTool({
  id: 'notion-measurements-tool',
  description: 'Create and manage measurements in Notion database',
  inputSchema: z.object({
    customer_name: z.string().describe('Customer name'),
    measurements: z.record(z.string(), z.string()).describe('Raw measurement data with abbreviations as keys (e.g., {"CH": "39", "LT": "27/31", "RD": "13/15"})'),
    notes: z.string().optional().describe('Measurement notes'),
    validate_only: z.boolean().optional().describe('If true, only validate measurements without saving to Notion'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    measurement_id: z.string().optional(),
    measurement_page_id: z.string().optional(),
    measurement_url: z.string().optional(),
    client_name: z.string().optional(),
    measurements: z.record(z.string(), z.string()).optional(),
    created_at: z.string().optional(),
    validation_summary: z.string().optional(),
    validation_errors: z.array(z.string()).optional(),
    validation_warnings: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }, options) => {
    const { customer_name, measurements, notes, validate_only = false } = context;

    try {
      // First, validate the measurements
      const validated = validateCustomerMeasurements(measurements);
      const validationSummary = getValidationSummary(validated);
      
      console.log('Measurement validation results:', validationSummary);
      
      // If validation only mode, return validation results
      if (validate_only) {
        return {
          success: validated.isValid,
          client_name: customer_name,
          validation_summary: validationSummary,
          validation_errors: validated.errors,
          validation_warnings: validated.warnings,
        };
      }
      
      // If measurements are not valid, return error with validation details
      if (!validated.isValid) {
        return {
          success: false,
          error: `Measurement validation failed: ${validated.errors.join('; ')}`,
          validation_summary: validationSummary,
          validation_errors: validated.errors,
          validation_warnings: validated.warnings,
        };
      }

      // Get Notion API key from environment
      const notionApiKey = process.env.NOTION_API_KEY;
      const measurementsDbId = process.env.NOTION_MEASUREMENTS_DB_ID;
      const clientsDbId = process.env.NOTION_CLIENTS_DB_ID;

      if (!notionApiKey || !measurementsDbId || !clientsDbId) {
        throw new Error('Notion API key or database IDs not configured');
      }

      // First, find or create the client
      const clientPage = await findOrCreateClient(notionApiKey, clientsDbId, customer_name);

      if (!clientPage) {
        throw new Error('Failed to find or create client');
      }

      // Generate measurement name
      const measurementName = `${customer_name} - ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}`;

      // Prepare properties for Notion
      const properties: any = {
        'Measurement Name': {
          title: [
            {
              text: {
                content: measurementName,
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
        'Date Taken': {
          date: {
            start: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          },
        },
      };

      // Map validated measurements to Notion properties
      const notionMeasurements = formatMeasurementsForNotion(validated);
      
      for (const [notionField, value] of Object.entries(notionMeasurements)) {
        properties[notionField] = {
          rich_text: [
            {
              text: {
                content: value,
              },
            },
          ],
        };
      }

      // Add notes if provided
      if (notes) {
        properties['Notes'] = {
          rich_text: [
            {
              text: {
                content: notes,
              },
            },
          ],
        };
      }

      // Create measurement page in Notion
      const measurementData = {
        parent: {
          type: 'database_id',
          database_id: measurementsDbId,
        },
        properties,
      };

      // Create measurement page in Notion with retry logic
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
            body: JSON.stringify(measurementData),
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
        throw new Error(`Failed to create measurement: ${statusCode} - ${errorText}`);
      }

      const measurementPage = await response.json();

      console.log(`Measurement created: ${measurementPage.id}`);

      // Return success response with validation
      const result = {
        success: true,
        measurement_id: measurementName,
        measurement_page_id: measurementPage.id,
        measurement_url: measurementPage.url,
        client_name: customer_name,
        measurements: notionMeasurements,
        created_at: new Date().toISOString(),
        validation_summary: validationSummary,
        validation_errors: validated.errors,
        validation_warnings: validated.warnings,
      };

      // Validate result
      const outputSchema = z.object({
        success: z.boolean(),
        measurement_id: z.string().optional(),
        measurement_page_id: z.string().optional(),
        measurement_url: z.string().optional(),
        client_name: z.string().optional(),
        measurements: z.record(z.string(), z.string()).optional(),
        created_at: z.string().optional(),
        validation_summary: z.string().optional(),
        validation_errors: z.array(z.string()).optional(),
        validation_warnings: z.array(z.string()).optional(),
        error: z.string().optional(),
      });

      const validationResult = outputSchema.safeParse(result);
      if (!validationResult.success) {
        console.error('Tool result validation failed:', validationResult.error);
        throw new Error('Internal tool validation error');
      }

      return result;

    } catch (error) {
      console.error('Error creating measurement in Notion:', error);

      // Return error response with validation
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      const outputSchema = z.object({
        success: z.boolean(),
        measurement_id: z.string().optional(),
        measurement_page_id: z.string().optional(),
        measurement_url: z.string().optional(),
        client_name: z.string().optional(),
        measurements: z.record(z.string(), z.string()).optional(),
        created_at: z.string().optional(),
        validation_summary: z.string().optional(),
        validation_errors: z.array(z.string()).optional(),
        validation_warnings: z.array(z.string()).optional(),
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

// Helper function to find or create a client (reused from orders tool)
async function findOrCreateClient(
  notionApiKey: string,
  clientsDbId: string,
  customerName: string
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

// Helper function to parse measurement text messages using our validation system
export const parseMeasurementText = (text: string) => {
  try {
    const parsed = parseMeasurementText(text);
    return {
      customer_name: parsed.customerName || '',
      measurements: parsed.measurements,
    };
  } catch (error) {
    console.error('Error parsing measurement text:', error);
    return {
      customer_name: '',
      measurements: {},
    };
  }
};

// Export validation functions for use in other parts of the application
export {
  parseMeasurementMessage,
  validateCustomerMeasurements,
  formatMeasurementsForNotion,
  getValidationSummary,
  getMeasurementValidationInstructions
// Simple measurement text parser
const parseMeasurementText = (text: string): Record<string, string> => {
  const measurements: Record<string, string> = {};
  const parts = text.split(/\s+/);
  
  for (let i = 0; i < parts.length - 1; i += 2) {
    const key = parts[i]?.toUpperCase();
    const value = parts[i + 1];
    if (key && value) {
      measurements[key] = value;
    }
  }
  
  return measurements;
};
