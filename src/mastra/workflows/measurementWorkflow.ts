import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
// Old type imports removed - now using Zod schemas directly
import { notionMeasurementManager } from '../tools/notionMeasurementManager';
import { sendSuccessMessage, sendErrorMessage } from '../tools/grammyHandler';

// Input schema for the workflow
export const MeasurementWorkflowInputSchema = z.object({
  chat_id: z.number(),
  customer_name: z.string(),
  measurements: z.record(z.string(), z.string()),
  notes: z.string().optional(),
});

// Output schema for the workflow
export const MeasurementWorkflowOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  measurement_id: z.string().optional(),
  notion_url: z.string().optional(),
});

// Step 1: Validate Measurement Data
const validateMeasurementsStep = createStep({
  id: 'validate-measurements',
  description: 'Validate measurement data before processing',
  inputSchema: MeasurementWorkflowInputSchema,
  outputSchema: z.object({
    status: z.enum(['success', 'error']),
    validated_data: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    try {
      console.log('Validating measurements for:', inputData.customer_name);

      // Validate required fields
      if (!inputData.customer_name || !inputData.measurements || Object.keys(inputData.measurements).length === 0) {
        return {
          status: 'error' as const,
          error: 'Customer name and measurements are required',
        };
      }

      // Validate measurement values
      const invalidMeasurements = Object.entries(inputData.measurements).filter(([key, value]) => {
        return !value || isNaN(parseFloat(value.toString()));
      });

      if (invalidMeasurements.length > 0) {
        return {
          status: 'error' as const,
          error: `Invalid measurement values: ${invalidMeasurements.map(([key]) => key).join(', ')}`,
        };
      }

      console.log('Measurements validated successfully');
      return {
        status: 'success' as const,
        validated_data: inputData,
      };
    } catch (error) {
      console.error('Error in validateMeasurementsStep:', error);
      return {
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  },
});

// Step 2: Create Measurement in Notion
const createNotionMeasurementStep = createStep({
  id: 'create-notion-measurement',
  description: 'Create measurement entry in Notion database',
  inputSchema: z.object({
    chat_id: z.number(),
    validated_data: z.any(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    measurement_data: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      const { chat_id, validated_data } = inputData;

      console.log('Creating Notion measurement for:', validated_data.customer_name);

      const result = await notionMeasurementManager.execute({
        context: validated_data,
        runtimeContext,
        suspend: async () => {},
      });

      if (result.success) {
        console.log('Notion measurement created successfully:', result.measurement_id);
        return {
          success: true,
          measurement_data: result,
        };
      } else {
        console.error('Notion measurement creation failed:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to create Notion measurement',
        };
      }
    } catch (error) {
      console.error('Error in createNotionMeasurementStep:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// Step 3: Format and Display Measurements
const formatMeasurementsStep = createStep({
  id: 'format-measurements',
  description: 'Format measurements for user display',
  inputSchema: z.object({
    measurements: z.record(z.string(), z.string()),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    formatted_measurements: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      const { measurements } = inputData;

      // Map internal keys to display names
      const displayNames: Record<string, string> = {
        'chest_ch': 'Chest',
        'shoulder_sh': 'Shoulder',
        'sleeve_length_sl': 'Sleeve Length',
        'top_length_lt': 'Top Length',
        'waist_wt': 'Waist',
        'hip_hp': 'Hip',
        'lap_lp': 'Lap',
        'trouser_length_lt': 'Trouser Length',
        'bicep_round_rd': 'Bicep Round',
        'ankle_round_rd': 'Ankle Round',
        'calf_cf': 'Calf',
        'neck_nk': 'Neck',
        'stomach_st': 'Stomach',
      };

      const formattedLines = Object.entries(measurements)
        .map(([key, value]) => {
          const displayName = displayNames[key] || key.replace(/_/g, ' ').toUpperCase();
          return `${displayName}: ${value}`;
        })
        .sort();

      return {
        success: true,
        formatted_measurements: formattedLines.join('\n'),
      };
    } catch (error) {
      console.error('Error in formatMeasurementsStep:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Formatting failed',
      };
    }
  },
});

// Step 4: Send Confirmation Message
const sendMeasurementConfirmationStep = createStep({
  id: 'send-measurement-confirmation',
  description: 'Send measurement confirmation message to user',
  inputSchema: z.object({
    chat_id: z.number(),
    customer_name: z.string(),
    measurement_data: z.any(),
    formatted_measurements: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      const { chat_id, customer_name, measurement_data, formatted_measurements } = inputData;

      const confirmationMessage = `
📏 *Measurements Recorded Successfully!*

*Customer:* ${customer_name}
*Measurement ID:* ${measurement_data?.measurement_id || 'N/A'}

📋 *Measurements:*
${formatted_measurements}

📅 *Date:* ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}

Your measurements have been saved to our system and will be used for your custom clothing orders.

Thank you for choosing Cimantikós Clothing Company! 🧵
      `;

      await sendSuccessMessage(chat_id, confirmationMessage);

      return {
        success: true,
        message: 'Measurement confirmation sent successfully',
      };
    } catch (error) {
      console.error('Error in sendMeasurementConfirmationStep:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send confirmation',
      };
    }
  },
});

// Step 5: Handle Measurement Errors
const handleMeasurementErrorsStep = createStep({
  id: 'handle-measurement-errors',
  description: 'Handle measurement workflow errors',
  inputSchema: z.object({
    chat_id: z.number(),
    error: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      const { chat_id, error } = inputData;

      await sendErrorMessage(chat_id, `Sorry, there was an error recording your measurements: ${error}`);

      return {
        success: false,
        message: 'Measurement error handled and message sent',
      };
    } catch (error) {
      console.error('Error in handleMeasurementErrorsStep:', error);
      return {
        success: false,
        message: 'Failed to handle measurement errors',
      };
    }
  },
});

// Create the workflow
export const measurementWorkflow = createWorkflow({
  id: 'measurement-processing-workflow',
  description: 'Complete measurement processing workflow from request to confirmation',
  inputSchema: MeasurementWorkflowInputSchema,
  outputSchema: MeasurementWorkflowOutputSchema,
  retryConfig: {
    attempts: 3,
    delay: 1500
  }
})
  .then(validateMeasurementsStep)
  .map(async ({ getStepResult, getInitData }) => {
    const validationResult = getStepResult(validateMeasurementsStep);
    const initData = getInitData();
    
    if (validationResult.status === 'error') {
      throw new Error(validationResult.error || 'Measurement validation failed');
    }
    
    return {
      chat_id: initData.chat_id,
      validated_data: validationResult.validated_data,
    };
  })
  .then(createNotionMeasurementStep)
  .map(async ({ getStepResult, inputData }) => {
    const notionResult = getStepResult(createNotionMeasurementStep);
    const validationResult = getStepResult(validateMeasurementsStep);
    
    if (!notionResult.success) {
      throw new Error(notionResult.error || 'Failed to create Notion measurement');
    }
    
    return {
      measurements: validationResult.validated_data.measurements,
    };
  })
  .then(formatMeasurementsStep)
  .map(async ({ getStepResult, getInitData }) => {
    const formatResult = getStepResult(formatMeasurementsStep);
    const validationResult = getStepResult(validateMeasurementsStep);
    const notionResult = getStepResult(createNotionMeasurementStep);
    const initData = getInitData();
    
    if (!formatResult.success) {
      throw new Error(formatResult.error || 'Formatting failed');
    }
    
    return {
      chat_id: initData.chat_id,
      customer_name: validationResult.validated_data.customer_name,
      measurement_data: notionResult.measurement_data,
      formatted_measurements: formatResult.formatted_measurements,
    };
  })
  .then(sendMeasurementConfirmationStep)
  .map(async ({ getStepResult }) => {
    const confirmationResult = getStepResult(sendMeasurementConfirmationStep);
    const notionResult = getStepResult(createNotionMeasurementStep);
    
    if (!confirmationResult.success) {
      throw new Error(confirmationResult.message || 'Confirmation failed');
    }
    
    return {
      success: true,
      message: 'Measurement workflow completed successfully',
      measurement_id: notionResult.measurement_data?.measurement_id,
      notion_url: notionResult.measurement_data?.notion_url,
    };
  })
  .commit();
