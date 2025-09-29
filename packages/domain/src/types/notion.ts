/**
 * TypeScript interfaces for Notion database schemas
 * Provides type safety across all business tools
 */

// Base interfaces for common Notion properties
export interface NotionProperty {
  id: string;
  type: string;
}

export interface NotionPage {
  id: string;
  url: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
}

// Client Database Schema - matches actual Notion database
export interface Client {
  id: string;
  name: string; // Title field "Name"
  phone?: string; // Phone Number field "Phone"
  email?: string; // Email field "Email"
  address?: string; // Rich Text field "Address"
  date?: string; // Date field "Date" (registration date)
  created_time: string;
  url: string;
}

// Orders Database Schema - matches actual Notion database
export interface Order {
  id: string;
  order_name: string; // Title field "Order Name"
  client: {
    id: string;
    name: string;
  }; // Relation to Clients
  items: string[]; // Multi-select field "Items" (Shirt, Trouser, Suit, etc.)
  total_price: number; // Number field "Total Price"
  amount_paid: number; // Number field "Amount Paid"
  balance: number; // Formula field "Balance" (calculated)
  status: string; // Select field "Status"
  date: string; // Date field "Date"
  created_time: string;
  url: string;
}

// Invoices Database Schema - matches actual Notion database
export interface Invoice {
  id: string;
  invoice_number: string; // Title field "Invoice Number"
  client: {
    id: string;
    name: string;
  }; // Relation to Clients
  order: {
    id: string;
    name: string;
  }; // Relation to Orders
  amount: number; // Number field "Amount"
  date: string; // Date field "Date"
  status: string; // Select field "Status"
  created_time: string;
  url: string;
}

// Note: Finance tracking can be added later if needed
// Focus on core business: Clients, Orders, Measurements, Invoices

// Measurements Database Schema - matches actual Notion database
export interface Measurement {
  id: string;
  measurement_name: string; // Title field "Measurement Name"
  client: {
    id: string;
    name: string;
  }; // Relation to Clients
  date_taken: string; // Date field "Date Taken"
  chest?: number; // Number field "Chest"
  shoulder?: number; // Number field "Shoulder"
  sleeves?: number; // Number field "Sleeves"
  neck?: number; // Number field "Neck"
  waist?: number; // Number field "Waist"
  lap?: number; // Number field "Lap"
  stomach?: number; // Number field "Stomach" (optional)
  hip?: number; // Number field "Hip" (when applicable)
  rd?: string; // Text field "RD" - Bicep Round measurement
  rd2?: string; // Text field "RD 2" - Additional bicep measurement
  lt?: string; // Text field "LT" - Top length (supports dual entries like "31/37")
  lt2?: string; // Text field "LT 2" - Trouser length (single value only)
  created_time: string;
  url: string;
}

// API Response Types
export interface NotionApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  has_more?: boolean;
  next_cursor?: string;
}

export interface NotionQueryOptions {
  filter?: any;
  sorts?: Array<{
    property: string;
    direction: 'ascending' | 'descending';
  }>;
  start_cursor?: string;
  page_size?: number;
}

export interface NotionDatabaseQueryResult<T> {
  results: T[];
  has_more: boolean;
  next_cursor?: string;
  total_count?: number;
}

// CRUD Operation Types
export interface CreateRecordOptions<T> {
  database_id: string;
  properties: Partial<T>;
}

export interface UpdateRecordOptions<T> {
  page_id: string;
  properties: Partial<T>;
}

export interface DeleteRecordOptions {
  page_id: string;
}

export interface QueryRecordsOptions {
  database_id: string;
  filter?: any;
  sorts?: any[];
  page_size?: number;
  start_cursor?: string;
}

// Database Configuration
export interface NotionDatabaseConfig {
  clients_db_id: string;
  orders_db_id: string;
  invoices_db_id: string;
  finances_db_id: string;
  measurements_db_id: string;
}

// Error Types
export interface NotionError {
  object: 'error';
  status: number;
  code: string;
  message: string;
  developer_survey?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  validation_errors?: ValidationError[];
}
