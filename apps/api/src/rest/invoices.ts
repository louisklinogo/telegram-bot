import { enqueueCommunicationOutbox } from "@Faworra/supabase/mutations";
import type { Database, TablesInsert } from "@Faworra/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Hono } from "hono";
import { z } from "zod";
import type { ApiEnv } from "../types/hono-env";

export function registerInvoicesRoutes(app: Hono<ApiEnv>) {
  // Record a payment for an invoice (creates a transaction and allocation)
  app.post("/invoices/:id/payments", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const schema = z.object({
        amount: z.number().positive(),
        currency: z.string().min(3).max(8).default("GHS"),
        description: z.string().optional(),
        paymentMethod: z.string().optional(),
        paymentReference: z.string().optional(),
        transactionDate: z.string().datetime().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return c.json({ error: "invalid payload" }, 400);

      const supabase = c.get("supabaseAdmin");
      const teamId = c.get("teamId");

      // Verify invoice belongs to team
      const { data: inv, error: iErr } = await supabase
        .from("invoices")
        .select("id, team_id, amount, paid_amount")
        .eq("id", id)
        .eq("team_id", teamId)
        .maybeSingle<{ id: string; team_id: string; amount: number; paid_amount: number | null }>();
      if (iErr || !inv) return c.json({ error: "invoice not found" }, 404);

      const trxNumber = `TX-${Date.now()}`;
      const now = new Date();
      const insertTrx: TablesInsert<"transactions"> = {
        team_id: teamId,
        date: now.toISOString().slice(0, 10),
        name: parsed.data.description ?? `Payment ${trxNumber}`,
        internal_id: trxNumber,
        transaction_number: trxNumber,
        type: "payment",
        status: "completed",
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        description: parsed.data.description ?? `Payment ${trxNumber}`,
        invoice_id: id,
        payment_method: parsed.data.paymentMethod ?? null,
        payment_reference: parsed.data.paymentReference ?? null,
        transaction_date: parsed.data.transactionDate
          ? new Date(parsed.data.transactionDate).toISOString()
          : now.toISOString(),
      };

      const { data: createdTrx, error: tErr } = await supabase
        .from("transactions")
        .insert(insertTrx)
        .select("id")
        .maybeSingle<{ id: string }>();
      if (tErr || !createdTrx)
        return c.json({ error: tErr?.message || "failed to create transaction" }, 500);

      const allocation = {
        transaction_id: createdTrx.id,
        invoice_id: id,
        amount: parsed.data.amount,
      } satisfies TablesInsert<"transaction_allocations">;
      const { error: aErr } = await supabase.from("transaction_allocations").insert(allocation);
      if (aErr) return c.json({ error: aErr.message }, 500);

      // Triggers will recalc invoice paid_amount/status
      return c.json({ success: true, transaction_id: createdTrx.id });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });

  // Send invoice via WhatsApp (enqueue outbox)
  app.post("/invoices/:id/send-whatsapp", async (c) => {
    try {
      const id = c.req.param("id");
      const supabase = c.get("supabaseAdmin");
      const teamId = c.get("teamId");
      type InvoiceWithJoins = {
        id: string;
        invoice_number: string;
        amount: number;
        due_date: string | null;
        invoice_url: string | null;
        team_id: string;
        order: {
          id: string;
          order_number: string;
          client: { name: string | null; whatsapp: string } | null;
        } | null;
      };

      const { data: inv, error: iErr } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, amount, due_date, invoice_url, team_id, order:orders(id, order_number, client:clients(name, whatsapp))"
        )
        .eq("id", id)
        .eq("team_id", teamId)
        .returns<InvoiceWithJoins[]>()
        .maybeSingle();
      if (iErr || !inv) return c.json({ error: "invoice not found" }, 404);
      const client = inv.order?.client;
      const phone = client?.whatsapp as string | undefined;
      if (!phone) return c.json({ error: "client has no whatsapp" }, 400);
      const { data: acc, error: aErr } = await supabase
        .from("communication_accounts")
        .select("id, team_id, provider")
        .eq("team_id", inv.team_id)
        .eq("provider", "whatsapp_baileys")
        .limit(1)
        .maybeSingle<{ id: string; team_id: string; provider: string }>();
      if (aErr || !acc) return c.json({ error: "no whatsapp account for team" }, 400);
      const due = inv.due_date
        ? new Date(inv.due_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "soon";
      const url = inv.invoice_url || "";
      const orderNo = inv.order?.order_number || "";
      const name = client?.name || "";
      const msg =
        `Hi ${name || ""} — your order ${orderNo || ""} is ready. Total: ₵${inv.amount}. Due ${due}. Invoice: ${url || "[ask for PDF]"}`.trim();
      const { error: insErr } = await enqueueCommunicationOutbox(supabase, {
        team_id: acc.team_id,
        account_id: acc.id,
        recipient: phone,
        content: msg,
        status: "queued",
      });
      if (insErr) return c.json({ error: insErr.message }, 500);
      return c.json({ enqueued: true });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });
}
