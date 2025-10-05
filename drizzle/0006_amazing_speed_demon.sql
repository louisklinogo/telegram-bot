ALTER TABLE "measurements" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "measurement_group_id" uuid;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "previous_version_id" uuid;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_previous_version_id_measurements_id_fk" FOREIGN KEY ("previous_version_id") REFERENCES "public"."measurements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_measurements_group_id" ON "measurements" USING btree ("measurement_group_id");--> statement-breakpoint
CREATE INDEX "idx_measurements_client_active" ON "measurements" USING btree ("client_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_measurements_tags" ON "measurements" USING btree ("tags");