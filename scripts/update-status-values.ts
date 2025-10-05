/**
 * Script to update status values in Supabase to match admin dashboard expectations
 * Run: bun run scripts/update-status-values.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOrderStatuses() {
  console.log("🔄 Updating order status values...\n");

  const updates = [
    { from: "New", to: "Generated" },
    { from: "pending", to: "In progress" },
    { from: "in_progress", to: "In progress" },
    { from: "completed", to: "Completed" },
    { from: "cancelled", to: "Cancelled" },
  ];

  for (const { from, to } of updates) {
    const { error, count } = await supabase
      .from("orders")
      .update({ status: to })
      .eq("status", from)
      .select("id", { count: "exact" });

    if (error) {
      console.error(`❌ Error updating "${from}" to "${to}":`, error.message);
    } else {
      console.log(`✅ Updated ${count || 0} orders from "${from}" to "${to}"`);
    }
  }

  console.log("\n📊 Current status distribution:");
  const { data: statuses, error: statsError } = await supabase
    .from("orders")
    .select("status")
    .then((res) => {
      if (res.error) throw res.error;
      const grouped = res.data.reduce(
        (acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      return { data: grouped, error: null };
    });

  if (statsError) {
    console.error("❌ Error fetching stats:", statsError.message);
  } else {
    console.table(statuses);
  }

  console.log("\n✅ Status values updated successfully!");
  console.log("🎨 The badges should now display with proper colors.");
}

// Run the migration
updateOrderStatuses()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
