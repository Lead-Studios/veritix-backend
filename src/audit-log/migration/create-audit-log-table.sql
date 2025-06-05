-- Migration: Create Audit Log Table

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "type" VARCHAR NOT NULL,
  "user_id" UUID,
  "admin_id" UUID,
  "metadata" JSONB,
  "ip_address" VARCHAR,
  "user_agent" VARCHAR,
  "description" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  CONSTRAINT "FK_audit_log_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_audit_log_admin" FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "IDX_audit_log_type" ON "audit_log" ("type");
CREATE INDEX IF NOT EXISTS "IDX_audit_log_user_id" ON "audit_log" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_audit_log_admin_id" ON "audit_log" ("admin_id");
CREATE INDEX IF NOT EXISTS "IDX_audit_log_created_at" ON "audit_log" ("created_at");
