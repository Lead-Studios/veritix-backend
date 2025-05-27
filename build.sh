#!/bin/bash

echo "🔧 Running migration:generate..."

MIGRATION_OUTPUT=$(npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate -d ./src/data-source.ts src/migrations/InitialMigration 2>&1)

echo "$MIGRATION_OUTPUT"

if echo "$MIGRATION_OUTPUT" | grep -q "No changes in database schema were found"; then
  echo "✅ No new migrations to generate. Skipping migration:run."
else
  echo "✅ Migration generated. Running migration:run..."
  npm run migration:run
fi

echo "🚀 Starting app..."
node dist/src/main
