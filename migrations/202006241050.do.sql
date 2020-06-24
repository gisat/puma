CREATE INDEX "logged_actions_resource_idx" ON "audit"."logged_actions" ("schema_name", "table_name");
CREATE INDEX "user_permissions_resource_idx" ON "user"."permissions" ("resourceType", "resourceKey");
