import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 4000;
function fastHash(pwd) {
  return crypto.createHash('sha256').update(String(pwd)).digest('hex');
}
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || '1';

app.use(cors({ origin: true, credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const dbFile = path.resolve('server', 'db.json');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [], characters: [], diaries: [], diary_pages: [], dice_rolls: [], user_roles: [] });
await db.read();
db.data ||= { users: [], characters: [], diaries: [], diary_pages: [], dice_rolls: [], user_roles: [] };
[
  'users',
  'characters',
  'diaries',
  'diary_pages',
  'dice_rolls',
  'user_roles',
  'glossary_sections',
  'glossary_entries',
  'enemies',
  'anomalies',
  'damage_effects',
  'materials',
  'weapon_types',
  'spells',
  'abilities',
  'magic_quivers',
  'evocations',
  'roll_history',
  'purchase_history',
  'profiles',
].forEach(k => {
  db.data[k] = Array.isArray(db.data[k]) ? db.data[k] : [];
});
// Write helpers must be defined before any seed uses them
const originalWrite = db.write.bind(db);
function safeWriteAsync(tag) {
  originalWrite().catch((e) => {
    console.error(`[DB WRITE FAILED] ${tag}`, e);
  });
}

function normalizeStatsModifier(obj) {
  const src = (obj && typeof obj === 'object') ? obj : {};
  return {
    forza: Number(src.forza ?? 0) || 0,
    percezione: Number(src.percezione ?? 0) || 0,
    resistenza: Number(src.resistenza ?? 0) || 0,
    intelletto: Number(src.intelletto ?? 0) || 0,
    agilita: Number(src.agilita ?? 0) || 0,
    sapienza: Number(src.sapienza ?? 0) || 0,
    anima: Number(src.anima ?? 0) || 0,
  };
}

function normalizeAnomalyRow(row) {
  const r = (row && typeof row === 'object') ? row : {};
  const statsRaw = r.stats;
  const statsObj = (statsRaw && typeof statsRaw === 'object' && !Array.isArray(statsRaw)) ? statsRaw : {};
  const damageSetsRaw = Array.isArray(statsObj.damage_sets) ? statsObj.damage_sets : [];
  const damageSets = damageSetsRaw
    .map((ds) => {
      const d = (ds && typeof ds === 'object') ? ds : {};
      const damageEffectId = d.damageEffectId ?? d.damage_effect_id ?? d.id ?? '';
      const guaranteedDamage = d.guaranteedDamage ?? d.guaranteed_damage ?? d.damagePerTurn ?? d.damage_per_turn ?? 0;
      const additionalDamage = d.additionalDamage ?? d.additional_damage ?? 0;
      return {
        ...(damageEffectId ? { damageEffectId: String(damageEffectId) } : {}),
        guaranteedDamage: Number(guaranteedDamage ?? 0) || 0,
        additionalDamage: Number(additionalDamage ?? 0) || 0,
        ...(d.effectName ? { effectName: String(d.effectName) } : {}),
      };
    })
    .filter((ds) => String(ds?.damageEffectId || '').trim() || Number(ds?.guaranteedDamage || 0) || Number(ds?.additionalDamage || 0));

  const legacyDoesDamage = !!(r.does_damage ?? r.doesDamage);
  const legacyPerTurn = Number(r.damage_per_turn ?? r.damagePerTurn ?? 0) || 0;
  const legacyEffectId = r.damage_effect_id ?? r.damageEffectId ?? null;
  const legacyNeedsBackfill = legacyDoesDamage && damageSets.length === 0 && (legacyPerTurn !== 0 || legacyEffectId);
  const nextDamageSets = legacyNeedsBackfill
    ? [{
        ...(legacyEffectId ? { damageEffectId: String(legacyEffectId) } : {}),
        guaranteedDamage: legacyPerTurn,
        additionalDamage: 0,
      }]
    : damageSets;

  const nextStats = {
    ...statsObj,
    stats_modifier: normalizeStatsModifier(statsObj.stats_modifier ?? statsObj.statsModifier),
    damage_sets: nextDamageSets,
  };

  const next = { ...r, stats: nextStats };
  if (next.modifies_stats == null) {
    next.modifies_stats = Object.values(nextStats.stats_modifier || {}).some((v) => (Number(v || 0) || 0) !== 0);
  }
  return next;
}

function normalizePhasesForLevel(level) {
  const src = (level && typeof level === 'object') ? level : {};
  const legacyPhases = (() => {
    const out = [];
    for (let i = 1; i <= 10; i++) {
      const enabled = src[`phase${i}_enabled`];
      if (!enabled) continue;
      out.push({
        phase_number: i,
        name: src[`phase${i}_name`] ?? `Fase ${i}`,
        enabled: true,
        effects: src[`phase${i}_effects`] ?? [],
        guaranteed_damage: src[`phase${i}_guaranteed_damage`],
        additional_damage: src[`phase${i}_additional_damage`],
        damage_values: src[`phase${i}_damage_values`],
        percentage_damage_values: src[`phase${i}_percentage_damage_values`],
        action_cost: src[`phase${i}_action_cost`] ?? src[`phase${i}_punti_azione`],
        chain_targets: src[`phase${i}_chain_targets`],
        conditional_additional_damage: src[`phase${i}_conditional_additional_damage`],
      });
    }
    return out;
  })();

  const rawPhases = Array.isArray(src.phases) ? src.phases.filter(Boolean) : [];
  const basePhases = rawPhases.length > 0 ? rawPhases : legacyPhases;
  const phases = (basePhases || [])
    .filter(Boolean)
    .map((p, idx) => {
      const phase = (p && typeof p === 'object') ? p : {};
      const phaseNumber =
        Number(phase.phase_number ?? phase.phaseNumber ?? phase.phaseIndex ?? phase.number ?? phase.index ?? (idx + 1)) || (idx + 1);
      const enabled = phase.enabled ?? phase.phase_enabled ?? phase.is_enabled;
      const name = phase.name ?? phase.phase_name ?? phase.phaseName;
      return {
        ...phase,
        phase_number: phaseNumber,
        name: String((name == null || String(name).trim() === '') ? `Fase ${phaseNumber}` : name),
        ...(enabled == null ? {} : { enabled: !!enabled }),
      };
    })
    .sort((a, b) => (Number(a?.phase_number ?? 0) || 0) - (Number(b?.phase_number ?? 0) || 0));

  const next = { ...src, phases };
  Object.keys(next).forEach((k) => {
    if (/^phase\d+_/.test(k)) delete next[k];
  });
  if (phases.length > 0 && next.phase_attack_enabled == null) next.phase_attack_enabled = true;
  return next;
}

function normalizePhasesForRow(row) {
  const src = (row && typeof row === 'object') ? row : {};
  if (Array.isArray(src.levels)) {
    const levels = src.levels.map((l) => normalizePhasesForLevel(l));
    return { ...src, levels };
  }
  return normalizePhasesForLevel(src);
}

try {
  let changed = false;

  const nextAnomalies = (db.data.anomalies || []).map((r) => {
    const next = normalizeAnomalyRow(r);
    if (next !== r) changed = true;
    return next;
  });
  db.data.anomalies = nextAnomalies;

  const nextEnemies = (db.data.enemies || []).map((e) => {
    const src = (e && typeof e === 'object') ? e : {};
    const enemyAnoms = src.enemy_anomalies ?? src.enemyAnomalies ?? src.anomalies;
    const next = {
      ...src,
      enemy_anomalies: Array.isArray(enemyAnoms) ? enemyAnoms : [],
    };
    if (!Array.isArray(enemyAnoms)) changed = true;
    return next;
  });
  db.data.enemies = nextEnemies;

  const nextSpells = (db.data.spells || []).map((r) => {
    const next = normalizePhasesForRow(r);
    if (JSON.stringify(next) !== JSON.stringify(r)) changed = true;
    return next;
  });
  db.data.spells = nextSpells;

  const nextAbilities = (db.data.abilities || []).map((r) => {
    const next = normalizePhasesForRow(r);
    if (JSON.stringify(next) !== JSON.stringify(r)) changed = true;
    return next;
  });
  db.data.abilities = nextAbilities;

  if (changed) safeWriteAsync('migrate.normalize_phases');
} catch (e) {
  console.error('[MIGRATE ERROR]', e);
}
if ((db.data.users?.length || 0) === 0 && process.env.SEED_ADMIN !== 'false') {
  const admin = { id: nanoid(), email: 'admin@local', password_hash: fastHash(DEFAULT_PASSWORD), username: 'admin', created_at: new Date().toISOString() };
  db.data.users.push(admin);
  db.data.user_roles.push({ id: nanoid(), user_id: admin.id, role: 'admin', created_at: new Date().toISOString() });
  safeWriteAsync('seed_admin');
  console.log('[SEED] created default admin admin@local / admin');
}
// Seed additional users if present
try {
  const seedUsersFile = path.resolve('server', 'seed-users.json');
  if (fs.existsSync(seedUsersFile)) {
    const raw = fs.readFileSync(seedUsersFile, 'utf8');
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      list.forEach(u => {
        const email = String(u.email || '').trim().toLowerCase();
        if (!email) return;
        const exists = db.data.users.find(x => x.email === email);
        if (!exists) {
          const user = { id: nanoid(), email, username: (u.username || null), password_hash: fastHash(DEFAULT_PASSWORD), created_at: new Date().toISOString() };
          db.data.users.push(user);
        }
      });
      safeWriteAsync('seed_users');
      console.log(`[SEED] ensured ${list.length} users from seed-users.json`);

      // Migrate associations: link characters and roles from profiles.display_name
      const byEmail = new Map((db.data.users || []).map(u => [u.email, u]));
      let migratedChars = 0;
      let migratedRoles = 0;
      (list || []).forEach(u => {
        const username = String(u.username || '').trim();
        const email = String(u.email || '').trim().toLowerCase();
        if (!username || !email) return;
        const profile = (db.data.profiles || []).find(p => String(p.display_name).trim().toLowerCase() === username.toLowerCase());
        const newUser = byEmail.get(email);
        if (profile && newUser) {
          console.log(`[MIGRATE] match username='${username}' email='${email}' oldId='${profile.user_id}' newId='${newUser.id}'`);
          const oldId = profile.user_id;
          // characters
          (db.data.characters || []).forEach(c => {
            if (c.user_id === oldId) { c.user_id = newUser.id; migratedChars++; }
          });
          // purchase_history
          (db.data.purchase_history || []).forEach(ph => { if (ph.user_id === oldId) ph.user_id = newUser.id; });
          // user_roles
          (db.data.user_roles || []).forEach(r => { if (r.user_id === oldId) { r.user_id = newUser.id; migratedRoles++; } });
        }
      });
      if (migratedChars || migratedRoles) {
        safeWriteAsync('migrate_associations');
        console.log(`[MIGRATE] characters reassociated: ${migratedChars}, roles reassociated: ${migratedRoles}`);
      }
    }
  }
} catch (e) {
  console.error('[SEED USERS ERROR]', e);
}
db.data.users = (db.data.users || []).map(u => ({ ...u, email: String(u.email || '').trim().toLowerCase(), password_hash: u.password_hash || fastHash(DEFAULT_PASSWORD) }));
safeWriteAsync('ensure_default_passwords');
// Ensure admin user uses default password too
try {
  const adminRoles = (db.data.user_roles || []).filter(r => r.role === 'admin');
  const ids = adminRoles.map(r => r.user_id);
  (db.data.users || []).forEach(u => {
    if (ids.includes(u.id)) u.password_hash = fastHash(DEFAULT_PASSWORD);
  });
  if (ids.length) safeWriteAsync('ensure_admin_default_password');
} catch {}

// Static uploads
const uploadsDir = path.resolve('server', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Characters
function isAdminUserId(userId) {
  if (!userId) return false;
  return Array.isArray(db.data.user_roles) && db.data.user_roles.some(r => r.user_id === userId && r.role === 'admin');
}
function canReadCharacter(userId, character) {
  if (!character) return false;
  if (character.is_public === true) return true;
  if (!userId) return false;
  return isAdminUserId(userId) || String(character.user_id) === String(userId);
}

const characterClients = new Set();
function broadcastCharacters(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  characterClients.forEach(res => res.write(data));
}

app.get('/api/characters', (req, res) => {
  const reqUserId = String(req.query.user_id || '').trim();
  const items = db.data.characters || [];
  if (isAdminUserId(reqUserId)) {
    return res.json(items);
  }
  if (reqUserId) {
    return res.json(items.filter(c => String(c.user_id) === reqUserId));
  }
  return res.json(items.filter(c => c?.is_public === true));
});
app.get('/api/characters/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');
  characterClients.add(res);
  req.on('close', () => characterClients.delete(res));
});
app.get('/api/characters/:id', (req, res) => {
  const item = db.data.characters.find(c => c.id === req.params.id);
  if (!item) return res.status(404).end();
  const reqUserId = String(req.query.user_id || '').trim();
  if (!canReadCharacter(reqUserId, item)) return res.status(403).json({ error: 'Forbidden' });
  return res.json(item);
});
app.post('/api/characters', async (req, res) => {
  const now = new Date().toISOString();
  const row = { id: nanoid(), ...req.body, created_at: now, updated_at: now };
  db.data.characters.unshift(row);
  safeWriteAsync('characters.insert');
  broadcastCharacters({ type: 'INSERT', new: row });
  return res.json(row);
});
app.put('/api/characters/:id', async (req, res) => {
  const idx = db.data.characters.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).end();
  db.data.characters[idx] = { ...db.data.characters[idx], ...req.body, updated_at: new Date().toISOString() };
  safeWriteAsync('characters.update');
  broadcastCharacters({ type: 'UPDATE', new: db.data.characters[idx] });
  return res.json({ ok: true });
});
app.delete('/api/characters/:id', async (req, res) => {
  const oldRow = db.data.characters.find(c => c.id === req.params.id) || null;
  db.data.characters = db.data.characters.filter(c => c.id !== req.params.id);
  safeWriteAsync('characters.delete');
  if (oldRow) broadcastCharacters({ type: 'DELETE', old: oldRow });
  return res.json({ ok: true });
});

// Diaries
function canReadDiary(userId, diary) {
  if (!diary) return false;
  if (diary.is_public === true) return true;
  if (!userId) return false;
  return isAdminUserId(userId) || String(diary.owner_id) === String(userId);
}
function canWriteDiary(userId, diary) {
  if (!diary || !userId) return false;
  return isAdminUserId(userId) || String(diary.owner_id) === String(userId);
}

app.get('/api/diaries', (req, res) => {
  const reqUserId = String(req.query.user_id || '').trim();
  let items = [...(db.data.diaries || [])];
  Object.entries(req.query).forEach(([k, v]) => {
    if (k === 'user_id') return;
    if (k.startsWith('eq_')) {
      const field = k.slice(3);
      items = items.filter(it => String(it?.[field]) === String(v));
      return;
    }
    if (k.startsWith('in_')) {
      const field = k.slice(3);
      const list = Array.isArray(v) ? v : String(v).split(',');
      items = items.filter(it => list.includes(String(it?.[field])));
      return;
    }
    if (k.startsWith('ilike_')) {
      const field = k.slice(6);
      const needle = String(v).toLowerCase().replace(/%/g, '');
      items = items.filter(it => String(it?.[field] || '').toLowerCase().includes(needle));
    }
  });

  if (isAdminUserId(reqUserId)) return res.json(items);
  if (reqUserId) return res.json(items.filter(d => d?.is_public === true || String(d?.owner_id) === String(reqUserId)));
  return res.json(items.filter(d => d?.is_public === true));
});
app.get('/api/diaries/:id', (req, res) => {
  const reqUserId = String(req.query.user_id || '').trim();
  const diary = db.data.diaries.find(d => d.id === req.params.id);
  if (!diary) return res.status(404).end();
  if (!canReadDiary(reqUserId, diary)) return res.status(403).json({ error: 'Forbidden' });
  return res.json(diary);
});
app.get('/api/diary_pages', (req, res) => {
  const reqUserId = String(req.query.user_id || '').trim();
  const { diary_id } = req.query;
  if (!diary_id) return res.status(400).json({ error: 'Missing diary_id' });
  const diary = db.data.diaries.find(d => d.id === diary_id);
  if (!diary) return res.status(404).end();
  if (!canReadDiary(reqUserId, diary)) return res.status(403).json({ error: 'Forbidden' });
  const pages = db.data.diary_pages.filter(p => p.diary_id === diary_id).sort((a, b) => a.page_number - b.page_number);
  return res.json(pages);
});
app.post('/api/diary_pages', async (req, res) => {
  const reqUserId = String(req.query.user_id || '').trim();
  const { diary_id, page_number, content_html, background_color, background_image_url } = req.body;
  if (!diary_id || !page_number) return res.status(400).json({ error: 'Missing diary_id or page_number' });
  const diary = db.data.diaries.find(d => d.id === diary_id);
  if (!diary) return res.status(404).end();
  if (!canWriteDiary(reqUserId, diary)) return res.status(403).json({ error: 'Forbidden' });
  const idx = db.data.diary_pages.findIndex(p => p.diary_id === diary_id && p.page_number === page_number);
  if (idx >= 0) {
    db.data.diary_pages[idx] = { ...db.data.diary_pages[idx], content_html, background_color, background_image_url };
    safeWriteAsync('diary_pages.update');
    return res.json(db.data.diary_pages[idx]);
  }
  const page = { id: nanoid(), diary_id, page_number, content_html, background_color, background_image_url };
  db.data.diary_pages.push(page);
  safeWriteAsync('diary_pages.insert');
  return res.json(page);
});

// Dice rolls + SSE
const clients = new Set();
function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach(res => res.write(data));
}
app.get('/api/dice_rolls', (req, res) => {
  const limit = Number(req.query.limit || 100);
  const items = [...db.data.dice_rolls].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json(items.slice(0, limit));
});
app.post('/api/dice_rolls', async (req, res) => {
  const row = { id: nanoid(), ...req.body, created_at: new Date().toISOString() };
  db.data.dice_rolls.unshift(row);
  safeWriteAsync('dice_rolls.insert');
  broadcast({ type: 'INSERT', new: row });
  return res.json({ ok: true });
});
app.delete('/api/dice_rolls', async (req, res) => {
  const count = db.data.dice_rolls.length;
  db.data.dice_rolls = [];
  safeWriteAsync('dice_rolls.clear');
  broadcast({ type: 'CLEAR', count });
  return res.json({ count });
});
app.get('/api/dice_rolls/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

const rollHistoryClients = new Set();
function broadcastRollHistory(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  rollHistoryClients.forEach(res => res.write(data));
}
app.get('/api/roll_history/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');
  rollHistoryClients.add(res);
  req.on('close', () => rollHistoryClients.delete(res));
});

const enemyClients = new Set();
function broadcastEnemies(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  enemyClients.forEach(res => res.write(data));
}
app.get('/api/enemies/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');
  enemyClients.add(res);
  req.on('close', () => enemyClients.delete(res));
});

// Uploads
app.post('/api/uploads', upload.single('file'), (req, res) => {
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

// Serve frontend build (dist) if present
try {
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { etag: false, lastModified: false, cacheControl: true, maxAge: 0 }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.sendFile(indexFile);
      }
      return next();
    });
  }
} catch {}

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => {
  try {
    const distDir = path.resolve('dist');
    const indexFile = path.join(distDir, 'index.html');
    if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  } catch {}
  return res.type('text/plain').send('Local API running');
});
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}));
app.post('/api/ping', (req, res) => res.json({ ok: true }));
app.get('/favicon.ico', (req, res) => {
  const fav = path.resolve('public', 'favicon.ico');
  if (fs.existsSync(fav)) return res.sendFile(fav);
  return res.status(204).end();
});

// Glossary
function applyListQuery(items, query) {
  let out = [...(items || [])];
  Object.entries(query || {}).forEach(([k, v]) => {
    if (k.startsWith('eq_')) {
      const field = k.slice(3);
      out = out.filter(it => String(it?.[field]) === String(v));
    }
    if (k.startsWith('in_')) {
      const field = k.slice(3);
      const list = Array.isArray(v) ? v : String(v).split(',');
      out = out.filter(it => list.includes(String(it?.[field])));
    }
    if (k.startsWith('ilike_')) {
      const field = k.slice(6);
      const needle = String(v).toLowerCase();
      out = out.filter(it => String(it?.[field] || '').toLowerCase().includes(needle.replace(/%/g, '')));
    }
  });
  const order = query?.order;
  if (order) {
    const [field, dir] = String(order).split(':');
    out.sort((a, b) => (a?.[field] > b?.[field] ? 1 : -1) * (dir === 'desc' ? -1 : 1));
  }
  const limit = query?.limit ? Number(query.limit) : undefined;
  if (limit) out = out.slice(0, limit);
  return out;
}

function normalizeGlossarySection(row) {
  const sort_order = Number(row?.sort_order ?? row?.order ?? 0) || 0;
  const created_at = row?.created_at ?? new Date().toISOString();
  const updated_at = row?.updated_at ?? created_at;
  const created_by = row?.created_by ?? row?.createdBy ?? row?.user_id ?? '';
  return {
    ...(row || {}),
    sort_order,
    created_at,
    updated_at,
    created_by,
  };
}

function normalizeGlossaryEntry(row, db) {
  const term = String(row?.term ?? row?.title ?? row?.name ?? '').trim();
  const baseDefinition = row?.definition ?? row?.content ?? row?.description ?? '';
  const sort_order = Number(row?.sort_order ?? row?.order ?? 0) || 0;
  const created_at = row?.created_at ?? new Date().toISOString();
  const updated_at = row?.updated_at ?? created_at;
  const created_by = row?.created_by ?? row?.createdBy ?? row?.user_id ?? '';

  const isPlaceholder = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return true;
    return s === 'Nessuna descrizione disponibile.' || s.startsWith('Nessuna descrizione disponibile.\n');
  };

  const buildFromSource = () => {
    const sourceType = String(row?.source_type ?? '').trim();
    const sourceId = String(row?.source_id ?? '').trim();
    if (!sourceType || !sourceId) return '';

    if (sourceType === 'damage_effect') {
      const de = (db?.data?.damage_effects || []).find((x) => String(x?.id) === sourceId);
      if (!de) return '';
      const desc = String(de?.description ?? '').trim();
      const affectsList = [];
      const affectsObj = (de?.affects && typeof de.affects === 'object') ? de.affects : null;
      const affectsFlags = affectsObj
        ? {
            actionPoints: !!affectsObj.actionPoints,
            health: !!affectsObj.health,
            armor: !!affectsObj.armor,
            classicDamage: !!affectsObj.classicDamage,
          }
        : {
            actionPoints: !!de?.affects_action_points,
            health: !!de?.affects_health,
            armor: !!de?.affects_armor,
            classicDamage: !!de?.affects_classic_damage,
          };
      if (affectsFlags.actionPoints) affectsList.push('Punti Azione');
      if (affectsFlags.health) affectsList.push('Salute');
      if (affectsFlags.armor) affectsList.push('Armatura');
      if (affectsFlags.classicDamage) affectsList.push('Danno Classico');

      const bonus = Array.isArray(de?.bonusEffects) ? de.bonusEffects : Array.isArray(de?.bonus_effects) ? de.bonus_effects : [];
      const bonusText = bonus.length > 0
        ? `\n\n**Effetti Bonus**:\n${bonus.map((b) => `- ${String(b?.description ?? b?.name ?? JSON.stringify(b))}`).join('\n')}`
        : '';

      const affectsText = affectsList.length > 0 ? `\n\n**Affetta**: ${affectsList.join(', ')}` : '';
      return `${desc || 'Nessuna descrizione disponibile.'}${affectsText}${bonusText}`.trim();
    }

    if (sourceType === 'anomaly') {
      const a = (db?.data?.anomalies || []).find((x) => String(x?.id) === sourceId);
      if (!a) return '';
      const desc = String(a?.description ?? '').trim();
      const turns = Number(a?.turns ?? 0) || 0;

      const stats = (a?.statsModifier && typeof a.statsModifier === 'object') ? a.statsModifier : (a?.stats_modifier && typeof a.stats_modifier === 'object') ? a.stats_modifier : null;
      const nonZeroStats = stats
        ? Object.entries(stats)
            .map(([k, v]) => [k, Number(v) || 0])
            .filter(([, v]) => v !== 0)
        : [];
      const statsText = nonZeroStats.length > 0
        ? `\n\n**Modifiche statistiche**:\n${nonZeroStats.map(([k, v]) => `- ${k}: ${v > 0 ? `+${v}` : v}`).join('\n')}`
        : '';

      const damageSets = Array.isArray(a?.damageSets) ? a.damageSets : Array.isArray(a?.damage_sets) ? a.damage_sets : [];
      const dmgText = damageSets.length > 0
        ? `\n\n**Danni**:\n${damageSets.map((d) => `- ${String(d?.effectName ?? d?.damageEffectName ?? d?.damageEffectId ?? d?.damage_effect_id ?? '')}: ${Number(d?.guaranteedDamage ?? d?.guaranteed_damage ?? 0) || 0} + ${Number(d?.additionalDamage ?? d?.additional_damage ?? 0) || 0}`).join('\n')}`
        : '';

      const durationText = turns > 0 ? `\n\n**Durata**: ${turns} turni` : '';
      return `${desc || 'Nessuna descrizione disponibile.'}${durationText}${statsText}${dmgText}`.trim();
    }

    const raw = { ...(row || {}) };
    delete raw.id;
    delete raw.section_id;
    delete raw.source_id;
    delete raw.source_type;
    delete raw.title;
    delete raw.content;
    delete raw.term;
    delete raw.definition;
    delete raw.created_at;
    delete raw.updated_at;
    return `\`\`\`json\n${JSON.stringify(raw, null, 2)}\n\`\`\``;
  };

  const definition = isPlaceholder(baseDefinition) ? buildFromSource() || String(baseDefinition ?? '') : String(baseDefinition ?? '');
  const related_terms = Array.isArray(row?.related_terms) ? row.related_terms : Array.isArray(row?.tags) ? row.tags : undefined;
  const image_url = row?.image_url ?? row?.imageUrl;

  return {
    ...(row || {}),
    term,
    definition,
    sort_order,
    created_at,
    updated_at,
    created_by,
    ...(related_terms ? { related_terms } : {}),
    ...(image_url != null ? { image_url } : {}),
    ...(row?.title != null ? { title: row.title } : (term ? { title: term } : {})),
    ...(row?.content != null ? { content: row.content } : (definition ? { content: definition } : {})),
  };
}

app.get('/api/glossary_sections', (req, res) => {
  const items = applyListQuery(db.data.glossary_sections || [], req.query).map(normalizeGlossarySection);
  return res.json(items);
});
app.post('/api/glossary_sections', async (req, res) => {
  db.data.glossary_sections = db.data.glossary_sections || [];
  const body = req.body || {};
  const row = {
    id: nanoid(),
    ...body,
    ...(body?.sort_order != null && body?.order == null ? { order: body.sort_order } : {}),
  };
  db.data.glossary_sections.push(row);
  safeWriteAsync('glossary_sections.insert');
  return res.json(normalizeGlossarySection(row));
});
app.put('/api/glossary_sections/:id', async (req, res) => {
  db.data.glossary_sections = db.data.glossary_sections || [];
  const idx = db.data.glossary_sections.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).end();
  const patch = req.body || {};
  db.data.glossary_sections[idx] = {
    ...db.data.glossary_sections[idx],
    ...patch,
    ...(patch?.sort_order != null && patch?.order == null ? { order: patch.sort_order } : {}),
  };
  safeWriteAsync('glossary_sections.update');
  return res.json(normalizeGlossarySection(db.data.glossary_sections[idx]));
});
app.delete('/api/glossary_sections/:id', async (req, res) => {
  db.data.glossary_entries = db.data.glossary_entries || [];
  db.data.glossary_sections = db.data.glossary_sections || [];
  db.data.glossary_entries = db.data.glossary_entries.filter(e => e.section_id !== req.params.id);
  db.data.glossary_sections = db.data.glossary_sections.filter(s => s.id !== req.params.id);
  safeWriteAsync('glossary_sections.delete+entries');
  return res.json({ ok: true });
});
app.get('/api/glossary_entries', (req, res) => {
  const sectionId = req.query?.section_id ?? req.query?.eq_section_id;
  const base = db.data.glossary_entries || [];
  const filtered = sectionId ? base.filter(e => String(e?.section_id) === String(sectionId)) : base;
  const items = applyListQuery(filtered, req.query).map((e) => normalizeGlossaryEntry(e, db));
  return res.json(items);
});
app.post('/api/glossary_entries', async (req, res) => {
  const body = req.body || {};
  const term = body?.term ?? body?.title ?? '';
  const definition = body?.definition ?? body?.content ?? '';
  const entry = {
    id: nanoid(),
    ...body,
    ...(body?.title == null && term != null ? { title: term } : {}),
    ...(body?.content == null && definition != null ? { content: definition } : {}),
  };
  db.data.glossary_entries = db.data.glossary_entries || [];
  db.data.glossary_entries.push(entry);
  safeWriteAsync('glossary_entries.insert');
  return res.json(normalizeGlossaryEntry(entry, db));
});
app.put('/api/glossary_entries/:id', async (req, res) => {
  db.data.glossary_entries = db.data.glossary_entries || [];
  const idx = db.data.glossary_entries.findIndex(e => e.id === req.params.id);
  if (idx < 0) return res.status(404).end();
  const patch = req.body || {};
  const next = { ...db.data.glossary_entries[idx], ...patch };
  if (patch?.term != null && patch?.title == null) next.title = patch.term;
  if (patch?.definition != null && patch?.content == null) next.content = patch.definition;
  db.data.glossary_entries[idx] = next;
  safeWriteAsync('glossary_entries.update');
  return res.json(normalizeGlossaryEntry(db.data.glossary_entries[idx], db));
});
app.delete('/api/glossary_entries/:id', async (req, res) => {
  db.data.glossary_entries = db.data.glossary_entries || [];
  db.data.glossary_entries = db.data.glossary_entries.filter(e => e.id !== req.params.id);
  safeWriteAsync('glossary_entries.delete');
  return res.json({ ok: true });
});

// Generic table endpoints (fallback)
function getTable(table) {
  db.data[table] = db.data[table] || [];
  return db.data[table];
}
function setTable(table, arr) {
  db.data[table] = arr;
}
app.get('/api/:table', (req, res) => {
  const table = req.params.table;
  let items = [...getTable(table)];
  Object.entries(req.query).forEach(([k, v]) => {
    if (k.startsWith('eq_')) {
      const field = k.slice(3);
      items = items.filter(it => String(it[field]) === String(v));
    }
    if (k.startsWith('in_')) {
      const field = k.slice(3);
      const list = Array.isArray(v) ? v : String(v).split(',');
      items = items.filter(it => list.includes(String(it[field])));
    }
    if (k.startsWith('ilike_')) {
      const field = k.slice(6);
      const needle = String(v).toLowerCase();
      items = items.filter(it => String(it[field] || '').toLowerCase().includes(needle.replace(/%/g, '')));
    }
  });
  const order = req.query.order;
  if (order) {
    const [field, dir] = String(order).split(':');
    items.sort((a, b) => (a[field] > b[field] ? 1 : -1) * (dir === 'desc' ? -1 : 1));
  }
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  if (limit) items = items.slice(0, limit);
  if (table === 'spells' || table === 'abilities') {
    items = items.map((r) => normalizePhasesForRow(r));
  }
  return res.json(items);
});
app.post('/api/:table', async (req, res) => {
  const table = req.params.table;
  const arr = getTable(table);
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  let rows = payload.map(row => ({ id: row.id || nanoid(), ...row }));
  if (table === 'spells' || table === 'abilities') {
    rows = rows.map((r) => normalizePhasesForRow(r));
  }
  setTable(table, [...rows, ...arr]);
  safeWriteAsync('generic.post');
  if (table === 'roll_history') {
    rows.forEach(r => broadcastRollHistory({ type: 'INSERT', new: r }));
  }
  if (table === 'enemies') {
    rows.forEach(r => broadcastEnemies({ type: 'INSERT', new: r }));
  }
  return res.json(Array.isArray(req.body) ? rows : rows[0]);
});
app.put('/api/:table/:id', async (req, res) => {
  const table = req.params.table;
  const arr = getTable(table);
  const idx = arr.findIndex(it => it.id === req.params.id);
  if (idx < 0) return res.status(404).end();
  arr[idx] = { ...arr[idx], ...req.body };
  if (table === 'spells' || table === 'abilities') {
    arr[idx] = normalizePhasesForRow(arr[idx]);
  }
  setTable(table, arr);
  safeWriteAsync('generic.put');
  const updated = arr[idx];
  if (table === 'roll_history') broadcastRollHistory({ type: 'UPDATE', new: updated });
  if (table === 'enemies') broadcastEnemies({ type: 'UPDATE', new: updated });
  return res.json(updated);
});
app.delete('/api/:table', async (req, res) => {
  const table = req.params.table;
  let arr = getTable(table);
  let oldRow = null;
  if (req.query.eq_id) {
    oldRow = arr.find(it => it.id === req.query.eq_id) || null;
    arr = arr.filter(it => it.id !== req.query.eq_id);
  }
  setTable(table, arr);
  safeWriteAsync('generic.delete');
  if (table === 'roll_history' && oldRow) broadcastRollHistory({ type: 'DELETE', old: oldRow });
  if (table === 'enemies' && oldRow) broadcastEnemies({ type: 'DELETE', old: oldRow });
  return res.json({ ok: true });
});

const serverInstance = app.listen(PORT, () => console.log(`Local API server on http://localhost:${PORT}`));
serverInstance.on('error', (e) => console.error('[SERVER ERROR]', e));
process.on('uncaughtException', (e) => console.error('[UNCAUGHT EXCEPTION]', e));
process.on('unhandledRejection', (e) => console.error('[UNHANDLED REJECTION]', e));
process.on('SIGTERM', () => console.log('[SIGTERM] received'));
process.on('SIGINT', () => console.log('[SIGINT] received'));

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'local-secret-change-me';
function issueToken(user) {
  const payload = { id: user.id, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  let { email, password, username } = req.body;
  email = String(email || '').trim().toLowerCase();
  if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });
  const exists = db.data.users.find(u => String(u.email).trim().toLowerCase() === email);
  if (exists) return res.status(409).json({ error: 'User exists' });
  const hash = fastHash(password);
  const user = { id: nanoid(), email, password_hash: hash, username: username || null, created_at: new Date().toISOString() };
  db.data.users.push(user);
  safeWriteAsync('auth.signup');
  const token = issueToken(user);
  const roleRow = Array.isArray(db.data.user_roles) ? db.data.user_roles.find(r => r.user_id === user.id && r.role === 'admin') : undefined;
  return res.json({ token, user: { id: user.id, email: user.email, isAdmin: !!roleRow } });
});
app.post('/api/auth/login', async (req, res) => {
  let { email, password } = req.body;
  email = String(email || '').trim();
  let user = null;
  if (email.includes('@')) {
    const needle = email.toLowerCase();
    user = (db.data.users || []).find(u => String(u.email || '').trim().toLowerCase() === needle) || null;
  } else {
    const uname = email.toLowerCase();
    user = (db.data.users || []).find(u => String(u.username || '').trim().toLowerCase() === uname) || null;
  }
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = fastHash(password) === user.password_hash;
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = issueToken(user);
  const roleRow = Array.isArray(db.data.user_roles) ? db.data.user_roles.find(r => r.user_id === user.id && r.role === 'admin') : undefined;
  return res.json({ token, user: { id: user.id, email: user.email, isAdmin: !!roleRow } });
});
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const roleRow = Array.isArray(db.data.user_roles) ? db.data.user_roles.find(r => r.user_id === user.id && r.role === 'admin') : undefined;
  return res.json({ user: { id: user.id, email: user.email, isAdmin: !!roleRow } });
});
