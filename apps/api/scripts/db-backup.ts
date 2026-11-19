// Writes a SQL dump (schema and rows) of DATABASE_URL to backups/<UTC timestamp>.sql. Restore by running the file on an
// empty database. Never prints the connection settings.
//   npm run db:backup
import fs from 'fs';
import path from 'path';
import { createDb } from '../src/db/client';

const quote = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (v instanceof ArrayBuffer) return `X'${Buffer.from(v).toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

async function main() {
  const db = createDb();
  try {
    const objects = (await db.execute(
      "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' AND name NOT LIKE 'libsql_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name"
    )).rows;
    const lines = [`-- backup ${new Date().toISOString()}`, 'PRAGMA foreign_keys = OFF;', 'BEGIN;'];
    let rows = 0;
    for (const o of objects.filter((x) => x.type === 'table')) {
      lines.push(`${o.sql};`);
      const data = await db.execute(`SELECT * FROM "${String(o.name)}"`);
      for (const r of data.rows) {
        lines.push(`INSERT INTO "${String(o.name)}" (${data.columns.map((c) => `"${c}"`).join(', ')}) VALUES (${data.columns.map((c) => quote(r[c])).join(', ')});`);
        rows++;
      }
    }
    for (const o of objects.filter((x) => x.type !== 'table')) lines.push(`${o.sql};`);
    lines.push('COMMIT;', '');
    const out = path.join(__dirname, '../backups', `${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, lines.join('\n'));
    console.log(`backup written: ${path.relative(process.cwd(), out)} (${objects.filter((x) => x.type === 'table').length} tables, ${rows} rows)`);
  } finally {
    db.close();
  }
}

main().catch((e) => { console.error(`backup failed: ${e instanceof Error ? e.message : e}`); process.exit(1); });
