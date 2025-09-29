import { supabaseBrowser } from './supabase-browser';
import type { Database } from '@cimantikos/types';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];

// Client Mutations
export async function createClient(data: Omit<ClientInsert, 'id' | 'created_at' | 'updated_at'>) {
  if (!supabaseBrowser) throw new Error('Supabase client not initialized');
  
  const { data: client, error } = await supabaseBrowser
    .from('clients')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return client;
}

export async function updateClient(id: string, data: ClientUpdate) {
  if (!supabaseBrowser) throw new Error('Supabase client not initialized');
  
  const { data: client, error } = await supabaseBrowser
    .from('clients')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return client;
}

export async function deleteClient(id: string) {
  if (!supabaseBrowser) throw new Error('Supabase client not initialized');
  
  const { error } = await supabaseBrowser
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { id };
}

// Order Mutations
export async function createOrder(data: Omit<OrderInsert, 'id' | 'created_at' | 'updated_at'>) {
  if (!supabaseBrowser) throw new Error('Supabase client not initialized');
  
  const { data: order, error } = await supabaseBrowser
    .from('orders')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return order;
}

export async function updateOrder(id: string, data: OrderUpdate) {
  if (!supabaseBrowser) throw new Error('Supabase client not initialized');
  
  const { data: order, error } = await supabaseBrowser
    .from('orders')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return order;
}

export async function deleteOrder(id: string) {
  if (!supabaseBrowser) throw new Error('Supabase client not initialized');
  
  const { error } = await supabaseBrowser
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { id };
}

// Invoice Mutations
export async function updateInvoiceStatus(id: string, status: string, paidAt?: string) {
  if (!supabaseBrowser) throw new Error('Supabase client not initialized');
  
  const updateData: any = { status };
  if (status === 'paid' && paidAt) {
    updateData.paid_at = paidAt;
  }
  
  const { data: invoice, error } = await supabaseBrowser
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return invoice;
}
