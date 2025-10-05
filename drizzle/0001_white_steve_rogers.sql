ALTER TABLE "clients" DROP CONSTRAINT "clients_notion_page_id_unique";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_notion_page_id_unique";--> statement-breakpoint
ALTER TABLE "measurements" DROP CONSTRAINT "measurements_notion_page_id_unique";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_notion_page_id_unique";--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "phone" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "invoice_number" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "measurements" ALTER COLUMN "record_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_number" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
CREATE INDEX "idx_clients_email" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_invoices_invoice_number" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "idx_invoices_created_at" ON "invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_measurements_taken_at" ON "measurements" USING btree ("taken_at");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "notion_page_id";--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "notion_page_id";--> statement-breakpoint
ALTER TABLE "measurements" DROP COLUMN "notion_page_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "notion_page_id";