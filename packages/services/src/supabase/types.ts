export type SupabaseTimestamp = string;

export interface ClientRecord {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  referral_source?: string | null;
  notes?: string | null;
  created_at: SupabaseTimestamp;
  updated_at: SupabaseTimestamp;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at: SupabaseTimestamp;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  client_id: string;
  status: string;
  total_price: number;
  notes?: string | null;
  invoice_file_url?: string | null;
  created_at: SupabaseTimestamp;
  updated_at: SupabaseTimestamp;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  order_id: string;
  amount: number;
  status: string;
  pdf_url?: string | null;
  issued_at: SupabaseTimestamp;
  due_at?: SupabaseTimestamp | null;
  paid_at?: SupabaseTimestamp | null;
  created_at: SupabaseTimestamp;
  updated_at: SupabaseTimestamp;
}

export interface MeasurementRecord {
  id: string;
  client_id: string;
  record_name: string;
  notes?: string | null;
  taken_at?: SupabaseTimestamp | null;
  created_at: SupabaseTimestamp;
  updated_at: SupabaseTimestamp;
}

export interface MeasurementValueRecord {
  id: string;
  measurement_id: string;
  key: string;
  value_text?: string | null;
  value_num?: number | null;
}

export interface FileRecord {
  id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  file_type: "photo" | "document" | "other";
  caption?: string | null;
  created_at: SupabaseTimestamp;
}

export interface WorkflowRunRecord {
  id: string;
  workflow_name: string;
  run_id: string;
  status: string;
  resource_id?: string | null;
  started_at: SupabaseTimestamp;
  finished_at?: SupabaseTimestamp | null;
  result_summary?: string | null;
}
