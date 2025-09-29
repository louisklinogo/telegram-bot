#!/usr/bin/env bun

import 'dotenv/config';

import { getEnvConfig, validateEnvironmentVariables } from '@cimantikos/config';
import { getSupabaseServiceClient } from '@cimantikos/services';

type NotionPage = {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
};

const NOTION_VERSION = '2022-06-28';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getPlainText = (property?: any): string => {
  if (!property) return '';
  if (Array.isArray(property)) {
    return property.map((block) => block.plain_text ?? '').join('');
  }
  if (Array.isArray(property.title)) {
    return property.title.map((block: any) => block.plain_text ?? '').join('');
  }
  if (Array.isArray(property.rich_text)) {
    return property.rich_text.map((block: any) => block.plain_text ?? '').join('');
  }
  if (typeof property === 'string') {
    return property;
  }
  return '';
};

const getNumber = (property?: any): number | null => {
  if (!property || typeof property.number !== 'number') return null;
  return property.number;
};

const getDate = (property?: any): string | null => {
  if (!property?.date?.start) return null;
  return property.date.start;
};

const getSelect = (property?: any): string | null => property?.select?.name ?? null;

const getURL = (property?: any): string | null => property?.url ?? null;

const getRelationIds = (property?: any): string[] => Array.isArray(property?.relation) ? property.relation.map((r: any) => r.id) : [];

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

async function fetchDatabasePages(databaseId: string, token: string): Promise<NotionPage[]> {
  let hasMore = true;
  let nextCursor: string | undefined;
  const pages: NotionPage[] = [];

  while (hasMore) {
    const body: Record<string, any> = { page_size: 100 };
    if (nextCursor) {
      body.start_cursor = nextCursor;
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error (${databaseId}): ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    pages.push(...(data.results as NotionPage[]));
    hasMore = data.has_more;
    nextCursor = data.next_cursor ?? undefined;

    if (hasMore) {
      await sleep(300);
    }
  }

  return pages;
}

async function migrateClients(pages: NotionPage[], supabase = getSupabaseServiceClient()) {
  const clientIdMap = new Map<string, string>();

  for (const chunk of chunkArray(pages, 50)) {
    const payload = chunk.map((page) => {
      const props = page.properties;
      return {
        notion_page_id: page.id,
        name: getPlainText(props['Name']),
        phone: props['Phone Number']?.phone_number ?? null,
        email: props['Email']?.email ?? null,
        address: getPlainText(props['Address']),
        referral_source: null,
        notes: null,
        created_at: page.created_time,
        updated_at: page.last_edited_time,
      };
    });

    const { data, error } = await supabase
      .from('clients')
      .upsert(payload, { onConflict: 'notion_page_id' })
      .select('id, notion_page_id');

    if (error) {
      throw new Error(`Failed to upsert clients: ${error.message}`);
    }

    (data ?? []).forEach((row) => {
      if (row.notion_page_id) {
        clientIdMap.set(row.notion_page_id, row.id);
      }
    });
  }

  return clientIdMap;
}

const parseOrderItems = (itemsText: string): Array<{ name: string; quantity: number; unit_cost: number; total_cost: number }> => {
  if (!itemsText) return [];
  return itemsText.split(',').map((segment) => segment.trim()).map((segment) => {
    const match = segment.match(/^(.*)\(Qty:\s*(\d+),\s*Cost:\s*GHS\s*([\d.]+)\)$/i);
    if (match) {
      const [, rawName, qty, cost] = match;
      const quantity = Number.parseInt(qty, 10);
      const unit_cost = Number.parseFloat(cost);
      return {
        name: rawName.trim(),
        quantity: Number.isFinite(quantity) ? quantity : 1,
        unit_cost: Number.isFinite(unit_cost) ? unit_cost : 0,
        total_cost: (Number.isFinite(quantity) ? quantity : 1) * (Number.isFinite(unit_cost) ? unit_cost : 0),
      };
    }
    return {
      name: segment.replace(/\s+\(.*$/, '').trim(),
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
    };
  });
};

async function migrateOrders(
  pages: NotionPage[],
  clientIdMap: Map<string, string>,
  supabase = getSupabaseServiceClient(),
) {
  for (const page of pages) {
    const props = page.properties;
    const clientRelation = getRelationIds(props['Client']);
    const clientId = clientRelation.map((id) => clientIdMap.get(id)).find(Boolean) ?? null;

    const orderRecord = {
      notion_page_id: page.id,
      order_number: getPlainText(props['Order ID']) || `ORD-${page.id.slice(0, 8)}`,
      client_id: clientId,
      status: getSelect(props['Status']) ?? 'New',
      total_price: getNumber(props['Total Price']) ?? 0,
      notes: getPlainText(props['Notes']) || null,
      invoice_file_url: getURL(props['Invoice/File']) ?? null,
      created_at: getDate(props['Date']) ?? page.created_time,
      updated_at: page.last_edited_time,
    };

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .upsert(orderRecord, { onConflict: 'notion_page_id' })
      .select('id')
      .maybeSingle();

    if (orderError) {
      throw new Error(`Failed to upsert order ${orderRecord.order_number}: ${orderError.message}`);
    }

    if (!orderData?.id) continue;

    await supabase.from('order_items').delete().eq('order_id', orderData.id);

    const itemsText = getPlainText(props['Items']);
    const parsedItems = parseOrderItems(itemsText);

    if (parsedItems.length > 0) {
      const insertPayload = parsedItems.map((item) => ({
        order_id: orderData.id,
        name: item.name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
      }));

      const { error: itemError } = await supabase.from('order_items').insert(insertPayload);
      if (itemError) {
        throw new Error(`Failed to insert order items for ${orderRecord.order_number}: ${itemError.message}`);
      }
    }
  }
}

async function migrateInvoices(pages: NotionPage[], orderIdLookup: Map<string, string>, supabase = getSupabaseServiceClient()) {
  if (pages.length === 0) {
    return;
  }

  for (const page of pages) {
    const props = page.properties;
    const orderRelation = getRelationIds(props['Order']);
    const linkedOrderId = orderRelation.map((id) => orderIdLookup.get(id)).find(Boolean) ?? null;

    const invoiceRecord = {
      notion_page_id: page.id,
      invoice_number: getPlainText(props['Invoice Number']) || `INV-${page.id.slice(0, 8)}`,
      order_id: linkedOrderId,
      amount: getNumber(props['Amount']) ?? 0,
      status: getSelect(props['Status']) ?? 'Generated',
      pdf_url: getURL(props['Invoice/File']) ?? null,
      issued_at: getDate(props['Issue Date']) ?? page.created_time,
      due_at: getDate(props['Due Date']),
      paid_at: props['Paid At']?.date?.start ?? null,
      updated_at: page.last_edited_time,
      created_at: page.created_time,
    };

    const { error } = await supabase
      .from('invoices')
      .upsert(invoiceRecord, { onConflict: 'notion_page_id' });

    if (error) {
      throw new Error(`Failed to upsert invoice ${invoiceRecord.invoice_number}: ${error.message}`);
    }
  }
}

const MEASUREMENT_NUMERIC_KEYS: Record<string, string> = {
  Chest: 'chest',
  Shoulder: 'shoulder',
  Sleeves: 'sleeves',
  Neck: 'neck',
  Waist: 'waist',
  Lap: 'lap',
  Stomach: 'stomach',
  Hip: 'hip',
};

const MEASUREMENT_TEXT_KEYS: Record<string, string> = {
  RD: 'rd',
  'RD 2': 'rd2',
  LT: 'lt',
  'LT 2': 'lt2',
};

async function migrateMeasurements(
  pages: NotionPage[],
  clientIdMap: Map<string, string>,
  supabase = getSupabaseServiceClient(),
) {
  for (const page of pages) {
    const props = page.properties;
    const clientRelation = getRelationIds(props['Client']);
    const clientId = clientRelation.map((id) => clientIdMap.get(id)).find(Boolean) ?? null;

    const measurementRecord = {
      notion_page_id: page.id,
      client_id: clientId,
      record_name: getPlainText(props['Measurement Name']) || `Measurement ${page.id.slice(0, 8)}`,
      notes: props['Notes'] ? getPlainText(props['Notes']) : null,
      taken_at: getDate(props['Date Taken']) ?? page.created_time,
      created_at: page.created_time,
      updated_at: page.last_edited_time,
    };

    const { data: measurementRow, error: measurementError } = await supabase
      .from('measurements')
      .upsert(measurementRecord, { onConflict: 'notion_page_id' })
      .select('id')
      .maybeSingle();

    if (measurementError) {
      throw new Error(`Failed to upsert measurement ${measurementRecord.record_name}: ${measurementError.message}`);
    }

    if (!measurementRow?.id) continue;

    await supabase.from('measurement_values').delete().eq('measurement_id', measurementRow.id);

    const valueRows: Array<{ measurement_id: string; key: string; value_num?: number | null; value_text?: string | null }> = [];

    for (const [notionKey, supaKey] of Object.entries(MEASUREMENT_NUMERIC_KEYS)) {
      const value = getNumber(props[notionKey]);
      if (value !== null) {
        valueRows.push({ measurement_id: measurementRow.id, key: supaKey, value_num: value, value_text: null });
      }
    }

    for (const [notionKey, supaKey] of Object.entries(MEASUREMENT_TEXT_KEYS)) {
      const raw = getPlainText(props[notionKey]);
      if (raw) {
        valueRows.push({ measurement_id: measurementRow.id, key: supaKey, value_text: raw, value_num: null });
      }
    }

    if (valueRows.length > 0) {
      const { error: valuesError } = await supabase.from('measurement_values').insert(valueRows);
      if (valuesError) {
        throw new Error(`Failed to insert measurement values for ${measurementRecord.record_name}: ${valuesError.message}`);
      }
    }
  }
}

async function main() {
  validateEnvironmentVariables();
  const env = getEnvConfig();

  if (!env.NOTION_API_KEY) {
    console.error('❌ NOTION_API_KEY is required for migration');
    process.exit(1);
  }

  const supabase = getSupabaseServiceClient();

  const clientsDb = env.NOTION_CLIENTS_DB_ID;
  const ordersDb = env.NOTION_ORDERS_DB_ID;
  const invoicesDb = env.NOTION_INVOICES_DB_ID;
  const measurementsDb = env.NOTION_MEASUREMENTS_DB_ID;

  try {
    console.log('📥 Fetching Notion clients...');
    const notionClients = clientsDb ? await fetchDatabasePages(clientsDb, env.NOTION_API_KEY) : [];
    console.log(`   → ${notionClients.length} client records.`);

    console.log('📥 Fetching Notion orders...');
    const notionOrders = ordersDb ? await fetchDatabasePages(ordersDb, env.NOTION_API_KEY) : [];
    console.log(`   → ${notionOrders.length} order records.`);

    console.log('📥 Fetching Notion invoices...');
    const notionInvoices = invoicesDb ? await fetchDatabasePages(invoicesDb, env.NOTION_API_KEY) : [];
    console.log(`   → ${notionInvoices.length} invoice records.`);

    console.log('📥 Fetching Notion measurements...');
    const notionMeasurements = measurementsDb ? await fetchDatabasePages(measurementsDb, env.NOTION_API_KEY) : [];
    console.log(`   → ${notionMeasurements.length} measurement records.`);

    console.log('🔁 Migrating clients to Supabase...');
    const clientIdMap = await migrateClients(notionClients, supabase);
    console.log(`   → Migrated ${clientIdMap.size} clients.`);

    console.log('🔁 Migrating orders to Supabase...');
    await migrateOrders(notionOrders, clientIdMap, supabase);
    console.log('   → Orders migrated.');

    console.log('🔁 Migrating invoices to Supabase...');
    const orderIdLookup = new Map<string, string>();
    if (notionOrders.length > 0) {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('id, notion_page_id')
        .not('notion_page_id', 'is', null);
      if (error) {
        throw new Error(`Failed to build order lookup: ${error.message}`);
      }
      (ordersData ?? []).forEach((row) => {
        if (row.notion_page_id) {
          orderIdLookup.set(row.notion_page_id, row.id);
        }
      });
    }
    await migrateInvoices(notionInvoices, orderIdLookup, supabase);
    console.log('   → Invoices migrated.');

    console.log('🔁 Migrating measurements to Supabase...');
    await migrateMeasurements(notionMeasurements, clientIdMap, supabase);
    console.log('   → Measurements migrated.');

    console.log('✅ Notion migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  }
}

main();
