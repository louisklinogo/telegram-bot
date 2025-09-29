import { getSupabaseServiceClient } from '../../supabaseClient';
import type { ClientRecord } from '../types';

const table = 'clients';

export interface UpsertClientInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  referral_source?: string | null;
  notes?: string | null;
}

export async function findClientByName(name: string): Promise<ClientRecord | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .ilike('name', name)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query client by name: ${error.message}`);
  }

  return (data as ClientRecord | null) ?? null;
}

export async function findClientByPhone(phone: string): Promise<ClientRecord | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query client by phone: ${error.message}`);
  }

  return (data as ClientRecord | null) ?? null;
}

export async function upsertClient(input: UpsertClientInput): Promise<ClientRecord> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from(table)
    .upsert(
      {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        referral_source: input.referral_source || null,
        notes: input.notes || null,
      },
      {
        onConflict: 'phone',
        ignoreDuplicates: false,
      }
    )
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to upsert client: ${error.message}`);
  }

  if (!data) {
    throw new Error('Supabase returned no client data after upsert');
  }

  return data as ClientRecord;
}

export async function ensureClient(input: UpsertClientInput): Promise<ClientRecord> {
  const normalizedName = input.name.trim();

  const existingByPhone = input.phone ? await findClientByPhone(input.phone) : null;
  if (existingByPhone) {
    return existingByPhone;
  }

  const existingByName = await findClientByName(normalizedName);
  if (existingByName) {
    return existingByName;
  }

  return upsertClient({
    name: normalizedName,
    phone: input.phone,
    email: input.email,
    address: input.address,
    referral_source: input.referral_source ?? 'Telegram Bot',
    notes: input.notes,
  });
}
