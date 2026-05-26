import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createPool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

const app = express();

const port = Number(process.env.PORT || 5174);
const jwtSecret = process.env.JWT_SECRET || 'change-me';
const corsOrigin = process.env.CORS_ORIGIN || '*';

process.on('unhandledRejection', (reason) => {
  process.stderr.write(`unhandledRejection: ${String(reason)}\n`);
});

process.on('uncaughtException', (err) => {
  process.stderr.write(`uncaughtException: ${String(err?.stack || err)}\n`);
  process.exit(1);
});

const pool = createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'mbraces',
  connectionLimit: 10,
  namedPlaceholders: true
});

app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

function signToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function adminRequired(req, res, next) {
  if (req.auth?.role !== 'Super Admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    await pool.query('select 1 as ok');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const fullName = String(req.body?.fullName || '').trim();

  if (!email || !password || password.length < 6 || !fullName) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'insert into auth_users (id, email, password_hash, email_confirmed, created_at) values (:id, :email, :password_hash, 1, now())',
      { id, email, password_hash: passwordHash }
    );
    await conn.execute(
      'insert into profiles (id, name, role, consortium_name, is_approved, created_at, updated_at) values (:id, :name, :role, null, 0, now(), now())',
      { id, name: fullName, role: 'Moderador' }
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    if (String(e?.code) === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email ya existe' });
    return res.status(500).json({ error: 'Error registrando usuario' });
  } finally {
    conn.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Datos inválidos' });

  const [rows] = await pool.execute(
    'select u.id, u.password_hash, u.email_confirmed, p.role, p.is_approved from auth_users u join profiles p on p.id = u.id where u.email = :email limit 1',
    { email }
  );
  const user = rows?.[0];
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  if (!user.email_confirmed) return res.status(403).json({ error: 'Email no confirmado' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = signToken({ sub: user.id, role: user.role, isApproved: Boolean(user.is_approved) });
  res.json({ token });
});

app.get('/api/profile/me', authRequired, async (req, res) => {
  const userId = req.auth.sub;
  const [rows] = await pool.execute(
    'select p.id, p.name, p.role, p.consortium_name, p.is_approved, u.email from profiles p join auth_users u on u.id = p.id where p.id = :id limit 1',
    { id: userId }
  );
  const p = rows?.[0];
  if (!p) return res.status(404).json({ error: 'Perfil no encontrado' });
  res.json({
    id: p.id,
    name: p.name,
    role: p.role,
    consortiumName: p.consortium_name,
    isApproved: Boolean(p.is_approved),
    email: p.email
  });
});

app.get('/api/admin/pending-users', authRequired, adminRequired, async (_req, res) => {
  const [rows] = await pool.execute(
    'select id, name, role, consortium_name, is_approved from profiles where is_approved = 0 order by created_at asc'
  );
  res.json(
    (rows || []).map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      consortiumName: r.consortium_name,
      isApproved: Boolean(r.is_approved)
    }))
  );
});

app.post('/api/admin/approve/:id', authRequired, adminRequired, async (req, res) => {
  const id = String(req.params.id || '');
  await pool.execute('update profiles set is_approved = 1, updated_at = now() where id = :id', { id });
  res.json({ ok: true });
});

app.post('/api/admin/reject/:id', authRequired, adminRequired, async (req, res) => {
  const id = String(req.params.id || '');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('delete from profiles where id = :id', { id });
    await conn.execute('delete from auth_users where id = :id', { id });
    await conn.commit();
    res.json({ ok: true });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: 'Error eliminando usuario' });
  } finally {
    conn.release();
  }
});

app.get('/api/app-settings', async (_req, res) => {
  const [rows] = await pool.execute('select * from app_settings where id = 1 limit 1');
  const s = rows?.[0];
  if (!s) return res.json({ appName: 'MBRACES', appLogo: null, ticketName: 'CONSORCIO MBRACES', ticketLogo: null });
  res.json({
    appName: s.app_name,
    appLogo: s.app_logo_url,
    ticketName: s.ticket_name,
    ticketLogo: s.ticket_logo_url
  });
});

app.put('/api/app-settings', authRequired, adminRequired, async (req, res) => {
  const appName = String(req.body?.appName || 'MBRACES');
  const appLogo = req.body?.appLogo ? String(req.body.appLogo) : null;
  const ticketName = String(req.body?.ticketName || 'CONSORCIO MBRACES');
  const ticketLogo = req.body?.ticketLogo ? String(req.body.ticketLogo) : null;

  await pool.execute(
    'update app_settings set app_name = :app_name, app_logo_url = :app_logo_url, ticket_name = :ticket_name, ticket_logo_url = :ticket_logo_url, updated_at = now() where id = 1',
    { app_name: appName, app_logo_url: appLogo, ticket_name: ticketName, ticket_logo_url: ticketLogo }
  );
  res.json({ ok: true });
});

app.get('/api/terminals', authRequired, async (req, res) => {
  const userId = req.auth.sub;
  const isAdmin = req.auth.role === 'Super Admin';
  const [rows] = await pool.execute(
    isAdmin ? 'select * from terminals order by created_at desc' : 'select * from terminals where owner_id = :id order by created_at desc',
    isAdmin ? {} : { id: userId }
  );
  res.json(
    (rows || []).map(r => {
      let ini = r.ini_content;
      if (typeof ini === 'string') {
        try { ini = JSON.parse(ini); } catch { }
      }
      return { ...r, ini_content: ini };
    })
  );
});

app.post('/api/terminals', authRequired, async (req, res) => {
  const userId = req.auth.sub;
  const id = randomUUID();
  const authToken = randomUUID().replace(/-/g, '');
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const address = req.body?.address ? String(req.body.address) : null;
  const phone = req.body?.phone ? String(req.body.phone) : null;
  const manager = req.body?.manager ? String(req.body.manager) : null;
  const type = req.body?.type ? String(req.body.type) : 'Banca';
  const softwareVersion = 'v1.0.0';
  const status = 'Desconectado';
  const iniContent = req.body?.ini_content ? JSON.stringify(req.body.ini_content) : null;

  await pool.execute(
    `insert into terminals
      (id, owner_id, auth_token, name, address, phone, manager, type, status, last_sync, software_version, ini_content, created_at, updated_at)
     values
      (:id, :owner_id, :auth_token, :name, :address, :phone, :manager, :type, :status, null, :software_version, :ini_content, now(), now())`,
    { id, owner_id: userId, auth_token: authToken, name, address, phone, manager, type, status, software_version: softwareVersion, ini_content: iniContent }
  );
  res.json({ id, auth_token: authToken });
});

app.put('/api/terminals/:id/ini', authRequired, async (req, res) => {
  const terminalId = String(req.params.id || '');
  const iniContent = JSON.stringify(req.body || {});
  const userId = req.auth.sub;
  const isAdmin = req.auth.role === 'Super Admin';

  const [rows] = await pool.execute('select owner_id from terminals where id = :id limit 1', { id: terminalId });
  const t = rows?.[0];
  if (!t) return res.status(404).json({ error: 'Terminal no encontrada' });
  if (!isAdmin && t.owner_id !== userId) return res.status(403).json({ error: 'Forbidden' });

  await pool.execute('update terminals set ini_content = :ini, updated_at = now() where id = :id', { id: terminalId, ini: iniContent });
  res.json({ ok: true });
});

app.get('/api/transactions', authRequired, async (req, res) => {
  const userId = req.auth.sub;
  const isAdmin = req.auth.role === 'Super Admin';

  const terminalId = req.query.terminalId && String(req.query.terminalId) !== 'ALL' ? String(req.query.terminalId) : null;
  const start = req.query.start ? String(req.query.start) : null;
  const end = req.query.end ? String(req.query.end) : null;
  const limit = Math.min(Number(req.query.limit || 20), 200);

  const txWhere = [];
  const txParams = {};
  if (!isAdmin) {
    txWhere.push('terminal_owner_id = :ownerId');
    txParams.ownerId = userId;
  }
  if (terminalId) {
    txWhere.push('terminal_id = :terminalId');
    txParams.terminalId = terminalId;
  }
  if (start) {
    txWhere.push('created_at >= :start');
    txParams.start = `${start} 00:00:00`;
  }
  if (end) {
    txWhere.push('created_at <= :end');
    txParams.end = `${end} 23:59:59`;
  }
  const txSql = `select * from transactions ${txWhere.length ? `where ${txWhere.join(' and ')}` : ''} order by created_at desc limit ${limit}`;
  const [txRows] = await pool.execute(txSql, txParams);

  const stWhere = [];
  const stParams = {};
  if (terminalId) {
    stWhere.push('st.terminal_id = :terminalId');
    stParams.terminalId = terminalId;
  }
  if (start) {
    stWhere.push('st.local_date >= :startDate');
    stParams.startDate = start;
  }
  if (end) {
    stWhere.push('st.local_date <= :endDate');
    stParams.endDate = end;
  }
  if (!isAdmin) {
    stWhere.push('tm.owner_id = :ownerId');
    stParams.ownerId = userId;
  }
  const stSql = `select st.*, tm.name as terminal_name from sync_tickets st join terminals tm on tm.id = st.terminal_id ${stWhere.length ? `where ${stWhere.join(' and ')}` : ''} order by st.created_at desc limit ${limit}`;
  const [stRows] = await pool.execute(stSql, stParams);

  const txs = (txRows || []).map(t => ({
    id: t.id,
    date: new Date(t.created_at).toLocaleString('es-DO'),
    machineId: t.terminal_id,
    machineName: t.machine_name || 'Terminal',
    type: t.type,
    amount: Number(t.amount),
    ticketId: t.ticket_id,
    numbers: t.numbers || '',
    playType: t.play_type || '',
    status: t.status || 'active',
    isCollector: false,
    _created_at: t.created_at
  }));

  const syncTickets = (stRows || []).map(t => ({
    id: t.id,
    date: `${t.local_date} ${t.local_time || ''}`.trim(),
    machineId: t.terminal_id,
    machineName: t.terminal_name || 'Terminal',
    type: t.ticket_type || 'BET',
    amount: Number(t.amount),
    ticketId: String(t.ticket_number),
    numbers: t.numbers || '',
    playType: t.play_type || '',
    status: t.status || 'active',
    isCollector: true,
    _created_at: t.created_at
  }));

  const combined = [...txs, ...syncTickets];
  combined.sort((a, b) => new Date(b._created_at).getTime() - new Date(a._created_at).getTime());
  res.json(combined.slice(0, limit).map(({ _created_at, ...rest }) => rest));
});

app.get('/api/races/recent', authRequired, async (req, res) => {
  const userId = req.auth.sub;
  const isAdmin = req.auth.role === 'Super Admin';
  const limit = Math.min(Number(req.query.limit || 10), 100);

  const [rows] = await pool.execute(
    isAdmin
      ? `select r.*, t.name as terminal_name from sync_races r left join terminals t on t.id = r.terminal_id order by r.created_at desc limit ${limit}`
      : `select r.*, t.name as terminal_name from sync_races r join terminals t on t.id = r.terminal_id where t.owner_id = :ownerId order by r.created_at desc limit ${limit}`,
    isAdmin ? {} : { ownerId: userId }
  );

  res.json(
    (rows || []).map(r => ({
      id: r.id,
      raceNumber: r.race_number,
      winners: r.winner_numbers,
      date: r.local_date,
      time: r.local_time,
      terminalName: r.terminal_name || 'Terminal',
      createdAt: r.created_at
    }))
  );
});

app.get('/api/jackpot', authRequired, async (_req, res) => {
  const [rows] = await pool.execute('select current_value from jackpot_values where id = 1 limit 1');
  const j = rows?.[0];
  res.json({ currentValue: j ? Number(j.current_value) : 0 });
});

app.put('/api/jackpot', authRequired, adminRequired, async (req, res) => {
  const currentValue = Number(req.body?.currentValue || 0);
  await pool.execute('update jackpot_values set current_value = :v, updated_at = now() where id = 1', { v: currentValue });
  res.json({ ok: true });
});

app.post('/api/transactions/:id/void', authRequired, async (req, res) => {
  const id = String(req.params.id || '');
  const isCollector = Boolean(req.body?.isCollector);
  const table = isCollector ? 'sync_tickets' : 'transactions';
  await pool.execute(`update ${table} set status = 'voided' where id = :id`, { id });
  res.json({ ok: true });
});

app.delete('/api/tickets/:ticketNumber', authRequired, adminRequired, async (req, res) => {
  const ticketNumber = String(req.params.ticketNumber || '');
  const confirmDelete = String(req.query.confirm || 'false') === 'true';

  const [syncRows] = await pool.execute('select id from sync_tickets where ticket_number = :t limit 5000', { t: ticketNumber });
  const [txRows] = await pool.execute('select id from transactions where ticket_id = :t limit 5000', { t: ticketNumber });
  const count = (syncRows?.length || 0) + (txRows?.length || 0);
  if (!confirmDelete) return res.json({ count });

  if (syncRows?.length) {
    await pool.execute('delete from sync_tickets where ticket_number = :t', { t: ticketNumber });
  }
  if (txRows?.length) {
    await pool.execute('delete from transactions where ticket_id = :t', { t: ticketNumber });
  }
  res.json({ count, deleted: true });
});

async function requireMachine(req, res) {
  const terminalId = String(req.query.terminalId || req.body?.terminal_id || '');
  const token = String(req.query.token || req.body?.auth_token || '');
  if (!terminalId || !token) return { ok: false, terminalId: null };

  const [rows] = await pool.execute('select id, auth_token from terminals where id = :id limit 1', { id: terminalId });
  const t = rows?.[0];
  if (!t || String(t.auth_token) !== token) return { ok: false, terminalId: null };
  return { ok: true, terminalId };
}

app.patch('/api/collector/heartbeat', async (req, res) => {
  const auth = await requireMachine(req, res);
  if (!auth.ok) return res.status(403).json({ error: 'Forbidden' });

  const terminalId = auth.terminalId;
  const payload = req.body || {};
  const status = payload.status ? String(payload.status) : 'En Línea';
  const lastSync = payload.last_sync ? new Date(payload.last_sync) : new Date();
  const lastRaceNumber = payload.last_race_number != null ? String(payload.last_race_number) : null;
  const lastTicketNumber = payload.last_ticket_number != null ? String(payload.last_ticket_number) : null;
  const dailySales = payload.daily_sales != null ? Number(payload.daily_sales) : null;
  const dailyPayouts = payload.daily_payouts != null ? Number(payload.daily_payouts) : null;
  const iniContent = payload.ini_content ? JSON.stringify(payload.ini_content) : null;

  await pool.execute(
    `update terminals set
      last_sync = :last_sync,
      status = :status,
      last_race_number = coalesce(:last_race_number, last_race_number),
      last_ticket_number = coalesce(:last_ticket_number, last_ticket_number),
      daily_sales = coalesce(:daily_sales, daily_sales),
      daily_payouts = coalesce(:daily_payouts, daily_payouts),
      ini_content = coalesce(:ini_content, ini_content),
      updated_at = now()
     where id = :id`,
    {
      id: terminalId,
      last_sync: lastSync,
      status,
      last_race_number: lastRaceNumber,
      last_ticket_number: lastTicketNumber,
      daily_sales: dailySales,
      daily_payouts: dailyPayouts,
      ini_content: iniContent
    }
  );
  res.json({ ok: true });
});

app.post('/api/collector/tickets', async (req, res) => {
  const auth = await requireMachine(req, res);
  if (!auth.ok) return res.status(403).json({ error: 'Forbidden' });

  const terminalId = auth.terminalId;
  const tickets = Array.isArray(req.body) ? req.body : req.body?.tickets;
  if (!Array.isArray(tickets) || tickets.length === 0) return res.json({ ok: true, inserted: 0 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let inserted = 0;
    for (const t of tickets.slice(0, 200)) {
      const id = randomUUID();
      const ticketNumber = String(t.ticket_number || '');
      if (!ticketNumber) continue;
      const ticketType = t.ticket_type ? String(t.ticket_type) : (t._ticket_type === 'PAYOUT' ? 'PAYOUT' : 'BET');
      const amount = Number(t.amount || 0);
      const odds = Number(t.odds || 0);
      const raceNumber = t.race_number != null ? String(t.race_number) : null;
      const numbers = t.numbers != null ? String(t.numbers) : null;
      const playType = t.play_type != null ? String(t.play_type) : null;
      const localDate = t.local_date ? String(t.local_date) : null;
      const localTime = t.local_time ? String(t.local_time) : null;
      const rawData = t.raw_data ? (typeof t.raw_data === 'string' ? t.raw_data : JSON.stringify(t.raw_data)) : null;

      await conn.execute(
        `insert into sync_tickets
          (id, created_at, terminal_id, ticket_number, ticket_type, amount, odds, race_number, numbers, play_type, local_date, local_time, raw_data, status)
         values
          (:id, now(), :terminal_id, :ticket_number, :ticket_type, :amount, :odds, :race_number, :numbers, :play_type, :local_date, :local_time, :raw_data, 'active')`,
        {
          id,
          terminal_id: terminalId,
          ticket_number: ticketNumber,
          ticket_type: ticketType,
          amount,
          odds,
          race_number: raceNumber,
          numbers,
          play_type: playType,
          local_date: localDate,
          local_time: localTime,
          raw_data: rawData
        }
      );
      inserted += 1;
    }
    await conn.commit();
    res.json({ ok: true, inserted });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: 'Error sync tickets' });
  } finally {
    conn.release();
  }
});

app.post('/api/collector/races', async (req, res) => {
  const auth = await requireMachine(req, res);
  if (!auth.ok) return res.status(403).json({ error: 'Forbidden' });

  const terminalId = auth.terminalId;
  const races = Array.isArray(req.body) ? req.body : req.body?.races;
  if (!Array.isArray(races) || races.length === 0) return res.json({ ok: true, inserted: 0 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let inserted = 0;
    for (const r of races.slice(0, 50)) {
      const id = randomUUID();
      const raceNumber = String(r.race_number || '');
      if (!raceNumber) continue;
      const winners = r.winner_numbers != null ? String(r.winner_numbers) : null;
      const localDate = r.local_date ? String(r.local_date) : null;
      const localTime = r.local_time ? String(r.local_time) : null;
      await conn.execute(
        `insert into sync_races
          (id, created_at, terminal_id, race_number, winner_numbers, local_date, local_time)
         values
          (:id, now(), :terminal_id, :race_number, :winner_numbers, :local_date, :local_time)`,
        { id, terminal_id: terminalId, race_number: raceNumber, winner_numbers: winners, local_date: localDate, local_time: localTime }
      );
      inserted += 1;
    }
    await conn.commit();
    res.json({ ok: true, inserted });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: 'Error sync races' });
  } finally {
    conn.release();
  }
});

app.get('/api/collector/ini', async (req, res) => {
  const auth = await requireMachine(req, res);
  if (!auth.ok) return res.status(403).json({ error: 'Forbidden' });

  const [rows] = await pool.execute('select ini_content from terminals where id = :id limit 1', { id: auth.terminalId });
  const t = rows?.[0];
  let ini = t?.ini_content || null;
  if (typeof ini === 'string') {
    try { ini = JSON.parse(ini); } catch { }
  }
  res.json({ ini_content: ini });
});

app.get('/api/collector/voided', async (req, res) => {
  const auth = await requireMachine(req, res);
  if (!auth.ok) return res.status(403).json({ error: 'Forbidden' });

  const [rows] = await pool.execute(
    'select * from voided_tickets where terminal_id = :id and synced = 0 order by created_at asc limit 200',
    { id: auth.terminalId }
  );
  res.json(rows || []);
});

app.patch('/api/collector/voided/:id', async (req, res) => {
  const auth = await requireMachine(req, res);
  if (!auth.ok) return res.status(403).json({ error: 'Forbidden' });

  const id = String(req.params.id || '');
  await pool.execute(
    'update voided_tickets set synced = 1, synced_at = now() where id = :id and terminal_id = :terminal_id',
    { id, terminal_id: auth.terminalId }
  );
  res.json({ ok: true });
});

app.listen(port, () => {
  process.stdout.write(`API listening on 0.0.0.0:${port}\n`);
});
