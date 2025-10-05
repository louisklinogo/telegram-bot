CREATE TABLE "communication_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text,
	"status" varchar(32) DEFAULT 'connected' NOT NULL,
	"credentials_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"provider_message_id" text,
	"direction" varchar(8) NOT NULL,
	"type" varchar(16) NOT NULL,
	"content" text,
	"meta" jsonb,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"contact_id" uuid,
	"channel" varchar(32) NOT NULL,
	"external_contact_id" text NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"assigned_user_id" uuid,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text,
	"size" numeric(20, 0),
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"status" varchar(16) NOT NULL,
	"provider_error_code" text,
	"retries" varchar(8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_memberships_pkey" PRIMARY KEY("team_id","user_id"),
	CONSTRAINT "chk_team_memberships_role" CHECK ("team_memberships"."role" in ('owner','manager','agent','custom'))
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"base_currency" text DEFAULT 'GHS',
	"timezone" text,
	"quiet_hours" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"full_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_invoice_number_unique";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_order_number_unique";--> statement-breakpoint
DROP INDEX "idx_invoices_invoice_number";--> statement-breakpoint
DROP INDEX "idx_orders_order_number";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'generated';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "whatsapp" varchar(50);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "garment_type" varchar(50);--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "communication_accounts" ADD CONSTRAINT "communication_accounts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_thread_id_communication_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."communication_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_account_id_communication_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."communication_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_contact_id_clients_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_communication_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."communication_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_delivery" ADD CONSTRAINT "message_delivery_message_id_communication_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."communication_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comm_accounts_team" ON "communication_accounts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "uq_comm_accounts_team_provider_external" ON "communication_accounts" USING btree ("team_id","provider","external_id");--> statement-breakpoint
CREATE INDEX "idx_comm_messages_team" ON "communication_messages" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_comm_messages_thread" ON "communication_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_comm_threads_team" ON "communication_threads" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "uq_comm_threads_account_contact" ON "communication_threads" USING btree ("account_id","external_contact_id");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clients_team_id" ON "clients" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_clients_whatsapp" ON "clients" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX "idx_clients_deleted_at" ON "clients" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_invoices_team_id" ON "invoices" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "uq_invoices_team_invoice" ON "invoices" USING btree ("team_id","invoice_number");--> statement-breakpoint
CREATE INDEX "idx_invoices_deleted_at" ON "invoices" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_measurements_team_id" ON "measurements" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_measurements_garment_type" ON "measurements" USING btree ("garment_type");--> statement-breakpoint
CREATE INDEX "idx_measurements_deleted_at" ON "measurements" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_orders_team_id" ON "orders" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "uq_orders_team_order" ON "orders" USING btree ("team_id","order_number");--> statement-breakpoint
CREATE INDEX "idx_orders_deleted_at" ON "orders" USING btree ("deleted_at");
--> statement-breakpoint
DO $$
DECLARE default_team_id uuid;
BEGIN
  -- Create a default team for backfilling existing rows
  INSERT INTO teams (id, name, base_currency, timezone, quiet_hours, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Default Team', 'GHS', NULL, NULL, now(), now())
  RETURNING id INTO default_team_id;

  -- Backfill whatsapp field from phone or placeholder
  UPDATE clients SET whatsapp = COALESCE(whatsapp, phone, 'unknown') WHERE whatsapp IS NULL;

  -- Backfill team_id on existing rows
  UPDATE clients SET team_id = default_team_id WHERE team_id IS NULL;
  UPDATE invoices SET team_id = default_team_id WHERE team_id IS NULL;
  UPDATE measurements SET team_id = default_team_id WHERE team_id IS NULL;
  UPDATE orders SET team_id = default_team_id WHERE team_id IS NULL;

  -- Enforce NOT NULL after backfill
  ALTER TABLE clients ALTER COLUMN team_id SET NOT NULL;
  ALTER TABLE clients ALTER COLUMN whatsapp SET NOT NULL;
  ALTER TABLE invoices ALTER COLUMN team_id SET NOT NULL;
  ALTER TABLE measurements ALTER COLUMN team_id SET NOT NULL;
  ALTER TABLE orders ALTER COLUMN team_id SET NOT NULL;
END $$;