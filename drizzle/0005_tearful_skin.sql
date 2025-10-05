CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"path_tokens" text[],
	"mime_type" text,
	"size" integer,
	"tags" text[] DEFAULT ARRAY[]::text[],
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
ALTER TABLE "documents" ADD CONSTRAINT "documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documents_team_id" ON "documents" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_documents_name" ON "documents" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_documents_path" ON "documents" USING btree ("path_tokens");--> statement-breakpoint
CREATE INDEX "idx_documents_tags" ON "documents" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "idx_documents_order_id" ON "documents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_documents_invoice_id" ON "documents" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_documents_client_id" ON "documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_documents_created_at" ON "documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_documents_deleted_at" ON "documents" USING btree ("deleted_at");