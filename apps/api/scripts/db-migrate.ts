// Applies the SQL migrations in src/db/migrations (sorted by file name, id = file name without .sql) to DATABASE_URL,
// using the forward-only runner of src/db/migrate.ts. Already applied migrations are skipped.
//   npm run db:migrate
import fs from 'fs';
import path from 'path';
import { createDb } from '../src/db/client';
import { migrate } from '../src/db/migrate';

const dir = path.join(__dirname, '../src/db/migrations');

async function main() {
  const migrations = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
    .map((f) => ({ id: f.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(dir, f), 'utf8') }));
  const db = createDb();
  try {
    const applied = await migrate(db, migrations);
    console.log(applied.length ? `applied: ${applied.join(', ')}` : 'nothing to apply');
  } finally {
    db.close();
  }
}

main().catch((e) => { console.error(`migration failed: ${e instanceof Error ? e.message : e}`); process.exit(1); });
