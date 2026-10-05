import { defineConfig } from "drizzle-kit";

// Used only to regenerate lib/db/schema.ts from the live database after a
// new migration:  npm run db:pull
// Migrations themselves are plain SQL in db/migrations (npm run db:migrate).
export default defineConfig({
  dialect: "postgresql",
  out: "./lib/db/generated",
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ["public"],
  tablesFilter: ["!schema_migrations"],
  // Keep column names as-is (snake_case), matching the rest of the code.
  introspect: { casing: "preserve" },
});
