import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const root = process.cwd();
const csvDir = path.resolve(root, 'csv');
const dbFile = path.resolve(root, 'server', 'db.json');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, {});
await db.read();
db.data ||= {};

const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));

const nameToTable = (filename) => filename.replace(/_rows\.csv$/, '').replace(/-/g, '_');

const coerce = (val) => {
  if (val === '') return null;
  const t = val.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (!Number.isNaN(Number(t)) && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try { return JSON.parse(t); } catch { return t; }
  }
  return val;
};

for (const file of files) {
  const full = path.join(csvDir, file);
  const content = fs.readFileSync(full, 'utf8');
  const rows = parse(content, { columns: true, skip_empty_lines: true });
  const table = nameToTable(file);
  db.data[table] = rows.map(r => {
    const obj = {};
    for (const [k, v] of Object.entries(r)) obj[k] = coerce(v);
    return obj;
  });
  console.log(`Imported ${rows.length} rows into ${table}`);
}

await db.write();
console.log(`Database written to ${dbFile}`);

