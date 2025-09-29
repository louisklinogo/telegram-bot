#!/usr/bin/env bun

import 'dotenv/config';
import { Client } from 'pg';

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not found');
  process.exit(1);
}

// Parse and fix the connection string if needed
let connectionString = dbUrl;
if (dbUrl.includes('@db.') && !dbUrl.includes(':[PASSWORD]@')) {
  // URL is missing password, add it from service role key if needed
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('⚠️  Connection string may need password');
}

console.log('🔧 Connecting to Supabase database...\n');

const client = new Client({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('✅ Connected to database\n');
  
  console.log('📋 Creating tables...\n');
  
  // Create clients table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      notion_page_id TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      referral_source TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Clients table created');
  
  // Create orders table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      notion_page_id TEXT UNIQUE,
      client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
      order_number TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending',
      items JSONB DEFAULT '[]'::JSONB,
      total_price NUMERIC(10, 2) DEFAULT 0,
      deposit_amount NUMERIC(10, 2) DEFAULT 0,
      balance_amount NUMERIC(10, 2) DEFAULT 0,
      notes TEXT,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Orders table created');
  
  // Create invoices table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      notion_page_id TEXT UNIQUE,
      order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
      invoice_number TEXT NOT NULL UNIQUE,
      amount NUMERIC(10, 2) NOT NULL,
      status TEXT DEFAULT 'pending',
      due_date TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      invoice_url TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Invoices table created');
  
  // Create measurements table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.measurements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      notion_page_id TEXT UNIQUE,
      client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
      record_name TEXT,
      measurements JSONB DEFAULT '{}'::JSONB,
      taken_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Measurements table created\n');
  
  console.log('📊 Creating indexes...\n');
  
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
    CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
    CREATE INDEX IF NOT EXISTS idx_measurements_client_id ON public.measurements(client_id);
  `);
  console.log('✅ Indexes created\n');
  
  console.log('🔒 Setting up RLS (Row Level Security)...\n');
  
  await client.query(`
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
  `);
  
  // Create permissive policies for service role
  await client.query(`
    DROP POLICY IF EXISTS "Allow all for service role" ON public.clients;
    CREATE POLICY "Allow all for service role" ON public.clients FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Allow all for service role" ON public.orders;
    CREATE POLICY "Allow all for service role" ON public.orders FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Allow all for service role" ON public.invoices;
    CREATE POLICY "Allow all for service role" ON public.invoices FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Allow all for service role" ON public.measurements;
    CREATE POLICY "Allow all for service role" ON public.measurements FOR ALL USING (true);
  `);
  console.log('✅ RLS policies created\n');
  
  console.log('✅ Schema setup complete!\n');
  
} catch (error: any) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
