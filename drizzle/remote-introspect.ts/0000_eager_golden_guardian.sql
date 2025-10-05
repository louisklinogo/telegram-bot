-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."comm_message_status" AS ENUM('queued', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('generated', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'agent', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."transaction_frequency" AS ENUM('weekly', 'biweekly', 'monthly', 'semi_monthly', 'annually', 'irregular');--> statement-breakpoint
CREATE TYPE "public"."transaction_method" AS ENUM('cash', 'bank_transfer', 'mobile_money', 'card', 'cheque', 'other');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('payment', 'expense', 'refund', 'adjustment');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(50),
	"whatsapp" varchar(50) NOT NULL,
	"email" varchar(255),
	"address" text,
	"referral_source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"team_id" uuid NOT NULL,
	"country" text,
	"country_code" varchar(10),
	"company" text,
	"occupation" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "check_at_least_one_contact" CHECK ((phone IS NOT NULL) OR (whatsapp IS NOT NULL) OR (email IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"order_number" varchar(50) NOT NULL,
	"status" "order_status" DEFAULT 'generated' NOT NULL,
	"total_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"balance_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"team_id" uuid NOT NULL,
	CONSTRAINT "orders_order_number_key" UNIQUE("order_number"),
	CONSTRAINT "check_deposit_not_exceeding_total" CHECK (deposit_amount <= total_price),
	CONSTRAINT "check_positive_amounts" CHECK ((total_price >= (0)::numeric) AND (deposit_amount >= (0)::numeric) AND (balance_amount >= (0)::numeric)),
	CONSTRAINT "check_valid_order_status" CHECK ((status)::text = ANY (ARRAY[('generated'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"record_name" varchar(100),
	"garment_type" varchar(50),
	"measurements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"taken_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"team_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"measurement_group_id" uuid,
	"previous_version_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"tags" text[] DEFAULT '{"RAY"}',
	CONSTRAINT "check_valid_garment_type" CHECK (((garment_type)::text = ANY ((ARRAY['suit'::character varying, 'kaftan'::character varying, 'shirt'::character varying, 'trouser'::character varying, 'agbada'::character varying, 'two_piece'::character varying])::text[])) OR (garment_type IS NULL))
);
--> statement-breakpoint
ALTER TABLE "measurements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"base_currency" text DEFAULT 'GHS',
	"country" text DEFAULT 'GH',
	"timezone" text DEFAULT 'Africa/Accra',
	"quiet_hours" text DEFAULT '21:00-08:00',
	"locale" text DEFAULT 'en-GH'
);
--> statement-breakpoint
CREATE TABLE "communication_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"credentials_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communication_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "communication_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"customer_id" uuid,
	"channel" text NOT NULL,
	"external_contact_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_user_id" uuid,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"whatsapp_contact_id" uuid,
	"instagram_contact_id" uuid
);
--> statement-breakpoint
ALTER TABLE "communication_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "communication_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"provider_message_id" text,
	"direction" text NOT NULL,
	"type" text NOT NULL,
	"content" text,
	"meta" jsonb,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_status" boolean DEFAULT false NOT NULL,
	"status" "comm_message_status" DEFAULT 'sent',
	"client_message_id" text
);
--> statement-breakpoint
ALTER TABLE "communication_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"full_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_team_id" uuid
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transaction_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_allocations_transaction_id_invoice_id_key" UNIQUE("transaction_id","invoice_id"),
	CONSTRAINT "transaction_allocations_amount_check" CHECK (amount > (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "transaction_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"order_item_id" uuid,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"invoice_number" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"due_date" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"invoice_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"currency" varchar(3) DEFAULT 'GHS' NOT NULL,
	"vat_rate" numeric(5, 2),
	"vat_amount" numeric(10, 2),
	"subtotal" numeric(10, 2) NOT NULL,
	"exchange_rate" numeric(12, 6),
	"team_id" uuid NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0',
	"tax" numeric(10, 2) DEFAULT '0',
	"discount" numeric(10, 2) DEFAULT '0',
	"sent_at" timestamp with time zone,
	CONSTRAINT "invoices_invoice_number_key" UNIQUE("invoice_number"),
	CONSTRAINT "check_paid_status_requires_paid_at" CHECK ((((status)::text = 'paid'::text) AND (paid_at IS NOT NULL)) OR ((status)::text <> 'paid'::text)),
	CONSTRAINT "check_positive_invoice_amount" CHECK (amount > (0)::numeric),
	CONSTRAINT "check_valid_invoice_status" CHECK ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text, ('paid'::character varying)::text, ('overdue'::character varying)::text, ('cancelled'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_check" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text,
	"size" bigint,
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bank_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"source" text NOT NULL,
	"account_label" text,
	"currency" varchar(3) DEFAULT 'GHS' NOT NULL,
	"opening_balance" numeric(12, 2),
	"closing_balance" numeric(12, 2),
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_statements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "communication_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"team_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"recipient" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"client_message_id" text,
	"media_path" text,
	"media_type" text,
	"media_filename" text,
	"caption" text
);
--> statement-breakpoint
ALTER TABLE "communication_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"status" text NOT NULL,
	"provider_error_code" text,
	"retries" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_delivery" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users_on_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'agent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_on_team_user_id_team_id_key" UNIQUE("user_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "users_on_team" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "team_role" DEFAULT 'agent' NOT NULL,
	"code" text DEFAULT encode(gen_random_bytes(16), 'hex'::text) NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_invites_team_id_email_key" UNIQUE("team_id","email"),
	CONSTRAINT "user_invites_code_key" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "user_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "whatsapp_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"wa_id" text NOT NULL,
	"phone" text,
	"display_name" text,
	"profile_pic_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_contacts_team_id_wa_id_key" UNIQUE("team_id","wa_id")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instagram_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"username" text NOT NULL,
	"external_id" text,
	"display_name" text,
	"profile_pic_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_contacts_team_id_username_key" UNIQUE("team_id","username")
);
--> statement-breakpoint
ALTER TABLE "instagram_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"notification_type" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_user_id_team_id_notification_type_cha_key" UNIQUE("user_id","team_id","notification_type","channel")
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bank_statement_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"balance" numeric(12, 2),
	"external_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_statement_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bank_statement_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_statement_allocations_line_id_transaction_id_key" UNIQUE("line_id","transaction_id"),
	CONSTRAINT "bank_statement_allocations_amount_check" CHECK (amount > (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "bank_statement_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"client_id" uuid,
	"staff_user_id" uuid,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"location" text,
	"reminder_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "communication_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"locale" text,
	"body" text,
	"variables" jsonb,
	"status" text,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communication_templates_team_id_provider_name_key" UNIQUE("team_id","provider","name")
);
--> statement-breakpoint
ALTER TABLE "communication_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"path_tokens" text[],
	"mime_type" text,
	"size" integer,
	"tags" text[] DEFAULT '{"RAY"}',
	"processing_status" varchar(32) DEFAULT 'pending',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"order_id" uuid,
	"invoice_id" uuid,
	"client_id" uuid,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transaction_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text,
	"description" text,
	"parent_id" uuid,
	"system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_category_slug_per_team" UNIQUE("team_id","slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_tag_name_per_team" UNIQUE("team_id","name")
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_transaction_tag" UNIQUE("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"invoice_id" uuid,
	"client_id" uuid,
	"transaction_number" varchar(50) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"category" varchar(100),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GHS' NOT NULL,
	"payment_method" varchar(50),
	"payment_reference" varchar(100),
	"description" text,
	"notes" text,
	"transaction_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone,
	"status" "transaction_status" DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"team_id" uuid NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"internal_id" text NOT NULL,
	"balance" numeric(10, 2),
	"base_amount" numeric(10, 2),
	"base_currency" varchar(3),
	"category_slug" text,
	"assigned_id" uuid,
	"counterparty_name" text,
	"merchant_name" text,
	"manual" boolean DEFAULT false,
	"recurring" boolean DEFAULT false,
	"frequency" "transaction_frequency",
	"enrichment_completed" boolean DEFAULT false,
	"fts_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(counterparty_name, ''::text)) || ' '::text) || COALESCE(merchant_name, ''::text)) || ' '::text) || (COALESCE(category, ''::character varying))::text))) STORED,
	CONSTRAINT "transactions_transaction_number_key" UNIQUE("transaction_number"),
	CONSTRAINT "transactions_internal_id_unique" UNIQUE("internal_id"),
	CONSTRAINT "check_positive_transaction_amount" CHECK (amount > (0)::numeric),
	CONSTRAINT "check_valid_transaction_status" CHECK ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text, ('cancelled'::character varying)::text])),
	CONSTRAINT "check_valid_transaction_type" CHECK ((type)::text = ANY (ARRAY[('payment'::character varying)::text, ('expense'::character varying)::text, ('refund'::character varying)::text, ('adjustment'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transaction_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"name" text NOT NULL,
	"path" text[] NOT NULL,
	"type" text,
	"mime_type" text,
	"size" numeric(20, 0),
	"checksum" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_attachment_path_not_empty" CHECK (array_length(path, 1) > 0),
	CONSTRAINT "check_attachment_size_positive" CHECK ((size IS NULL) OR (size > (0)::numeric))
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_previous_version_id_measurements_id_fk" FOREIGN KEY ("previous_version_id") REFERENCES "public"."measurements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_accounts" ADD CONSTRAINT "communication_accounts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."communication_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_instagram_contact_id_fkey" FOREIGN KEY ("instagram_contact_id") REFERENCES "public"."instagram_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_whatsapp_contact_id_fkey" FOREIGN KEY ("whatsapp_contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."communication_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_current_team_id_fkey" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."communication_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."communication_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_delivery" ADD CONSTRAINT "message_delivery_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."communication_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_on_team" ADD CONSTRAINT "users_on_team_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_on_team" ADD CONSTRAINT "users_on_team_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_contacts" ADD CONSTRAINT "instagram_contacts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "public"."bank_statements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_allocations" ADD CONSTRAINT "bank_statement_allocations_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."bank_statement_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_allocations" ADD CONSTRAINT "bank_statement_allocations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."transaction_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "fk_transactions_assigned_user" FOREIGN KEY ("assigned_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "fk_transactions_category" FOREIGN KEY ("team_id","category_slug") REFERENCES "public"."transaction_categories"("team_id","slug") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_team_id_idx" ON "clients" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_clients_deleted_at" ON "clients" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_clients_email" ON "clients" USING btree ("email" text_ops) WHERE (email IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_clients_name" ON "clients" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_clients_name_trgm" ON "clients" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_clients_phone" ON "clients" USING btree ("phone" text_ops) WHERE (phone IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_clients_team_id" ON "clients" USING btree ("team_id" uuid_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_clients_whatsapp" ON "clients" USING btree ("whatsapp" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_active_status" ON "orders" USING btree ("status" timestamptz_ops,"created_at" enum_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_orders_client_id" ON "orders" USING btree ("client_id" uuid_ops) WHERE (client_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_deleted_at" ON "orders" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_due_date" ON "orders" USING btree ("due_date" timestamptz_ops) WHERE ((deleted_at IS NULL) AND (due_date IS NOT NULL));--> statement-breakpoint
CREATE INDEX "idx_orders_order_number" ON "orders" USING btree ("order_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_team_id" ON "orders" USING btree ("team_id" uuid_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "orders_team_id_idx" ON "orders" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_measurements_client_active" ON "measurements" USING btree ("client_id" bool_ops,"is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_measurements_client_id" ON "measurements" USING btree ("client_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_measurements_deleted_at" ON "measurements" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_measurements_garment_type" ON "measurements" USING btree ("garment_type" text_ops) WHERE (garment_type IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_measurements_group_id" ON "measurements" USING btree ("measurement_group_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_measurements_tags" ON "measurements" USING btree ("tags" array_ops);--> statement-breakpoint
CREATE INDEX "idx_measurements_taken_at" ON "measurements" USING btree ("taken_at" timestamptz_ops) WHERE (taken_at IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_measurements_team_id" ON "measurements" USING btree ("team_id" uuid_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "measurements_team_id_idx" ON "measurements" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_accounts_team" ON "communication_accounts" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_comm_accounts_team_provider_external" ON "communication_accounts" USING btree ("team_id" text_ops,"provider" text_ops,"external_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_threads_pagination" ON "communication_threads" USING btree ("team_id" text_ops,"status" timestamptz_ops,"last_message_at" text_ops,"id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_threads_status" ON "communication_threads" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_threads_team" ON "communication_threads" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_threads_team_status" ON "communication_threads" USING btree ("team_id" text_ops,"status" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_comm_threads_account_contact" ON "communication_threads" USING btree ("account_id" uuid_ops,"external_contact_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_messages_status" ON "communication_messages" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_messages_team" ON "communication_messages" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_messages_thread" ON "communication_messages" USING btree ("thread_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_comm_msg_team_client" ON "communication_messages" USING btree ("team_id" uuid_ops,"client_message_id" uuid_ops) WHERE (client_message_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_comm_msg_team_provider" ON "communication_messages" USING btree ("team_id" text_ops,"provider_message_id" text_ops) WHERE (provider_message_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "transaction_allocations_invoice_idx" ON "transaction_allocations" USING btree ("invoice_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_invoice_items_invoice_id" ON "invoice_items" USING btree ("invoice_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_invoices_created_at" ON "invoices" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_invoices_deleted_at" ON "invoices" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_invoices_invoice_number" ON "invoices" USING btree ("invoice_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_invoices_order_id" ON "invoices" USING btree ("order_id" uuid_ops) WHERE (order_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_invoices_sent_at" ON "invoices" USING btree ("sent_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_invoices_team_id" ON "invoices" USING btree ("team_id" uuid_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_invoices_unpaid" ON "invoices" USING btree ("due_date" enum_ops,"status" timestamptz_ops) WHERE (status = ANY (ARRAY['pending'::invoice_status, 'overdue'::invoice_status]));--> statement-breakpoint
CREATE INDEX "invoices_team_id_idx" ON "invoices" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "bank_statements_team_idx" ON "bank_statements" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_comm_outbox_status" ON "communication_outbox" USING btree ("status" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_outbox_team_client" ON "communication_outbox" USING btree ("team_id" text_ops,"client_message_id" text_ops) WHERE (client_message_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "users_on_team_team_id_idx" ON "users_on_team" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "users_on_team_user_id_idx" ON "users_on_team" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_invites_team_id_idx" ON "user_invites" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "whatsapp_contacts_team_idx" ON "whatsapp_contacts" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "instagram_contacts_team_idx" ON "instagram_contacts" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "activities_team_idx" ON "activities" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notification_settings_user_team_idx" ON "notification_settings" USING btree ("user_id" uuid_ops,"team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "bank_statement_lines_statement_idx" ON "bank_statement_lines" USING btree ("statement_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "appointments_team_start_idx" ON "appointments" USING btree ("team_id" timestamptz_ops,"start_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "communication_templates_team_idx" ON "communication_templates" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_client_id" ON "documents" USING btree ("client_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_created_at" ON "documents" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_deleted_at" ON "documents" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_invoice_id" ON "documents" USING btree ("invoice_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_name" ON "documents" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_order_id" ON "documents" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_path" ON "documents" USING btree ("path_tokens" array_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_tags" ON "documents" USING btree ("tags" array_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_team_id" ON "documents" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_categories_parent_id" ON "transaction_categories" USING btree ("parent_id" uuid_ops) WHERE (parent_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_transaction_categories_slug" ON "transaction_categories" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_categories_system" ON "transaction_categories" USING btree ("system" bool_ops) WHERE (system = true);--> statement-breakpoint
CREATE INDEX "idx_transaction_categories_team_id" ON "transaction_categories" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_tags_name" ON "tags" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tags_team_id" ON "tags" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_tags_tag_id" ON "transaction_tags" USING btree ("tag_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_tags_team_id" ON "transaction_tags" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_tags_team_transaction_tag" ON "transaction_tags" USING btree ("team_id" uuid_ops,"transaction_id" uuid_ops,"tag_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_tags_transaction_id" ON "transaction_tags" USING btree ("transaction_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_assigned_id" ON "transactions" USING btree ("assigned_id" uuid_ops) WHERE (assigned_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_transactions_category_slug" ON "transactions" USING btree ("category_slug" text_ops) WHERE (category_slug IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_transactions_client_id" ON "transactions" USING btree ("client_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("transaction_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_deleted_at" ON "transactions" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_description_trigram" ON "transactions" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_fts" ON "transactions" USING gin ("fts_vector" tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_internal_id" ON "transactions" USING btree ("internal_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_invoice_id" ON "transactions" USING btree ("invoice_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_name_trigram" ON "transactions" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_order_id" ON "transactions" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_team_date" ON "transactions" USING btree ("team_id" uuid_ops,"date" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_team_deleted_date" ON "transactions" USING btree ("team_id" timestamptz_ops,"deleted_at" uuid_ops,"transaction_date" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_team_id" ON "transactions" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_team_pagination" ON "transactions" USING btree ("team_id" uuid_ops,"date" date_ops,"id" date_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_transactions_team_status_date" ON "transactions" USING btree ("team_id" enum_ops,"status" date_ops,"date" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_team_type_date" ON "transactions" USING btree ("team_id" uuid_ops,"type" uuid_ops,"date" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_transaction_date" ON "transactions" USING btree ("transaction_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "transactions" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "transactions_team_id_idx" ON "transactions" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_attachments_checksum" ON "transaction_attachments" USING btree ("checksum" text_ops) WHERE (checksum IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_transaction_attachments_team_id" ON "transaction_attachments" USING btree ("team_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_attachments_transaction_id" ON "transaction_attachments" USING btree ("transaction_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transaction_attachments_type" ON "transaction_attachments" USING btree ("type" text_ops) WHERE (type IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_transaction_attachments_uploaded_by" ON "transaction_attachments" USING btree ("uploaded_by" uuid_ops) WHERE (uploaded_by IS NOT NULL);--> statement-breakpoint
CREATE VIEW "public"."transactions_income" AS (SELECT t.id, t.order_id, t.invoice_id, t.client_id, t.transaction_number, t.type, t.category, t.amount, t.currency, t.payment_method, t.payment_reference, t.description, t.notes, t.transaction_date, t.due_date, t.status, t.created_at, t.updated_at, t.deleted_at, t.team_id, c.name AS client_name, o.order_number, i.invoice_number FROM transactions t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN orders o ON t.order_id = o.id LEFT JOIN invoices i ON t.invoice_id = i.id WHERE t.type = 'payment'::transaction_type AND t.status = 'completed'::transaction_status AND t.deleted_at IS NULL);--> statement-breakpoint
CREATE VIEW "public"."financial_summary" AS (SELECT date_trunc('month'::text, transaction_date) AS month, sum( CASE WHEN type = 'payment'::transaction_type AND status = 'completed'::transaction_status THEN amount ELSE 0::numeric END) AS total_income, sum( CASE WHEN type = 'expense'::transaction_type AND status = 'completed'::transaction_status THEN amount ELSE 0::numeric END) AS total_expenses, sum( CASE WHEN type = 'payment'::transaction_type AND status = 'completed'::transaction_status THEN amount WHEN type = 'expense'::transaction_type AND status = 'completed'::transaction_status THEN - amount ELSE 0::numeric END) AS net_profit FROM transactions WHERE deleted_at IS NULL GROUP BY (date_trunc('month'::text, transaction_date)) ORDER BY (date_trunc('month'::text, transaction_date)) DESC);--> statement-breakpoint
CREATE VIEW "public"."transactions_expenses" AS (SELECT t.id, t.order_id, t.invoice_id, t.client_id, t.transaction_number, t.type, t.category, t.amount, t.currency, t.payment_method, t.payment_reference, t.description, t.notes, t.transaction_date, t.due_date, t.status, t.created_at, t.updated_at, t.deleted_at, t.team_id, c.name AS client_name FROM transactions t LEFT JOIN clients c ON t.client_id = c.id WHERE t.type = 'expense'::transaction_type AND t.status = 'completed'::transaction_status AND t.deleted_at IS NULL);--> statement-breakpoint
CREATE POLICY "Allow all operations for service role" ON "clients" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "clients_select" ON "clients" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "Allow all operations for service role" ON "orders" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "orders_select" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "Allow all operations for service role" ON "measurements" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "measurements_select" ON "measurements" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "comm_accounts_rw" ON "communication_accounts" AS PERMISSIVE FOR ALL TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user()))) WITH CHECK ((team_id = ANY (private.get_teams_for_authenticated_user())));--> statement-breakpoint
CREATE POLICY "comm_threads_rw" ON "communication_threads" AS PERMISSIVE FOR ALL TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user()))) WITH CHECK ((team_id = ANY (private.get_teams_for_authenticated_user())));--> statement-breakpoint
CREATE POLICY "comm_messages_rw" ON "communication_messages" AS PERMISSIVE FOR ALL TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user()))) WITH CHECK ((team_id = ANY (private.get_teams_for_authenticated_user())));--> statement-breakpoint
CREATE POLICY "Enable insert for users based on user_id" ON "users" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = id));--> statement-breakpoint
CREATE POLICY "users_select_self" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "users_update_self" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "team_transaction_allocations_all" ON "transaction_allocations" AS PERMISSIVE FOR ALL TO public USING (((EXISTS ( SELECT 1
   FROM (transactions t
     JOIN users_on_team u ON ((u.team_id = t.team_id)))
  WHERE ((t.id = transaction_allocations.transaction_id) AND (u.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (invoices i
     JOIN users_on_team u ON ((u.team_id = i.team_id)))
  WHERE ((i.id = transaction_allocations.invoice_id) AND (u.user_id = auth.uid())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM (transactions t
     JOIN users_on_team u ON ((u.team_id = t.team_id)))
  WHERE ((t.id = transaction_allocations.transaction_id) AND (u.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (invoices i
     JOIN users_on_team u ON ((u.team_id = i.team_id)))
  WHERE ((i.id = transaction_allocations.invoice_id) AND (u.user_id = auth.uid()))))));--> statement-breakpoint
CREATE POLICY "Allow all operations for service role" ON "invoices" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "invoices_select" ON "invoices" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "msg_attachments_rw" ON "message_attachments" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM communication_messages m
  WHERE ((m.id = message_attachments.message_id) AND (m.team_id = ANY (private.get_teams_for_authenticated_user())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM communication_messages m
  WHERE ((m.id = message_attachments.message_id) AND (m.team_id = ANY (private.get_teams_for_authenticated_user()))))));--> statement-breakpoint
CREATE POLICY "bank_statements_rw" ON "bank_statements" AS PERMISSIVE FOR ALL TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user()))) WITH CHECK ((team_id = ANY (private.get_teams_for_authenticated_user())));--> statement-breakpoint
CREATE POLICY "comm_outbox_rw" ON "communication_outbox" AS PERMISSIVE FOR ALL TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user()))) WITH CHECK ((team_id = ANY (private.get_teams_for_authenticated_user())));--> statement-breakpoint
CREATE POLICY "team_message_delivery_all" ON "message_delivery" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (communication_messages m
     JOIN users_on_team u ON ((u.team_id = m.team_id)))
  WHERE ((m.id = message_delivery.message_id) AND (u.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (communication_messages m
     JOIN users_on_team u ON ((u.team_id = m.team_id)))
  WHERE ((m.id = message_delivery.message_id) AND (u.user_id = auth.uid())))));--> statement-breakpoint
CREATE POLICY "users_on_team_rw" ON "users_on_team" AS PERMISSIVE FOR ALL TO "authenticated" USING (((team_id = ANY (private.get_teams_for_authenticated_user())) OR (user_id = auth.uid()))) WITH CHECK (((team_id = ANY (private.get_teams_for_authenticated_user())) OR (user_id = auth.uid())));--> statement-breakpoint
CREATE POLICY "user_invites_select_by_email" ON "user_invites" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.jwt() ->> 'email'::text) = email));--> statement-breakpoint
CREATE POLICY "user_invites_team_rw" ON "user_invites" AS PERMISSIVE FOR ALL TO "authenticated";--> statement-breakpoint
CREATE POLICY "team_whatsapp_contacts_all" ON "whatsapp_contacts" AS PERMISSIVE FOR ALL TO public USING ((team_id IN ( SELECT users_on_team.team_id
   FROM users_on_team
  WHERE (users_on_team.user_id = auth.uid())))) WITH CHECK ((team_id IN ( SELECT users_on_team.team_id
   FROM users_on_team
  WHERE (users_on_team.user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "team_instagram_contacts_all" ON "instagram_contacts" AS PERMISSIVE FOR ALL TO public USING ((team_id IN ( SELECT users_on_team.team_id
   FROM users_on_team
  WHERE (users_on_team.user_id = auth.uid())))) WITH CHECK ((team_id IN ( SELECT users_on_team.team_id
   FROM users_on_team
  WHERE (users_on_team.user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "activities_rw" ON "activities" AS PERMISSIVE FOR ALL TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user()))) WITH CHECK ((team_id = ANY (private.get_teams_for_authenticated_user())));--> statement-breakpoint
CREATE POLICY "notif_rw" ON "notification_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (((user_id = auth.uid()) AND (team_id = ANY (private.get_teams_for_authenticated_user())))) WITH CHECK (((user_id = auth.uid()) AND (team_id = ANY (private.get_teams_for_authenticated_user()))));--> statement-breakpoint
CREATE POLICY "bank_statement_lines_rw" ON "bank_statement_lines" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM bank_statements s
  WHERE ((s.id = bank_statement_lines.statement_id) AND (s.team_id = ANY (private.get_teams_for_authenticated_user())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM bank_statements s
  WHERE ((s.id = bank_statement_lines.statement_id) AND (s.team_id = ANY (private.get_teams_for_authenticated_user()))))));--> statement-breakpoint
CREATE POLICY "bank_statement_allocations_rw" ON "bank_statement_allocations" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (bank_statement_lines l
     JOIN bank_statements s ON ((s.id = l.statement_id)))
  WHERE ((l.id = bank_statement_allocations.line_id) AND (s.team_id = ANY (private.get_teams_for_authenticated_user())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (bank_statement_lines l
     JOIN bank_statements s ON ((s.id = l.statement_id)))
  WHERE ((l.id = bank_statement_allocations.line_id) AND (s.team_id = ANY (private.get_teams_for_authenticated_user()))))));--> statement-breakpoint
CREATE POLICY "appointments_rw" ON "appointments" AS PERMISSIVE FOR ALL TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user()))) WITH CHECK ((team_id = ANY (private.get_teams_for_authenticated_user())));--> statement-breakpoint
CREATE POLICY "comm_templates_rw" ON "communication_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user()))) WITH CHECK ((team_id = ANY (private.get_teams_for_authenticated_user())));--> statement-breakpoint
CREATE POLICY "transactions_select" ON "transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((team_id = ANY (private.get_teams_for_authenticated_user())));
*/