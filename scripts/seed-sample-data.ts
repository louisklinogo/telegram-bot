#!/usr/bin/env bun

import "dotenv/config";
import { getSupabaseServiceClient } from "@Faworra/services";

async function seedData() {
  console.log("🌱 Seeding sample data...\n");

  const supabase = getSupabaseServiceClient();

  // Sample Clients
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .insert([
      {
        name: "Kwame Mensah",
        phone: "+233 24 123 4567",
        email: "kwame@example.com",
        address: "Accra, Greater Accra Region",
        referral_source: "Instagram",
        notes: "Prefers formal wear",
      },
      {
        name: "Ama Boateng",
        phone: "+233 20 987 6543",
        email: "ama@example.com",
        address: "Kumasi, Ashanti Region",
        referral_source: "Word of mouth",
        notes: "Regular client - traditional kente specialist",
      },
      {
        name: "Kofi Asante",
        phone: "+233 27 555 8888",
        email: "kofi@example.com",
        address: "Takoradi, Western Region",
        referral_source: "Facebook",
      },
    ])
    .select();

  if (clientsError) {
    console.error("❌ Error seeding clients:", clientsError);
    return;
  }

  console.log(`✅ Created ${clients.length} clients`);

  // Sample Orders
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .insert([
      {
        client_id: clients[0].id,
        order_number: "ORD-1001",
        status: "in_progress",
        items: [
          { name: "Custom Suit (3-piece)", quantity: 1, unit_cost: 1200, total_cost: 1200 },
          { name: "Dress Shirt", quantity: 2, unit_cost: 150, total_cost: 300 },
        ],
        total_price: 1500,
        deposit_amount: 750,
        balance_amount: 750,
        notes: "Wedding suit - needs fitting by March 15",
        due_date: new Date("2025-03-15").toISOString(),
      },
      {
        client_id: clients[1].id,
        order_number: "ORD-1002",
        status: "completed",
        items: [{ name: "Kente Dress", quantity: 1, unit_cost: 800, total_cost: 800 }],
        total_price: 800,
        deposit_amount: 800,
        balance_amount: 0,
        notes: "Traditional wear for festival",
        due_date: new Date("2025-02-28").toISOString(),
      },
      {
        client_id: clients[2].id,
        order_number: "ORD-1003",
        status: "pending",
        items: [
          { name: "Casual Blazer", quantity: 1, unit_cost: 600, total_cost: 600 },
          { name: "Trousers", quantity: 2, unit_cost: 200, total_cost: 400 },
        ],
        total_price: 1000,
        deposit_amount: 0,
        balance_amount: 1000,
        notes: "Awaiting measurements",
      },
    ])
    .select();

  if (ordersError) {
    console.error("❌ Error seeding orders:", ordersError);
    return;
  }

  console.log(`✅ Created ${orders.length} orders`);

  // Sample Invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .insert([
      {
        order_id: orders[0].id,
        invoice_number: "INV-2025-001",
        amount: 750,
        status: "paid",
        due_date: new Date("2025-02-01").toISOString(),
        paid_at: new Date("2025-01-28").toISOString(),
        notes: "Deposit payment",
      },
      {
        order_id: orders[1].id,
        invoice_number: "INV-2025-002",
        amount: 800,
        status: "paid",
        due_date: new Date("2025-02-20").toISOString(),
        paid_at: new Date("2025-02-18").toISOString(),
      },
      {
        order_id: orders[0].id,
        invoice_number: "INV-2025-003",
        amount: 750,
        status: "pending",
        due_date: new Date("2025-03-20").toISOString(),
        notes: "Balance payment due upon completion",
      },
    ])
    .select();

  if (invoicesError) {
    console.error("❌ Error seeding invoices:", invoicesError);
    return;
  }

  console.log(`✅ Created ${invoices.length} invoices`);

  // Sample Measurements
  const { data: measurements, error: measurementsError } = await supabase
    .from("measurements")
    .insert([
      {
        client_id: clients[0].id,
        record_name: "Wedding Suit Measurements",
        measurements: {
          chest: 42,
          waist: 34,
          shoulder: 18,
          sleeve: 25,
          neck: 16,
          hip: 40,
          inseam: 32,
        },
        taken_at: new Date("2025-01-15").toISOString(),
        notes: "Client prefers slim fit",
      },
      {
        client_id: clients[1].id,
        record_name: "Traditional Kente Dress",
        measurements: {
          bust: 38,
          waist: 32,
          hip: 42,
          shoulder: 16,
          length: 52,
        },
        taken_at: new Date("2025-02-01").toISOString(),
      },
    ])
    .select();

  if (measurementsError) {
    console.error("❌ Error seeding measurements:", measurementsError);
    return;
  }

  console.log(`✅ Created ${measurements.length} measurements`);

  console.log("\n✅ Sample data seeded successfully!\n");
  console.log("📊 Summary:");
  console.log(`   • ${clients.length} clients`);
  console.log(`   • ${orders.length} orders`);
  console.log(`   • ${invoices.length} invoices`);
  console.log(`   • ${measurements.length} measurements\n`);
}

seedData().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
