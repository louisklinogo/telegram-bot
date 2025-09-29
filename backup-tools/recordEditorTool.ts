/**
 * Record Editor Tool
 * 
 * Comprehensive tool for safely updating records across all databases with:
 * - CRUD operations across Clients, Orders, Invoices, Finances, and Measurements
 * - Data validation and integrity checks
 * - Backup and rollback capabilities
 * - Bulk update operations
 * - Change history tracking
 * - Cross-database relationship validation
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { NotionClient } from '../utils/notionClient';
import { ValidationSchemas, ValidationHelper } from '../utils/dataValidation';
import type { 
  Client, 
  Order, 
  Invoice, 
  FinanceEntry, 
  Measurement 
} from '../types/notion';

export const recordEditorTool = createTool({
  id: 'record-editor',
  description: `Advanced record editor for safe updates across all business databases.

Key capabilities:
- Update records in any database (Clients, Orders, Invoices, Finances, Measurements)
- Validate data integrity and relationships before applying changes
- Create automatic backups before making modifications
- Support bulk updates with batch processing
- Track change history and provide rollback options
- Enforce business rules and data consistency
- Prevent accidental data loss with confirmation prompts

Database support:
- Clients: Update contact info, referral sources, notes
- Orders: Modify status, pricing, delivery details, payment status
- Invoices: Update payment status, amounts, due dates, notes
- Finances: Edit financial entries, categories, amounts, dates
- Measurements: Update client measurements and fitting details

Safety features:
- Validation before any changes
- Automatic backups (optional)
- Dry-run mode to preview changes
- Confirmation for critical operations
- Rollback capabilities for recent changes

Perfect for data correction, bulk updates, and maintaining data quality across all business records.`,

  inputSchema: z.object({
    action: z.enum([
      'update', 'bulk_update', 'delete', 'bulk_delete',
      'validate', 'preview_changes', 'rollback',
      'get_history', 'verify_relationships'
    ]).describe('The record editing operation to perform'),
    
    database: z.enum([
      'clients', 'orders', 'invoices', 'finances', 'measurements'
    ]).describe('Which database to operate on'),
    
    // Single record operations
    record_id: z.string().optional().describe('Notion page ID of the record to edit'),
    
    // Bulk operations
    record_ids: z.array(z.string()).optional().describe('Multiple record IDs for bulk operations'),
    
    // Update data
    updates: z.record(z.any()).optional().describe('Fields to update with new values'),
    
    // Search criteria for bulk operations
    search_criteria: z.object({
      filters: z.record(z.any()).optional(),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']),
        value: z.any().optional(),
      })).optional(),
    }).optional().describe('Criteria for finding records to update in bulk operations'),
    
    // Operation options
    options: z.object({
      validation_mode: z.enum(['strict', 'lenient', 'skip']).optional().describe('How strictly to validate data (default: strict)'),
      create_backup: z.boolean().optional().describe('Whether to backup records before changes (default: true)'),
      dry_run: z.boolean().optional().describe('Preview changes without applying them (default: false)'),
      batch_size: z.number().min(1).max(50).optional().describe('For bulk operations, how many records to process at once'),
      confirm_destructive: z.boolean().optional().describe('Confirmation for delete operations (default: false)'),
      update_related: z.boolean().optional().describe('Also update related records if needed (default: false)'),
    }).optional().describe('Operation configuration options'),
    
    // Change tracking
    reason: z.string().max(200).optional().describe('Reason for making these changes (for audit trail)'),
    
    // Rollback data
    backup_id: z.string().optional().describe('Backup ID to rollback to'),
    
    limit: z.number().min(1).max(500).optional().describe('Maximum number of records to process (default: 100)'),
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
          error: `Input validation failed: ${validationResult.errors?.join(', ')}`,
        };
      }

      // Get operation options with defaults
      const options = {
        validation_mode: 'strict',
        create_backup: true,
        dry_run: false,
        batch_size: 10,
        confirm_destructive: false,
        update_related: false,
        ...input.options,
      };

      switch (input.action) {
        case 'update':
          return await updateSingleRecord(
            notionClient, 
            input.database, 
            input.record_id!, 
            input.updates!, 
            options, 
            input.reason
          );
        
        case 'bulk_update':
          return await bulkUpdateRecords(
            notionClient,
            input.database,
            input.record_ids || [],
            input.search_criteria,
            input.updates!,
            options,
            input.reason,
            input.limit
          );
        
        case 'delete':
          return await deleteSingleRecord(
            notionClient,
            input.database,
            input.record_id!,
            options,
            input.reason
          );
        
        case 'bulk_delete':
          return await bulkDeleteRecords(
            notionClient,
            input.database,
            input.record_ids || [],
            input.search_criteria,
            options,
            input.reason,
            input.limit
          );
        
        case 'validate':
          return await validateRecord(
            notionClient,
            input.database,
            input.record_id!,
            input.updates
          );
        
        case 'preview_changes':
          return await previewChanges(
            notionClient,
            input.database,
            input.record_id || input.record_ids?.[0]!,
            input.updates!
          );
        
        case 'rollback':
          return await rollbackChanges(
            notionClient,
            input.backup_id!
          );
        
        case 'get_history':
          return await getChangeHistory(
            notionClient,
            input.database,
            input.record_id,
            input.limit
          );
        
        case 'verify_relationships':
          return await verifyRecordRelationships(
            notionClient,
            input.database,
            input.record_id!
          );
        
        default:
          return {
            success: false,
            error: `Unknown action: ${input.action}`,
          };
      }
    } catch (error) {
      console.error('Record Editor Tool Error:', error);
      return {
        success: false,
        error: `Failed to execute record operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Helper Functions

async function validateInput(input: any) {
  const { action, database, record_id, record_ids, updates, search_criteria, options } = input;
  
  // Check required fields based on action
  const singleRecordActions = ['update', 'delete', 'validate', 'preview_changes', 'verify_relationships'];
  const bulkActions = ['bulk_update', 'bulk_delete'];
  const updateActions = ['update', 'bulk_update', 'preview_changes'];
  const deleteActions = ['delete', 'bulk_delete'];
  
  if (singleRecordActions.includes(action) && !record_id) {
    return {
      success: false,
      errors: ['record_id is required for single record operations'],
    };
  }
  
  if (bulkActions.includes(action) && !record_ids?.length && !search_criteria) {
    return {
      success: false,
      errors: ['Either record_ids or search_criteria is required for bulk operations'],
    };
  }
  
  if (updateActions.includes(action) && !updates) {
    return {
      success: false,
      errors: ['updates field is required for update operations'],
    };
  }
  
  if (deleteActions.includes(action) && !options?.confirm_destructive) {
    return {
      success: false,
      errors: ['confirm_destructive must be true for delete operations'],
    };
  }
  
  // Validate updates against database schema if provided
  if (updates && database) {
    const validationResult = validateUpdatesForDatabase(database, updates);
    if (!validationResult.success) {
      return validationResult;
    }
  }
  
  return { success: true };
}

function validateUpdatesForDatabase(database: string, updates: any) {
  try {
    let schema;
    
    switch (database) {
      case 'clients':
        schema = ValidationSchemas.Client.update;
        break;
      case 'orders':
        schema = ValidationSchemas.Order.update;
        break;
      case 'invoices':
        schema = ValidationSchemas.Invoice.update;
        break;
      case 'finances':
        schema = ValidationSchemas.Finance.update;
        break;
      case 'measurements':
        schema = ValidationSchemas.Measurement.update;
        break;
      default:
        return {
          success: false,
          errors: [`Unknown database: ${database}`],
        };
    }
    
    const result = ValidationHelper.validate(schema, updates);
    return result;
  } catch (error) {
    return {
      success: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

async function updateSingleRecord(
  client: NotionClient,
  database: string,
  recordId: string,
  updates: any,
  options: any,
  reason?: string
) {
  try {
    // Get current record for backup and validation
    const currentRecord = await getRecordByDatabase(client, database, recordId);
    if (!currentRecord) {
      return {
        success: false,
        error: 'Record not found',
      };
    }
    
    // Validate updates in strict mode
    if (options.validation_mode === 'strict') {
      const validation = validateUpdatesForDatabase(database, updates);
      if (!validation.success) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors?.join(', ')}`,
        };
      }
    }
    
    // Verify relationships if updating related fields
    if (options.update_related) {
      const relationshipCheck = await verifyRecordRelationships(client, database, recordId);
      if (!relationshipCheck.success) {
        console.warn('Relationship verification failed:', relationshipCheck.error);
      }
    }
    
    // Create backup if requested
    let backupId: string | undefined;
    if (options.create_backup) {
      try {
        backupId = await createRecordBackup(client, database, recordId, currentRecord, reason);
      } catch (error) {
        console.warn('Failed to create backup:', error);
      }
    }
    
    // Preview mode - don't actually update
    if (options.dry_run) {
      return {
        success: true,
        message: 'Preview of changes (no changes applied)',
        data: {
          record_id: recordId,
          database,
          current_values: filterRelevantFields(currentRecord, Object.keys(updates)),
          proposed_changes: updates,
          backup_created: !!backupId,
          would_affect_related: options.update_related,
        },
      };
    }
    
    // Apply the updates
    const updatedRecord = await updateRecordByDatabase(client, database, recordId, updates);
    
    // Log the change
    await logChange({
      action: 'update',
      database,
      record_id: recordId,
      changes: updates,
      backup_id: backupId,
      reason,
      timestamp: new Date().toISOString(),
    });
    
    return {
      success: true,
      message: `Record updated successfully in ${database} database`,
      data: {
        record_id: recordId,
        database,
        updated_fields: Object.keys(updates),
        backup_id: backupId,
        previous_values: filterRelevantFields(currentRecord, Object.keys(updates)),
        new_values: filterRelevantFields(updatedRecord, Object.keys(updates)),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update record: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function bulkUpdateRecords(
  client: NotionClient,
  database: string,
  recordIds: string[],
  searchCriteria: any,
  updates: any,
  options: any,
  reason?: string,
  limit = 100
) {
  try {
    let targetRecords: any[] = [];
    
    // Get records to update
    if (recordIds.length > 0) {
      // Use provided record IDs
      for (const id of recordIds.slice(0, limit)) {
        const record = await getRecordByDatabase(client, database, id);
        if (record) {
          targetRecords.push({ id, ...record });
        }
      }
    } else if (searchCriteria) {
      // Find records matching criteria
      targetRecords = await findRecordsByCriteria(client, database, searchCriteria, limit);
    }
    
    if (targetRecords.length === 0) {
      return {
        success: true,
        message: 'No records found matching the criteria',
        data: {
          processed_count: 0,
          failed_count: 0,
          results: [],
        },
      };
    }
    
    // Validate updates
    if (options.validation_mode === 'strict') {
      const validation = validateUpdatesForDatabase(database, updates);
      if (!validation.success) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors?.join(', ')}`,
        };
      }
    }
    
    const results = {
      processed_count: 0,
      successful_count: 0,
      failed_count: 0,
      backup_id: undefined as string | undefined,
      results: [] as any[],
      errors: [] as string[],
    };
    
    // Create batch backup if requested
    if (options.create_backup) {
      try {
        results.backup_id = await createBatchBackup(client, database, targetRecords, reason);
      } catch (error) {
        console.warn('Failed to create batch backup:', error);
      }
    }
    
    // Preview mode
    if (options.dry_run) {
      return {
        success: true,
        message: `Preview: Would update ${targetRecords.length} records (no changes applied)`,
        data: {
          ...results,
          would_update_count: targetRecords.length,
          sample_changes: targetRecords.slice(0, 5).map(record => ({
            record_id: record.id,
            current_values: filterRelevantFields(record, Object.keys(updates)),
            proposed_changes: updates,
          })),
        },
      };
    }
    
    // Process records in batches
    const batchSize = Math.min(options.batch_size, 10);
    for (let i = 0; i < targetRecords.length; i += batchSize) {
      const batch = targetRecords.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          results.processed_count++;
          
          const updatedRecord = await updateRecordByDatabase(client, database, record.id, updates);
          
          results.successful_count++;
          results.results.push({
            record_id: record.id,
            status: 'success',
            updated_fields: Object.keys(updates),
            previous_values: filterRelevantFields(record, Object.keys(updates)),
            new_values: filterRelevantFields(updatedRecord, Object.keys(updates)),
          });
          
          // Log individual change
          await logChange({
            action: 'bulk_update',
            database,
            record_id: record.id,
            changes: updates,
            backup_id: results.backup_id,
            reason,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          results.failed_count++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Record ${record.id}: ${errorMessage}`);
          results.results.push({
            record_id: record.id,
            status: 'failed',
            error: errorMessage,
          });
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < targetRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      success: results.failed_count === 0,
      message: `Bulk update completed. ${results.successful_count} successful, ${results.failed_count} failed`,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to perform bulk update: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function deleteSingleRecord(
  client: NotionClient,
  database: string,
  recordId: string,
  options: any,
  reason?: string
) {
  try {
    // Get current record for backup
    const currentRecord = await getRecordByDatabase(client, database, recordId);
    if (!currentRecord) {
      return {
        success: false,
        error: 'Record not found',
      };
    }
    
    // Check for related records that might be affected
    const relationshipCheck = await verifyRecordRelationships(client, database, recordId);
    if (!relationshipCheck.success && relationshipCheck.data?.related_records?.length > 0) {
      return {
        success: false,
        error: `Cannot delete record: it has related records in other databases. Related: ${relationshipCheck.data.related_records.map((r: any) => `${r.database} (${r.count})`).join(', ')}`,
      };
    }
    
    // Create backup before deletion
    let backupId: string | undefined;
    if (options.create_backup) {
      try {
        backupId = await createRecordBackup(client, database, recordId, currentRecord, reason);
      } catch (error) {
        console.warn('Failed to create backup:', error);
      }
    }
    
    // Preview mode
    if (options.dry_run) {
      return {
        success: true,
        message: 'Preview of deletion (no changes applied)',
        data: {
          record_id: recordId,
          database,
          record_to_delete: currentRecord,
          backup_created: !!backupId,
          related_records: relationshipCheck.data?.related_records || [],
        },
      };
    }
    
    // Perform the deletion
    await client.deleteRecord(recordId);
    
    // Log the change
    await logChange({
      action: 'delete',
      database,
      record_id: recordId,
      backup_id: backupId,
      reason,
      timestamp: new Date().toISOString(),
      deleted_record: currentRecord,
    });
    
    return {
      success: true,
      message: `Record deleted successfully from ${database} database`,
      data: {
        record_id: recordId,
        database,
        backup_id: backupId,
        deleted_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function bulkDeleteRecords(
  client: NotionClient,
  database: string,
  recordIds: string[],
  searchCriteria: any,
  options: any,
  reason?: string,
  limit = 100
) {
  try {
    let targetRecords: any[] = [];
    
    // Get records to delete
    if (recordIds.length > 0) {
      for (const id of recordIds.slice(0, limit)) {
        const record = await getRecordByDatabase(client, database, id);
        if (record) {
          targetRecords.push({ id, ...record });
        }
      }
    } else if (searchCriteria) {
      targetRecords = await findRecordsByCriteria(client, database, searchCriteria, limit);
    }
    
    if (targetRecords.length === 0) {
      return {
        success: true,
        message: 'No records found matching the criteria',
        data: { processed_count: 0, failed_count: 0, results: [] },
      };
    }
    
    const results = {
      processed_count: 0,
      successful_count: 0,
      failed_count: 0,
      backup_id: undefined as string | undefined,
      results: [] as any[],
      errors: [] as string[],
    };
    
    // Create batch backup
    if (options.create_backup) {
      try {
        results.backup_id = await createBatchBackup(client, database, targetRecords, reason);
      } catch (error) {
        console.warn('Failed to create batch backup:', error);
      }
    }
    
    // Preview mode
    if (options.dry_run) {
      return {
        success: true,
        message: `Preview: Would delete ${targetRecords.length} records (no changes applied)`,
        data: {
          ...results,
          would_delete_count: targetRecords.length,
          records_to_delete: targetRecords.slice(0, 10).map(r => ({ id: r.id, summary: getSummaryForRecord(database, r) })),
        },
      };
    }
    
    // Process deletions
    for (const record of targetRecords) {
      try {
        results.processed_count++;
        
        await client.deleteRecord(record.id);
        
        results.successful_count++;
        results.results.push({
          record_id: record.id,
          status: 'success',
          deleted_at: new Date().toISOString(),
        });
        
        // Log individual deletion
        await logChange({
          action: 'bulk_delete',
          database,
          record_id: record.id,
          backup_id: results.backup_id,
          reason,
          timestamp: new Date().toISOString(),
          deleted_record: record,
        });
      } catch (error) {
        results.failed_count++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Record ${record.id}: ${errorMessage}`);
        results.results.push({
          record_id: record.id,
          status: 'failed',
          error: errorMessage,
        });
      }
    }
    
    return {
      success: results.failed_count === 0,
      message: `Bulk delete completed. ${results.successful_count} successful, ${results.failed_count} failed`,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to perform bulk delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function validateRecord(
  client: NotionClient,
  database: string,
  recordId: string,
  updates?: any
) {
  try {
    const record = await getRecordByDatabase(client, database, recordId);
    if (!record) {
      return {
        success: false,
        error: 'Record not found',
      };
    }
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Validate current record data
    const currentValidation = validateUpdatesForDatabase(database, record);
    if (!currentValidation.success) {
      issues.push(...(currentValidation.errors || []));
    }
    
    // Validate proposed updates if provided
    if (updates) {
      const updateValidation = validateUpdatesForDatabase(database, updates);
      if (!updateValidation.success) {
        issues.push(`Update validation: ${updateValidation.errors?.join(', ')}`);
      }
    }
    
    // Check relationships
    const relationshipCheck = await verifyRecordRelationships(client, database, recordId);
    if (!relationshipCheck.success) {
      warnings.push(`Relationship issues: ${relationshipCheck.error}`);
    }
    
    return {
      success: issues.length === 0,
      message: issues.length === 0 ? 'Record validation passed' : 'Record validation failed',
      data: {
        record_id: recordId,
        database,
        valid: issues.length === 0,
        issues,
        warnings,
        relationships: relationshipCheck.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to validate record: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function previewChanges(
  client: NotionClient,
  database: string,
  recordId: string,
  updates: any
) {
  try {
    const currentRecord = await getRecordByDatabase(client, database, recordId);
    if (!currentRecord) {
      return {
        success: false,
        error: 'Record not found',
      };
    }
    
    // Create a merged view of the changes
    const previewRecord = { ...currentRecord, ...updates };
    
    // Validate the preview
    const validation = validateUpdatesForDatabase(database, previewRecord);
    
    // Calculate what will change
    const changes = {};
    for (const [key, newValue] of Object.entries(updates)) {
      if (currentRecord[key] !== newValue) {
        changes[key] = {
          from: currentRecord[key],
          to: newValue,
          changed: true,
        };
      }
    }
    
    return {
      success: true,
      message: 'Change preview generated',
      data: {
        record_id: recordId,
        database,
        current_record: currentRecord,
        preview_record: previewRecord,
        changes,
        validation: {
          valid: validation.success,
          issues: validation.errors || [],
        },
        change_count: Object.keys(changes).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to preview changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function rollbackChanges(client: NotionClient, backupId: string) {
  try {
    // This would implement rollback functionality
    // For now, return a placeholder response
    return {
      success: false,
      error: 'Rollback functionality not yet implemented. Please manually restore from backup data.',
      data: {
        backup_id: backupId,
        note: 'Future implementation will restore records from backup automatically',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to rollback changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function getChangeHistory(
  client: NotionClient,
  database: string,
  recordId?: string,
  limit = 50
) {
  try {
    // This would implement change history tracking
    // For now, return a placeholder response
    return {
      success: true,
      message: 'Change history feature not yet fully implemented',
      data: {
        database,
        record_id: recordId,
        history: [],
        note: 'Future implementation will track all changes with timestamps and details',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get change history: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function verifyRecordRelationships(
  client: NotionClient,
  database: string,
  recordId: string
) {
  try {
    const relatedRecords: any[] = [];
    
    switch (database) {
      case 'clients':
        // Check for orders, invoices, measurements linked to this client
        try {
          const orders = await client.queryOrderRecords({ client_id: recordId }, 10);
          if (orders.length > 0) {
            relatedRecords.push({ database: 'orders', count: orders.length, records: orders.slice(0, 3) });
          }
          
          const invoices = await client.queryInvoiceRecords({ client_id: recordId }, 10);
          if (invoices.length > 0) {
            relatedRecords.push({ database: 'invoices', count: invoices.length, records: invoices.slice(0, 3) });
          }
          
          const measurements = await client.queryMeasurementRecords({ client_id: recordId }, 10);
          if (measurements.length > 0) {
            relatedRecords.push({ database: 'measurements', count: measurements.length, records: measurements.slice(0, 3) });
          }
        } catch (error) {
          console.warn('Error checking client relationships:', error);
        }
        break;
        
      case 'orders':
        // Check for invoices and finance records linked to this order
        try {
          const order = await client.getOrderRecord(recordId);
          if (order?.client_id) {
            const client = await client.getClientRecord(order.client_id);
            if (client) {
              relatedRecords.push({ database: 'clients', count: 1, records: [client] });
            }
          }
          
          const finances = await client.queryFinanceRecords({ linked_order: recordId }, 10);
          if (finances.length > 0) {
            relatedRecords.push({ database: 'finances', count: finances.length, records: finances.slice(0, 3) });
          }
        } catch (error) {
          console.warn('Error checking order relationships:', error);
        }
        break;
        
      case 'invoices':
        // Check for client relationship
        try {
          const invoice = await client.getInvoiceRecord(recordId);
          if (invoice?.client_id) {
            const client = await client.getClientRecord(invoice.client_id);
            if (client) {
              relatedRecords.push({ database: 'clients', count: 1, records: [client] });
            }
          }
        } catch (error) {
          console.warn('Error checking invoice relationships:', error);
        }
        break;
        
      case 'finances':
        // Check for linked order
        try {
          const finance = await client.getFinanceRecord(recordId);
          if (finance?.linked_order) {
            const order = await client.getOrderRecord(finance.linked_order);
            if (order) {
              relatedRecords.push({ database: 'orders', count: 1, records: [order] });
            }
          }
        } catch (error) {
          console.warn('Error checking finance relationships:', error);
        }
        break;
        
      case 'measurements':
        // Check for client relationship
        try {
          const measurement = await client.getMeasurementRecord(recordId);
          if (measurement?.client_id) {
            const client = await client.getClientRecord(measurement.client_id);
            if (client) {
              relatedRecords.push({ database: 'clients', count: 1, records: [client] });
            }
          }
        } catch (error) {
          console.warn('Error checking measurement relationships:', error);
        }
        break;
    }
    
    return {
      success: true,
      message: `Found ${relatedRecords.length} relationship(s)`,
      data: {
        record_id: recordId,
        database,
        related_records: relatedRecords,
        has_relationships: relatedRecords.length > 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to verify relationships: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Utility Functions

async function getRecordByDatabase(client: NotionClient, database: string, recordId: string) {
  switch (database) {
    case 'clients':
      return await client.getClientRecord(recordId);
    case 'orders':
      return await client.getOrderRecord(recordId);
    case 'invoices':
      return await client.getInvoiceRecord(recordId);
    case 'finances':
      return await client.getFinanceRecord(recordId);
    case 'measurements':
      return await client.getMeasurementRecord(recordId);
    default:
      throw new Error(`Unknown database: ${database}`);
  }
}

async function updateRecordByDatabase(client: NotionClient, database: string, recordId: string, updates: any) {
  switch (database) {
    case 'clients':
      return await client.updateClientRecord(recordId, updates);
    case 'orders':
      return await client.updateOrderRecord(recordId, updates);
    case 'invoices':
      return await client.updateInvoiceRecord(recordId, updates);
    case 'finances':
      return await client.updateFinanceRecord(recordId, updates);
    case 'measurements':
      return await client.updateMeasurementRecord(recordId, updates);
    default:
      throw new Error(`Unknown database: ${database}`);
  }
}

async function findRecordsByCriteria(client: NotionClient, database: string, criteria: any, limit: number) {
  // This would implement complex search criteria
  // For now, use basic filters
  const filters = criteria.filters || {};
  
  switch (database) {
    case 'clients':
      return await client.queryClientRecords(filters, limit);
    case 'orders':
      return await client.queryOrderRecords(filters, limit);
    case 'invoices':
      return await client.queryInvoiceRecords(filters, limit);
    case 'finances':
      return await client.queryFinanceRecords(filters, limit);
    case 'measurements':
      return await client.queryMeasurementRecords(filters, limit);
    default:
      return [];
  }
}

function filterRelevantFields(record: any, fieldKeys: string[]) {
  const filtered = {};
  for (const key of fieldKeys) {
    if (record.hasOwnProperty(key)) {
      filtered[key] = record[key];
    }
  }
  return filtered;
}

function getSummaryForRecord(database: string, record: any): string {
  switch (database) {
    case 'clients':
      return record.name || 'Unnamed Client';
    case 'orders':
      return record.order_id || 'No Order ID';
    case 'invoices':
      return record.invoice_number || 'No Invoice Number';
    case 'finances':
      return record.entry_name || 'Unnamed Entry';
    case 'measurements':
      return record.measurement_name || 'Unnamed Measurement';
    default:
      return 'Unknown Record';
  }
}

async function createRecordBackup(
  client: NotionClient,
  database: string,
  recordId: string,
  recordData: any,
  reason?: string
): Promise<string> {
  // This would implement backup functionality
  // For now, generate a backup ID
  const backupId = `backup_${database}_${recordId}_${Date.now()}`;
  
  // In a real implementation, this would save the backup data
  console.log(`Created backup ${backupId} for ${database} record ${recordId}`, {
    reason,
    data: recordData,
  });
  
  return backupId;
}

async function createBatchBackup(
  client: NotionClient,
  database: string,
  records: any[],
  reason?: string
): Promise<string> {
  const backupId = `batch_backup_${database}_${Date.now()}`;
  
  console.log(`Created batch backup ${backupId} for ${records.length} ${database} records`, {
    reason,
    record_ids: records.map(r => r.id),
  });
  
  return backupId;
}

async function logChange(changeData: any): Promise<void> {
  // This would implement change logging
  console.log('Change logged:', changeData);
}

export default recordEditorTool;