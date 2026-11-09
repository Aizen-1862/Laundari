const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const RESET_PHRASE = process.env.RESET_PHRASE;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_PASSWORD_HASH = ADMIN_PASSWORD ? bcrypt.hashSync(ADMIN_PASSWORD, 12) : "";
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "https://aizen-1862.github.io").split(",").map(v => v.trim());

if (!DATABASE_URL || !JWT_SECRET || !RESET_PHRASE) {
  console.error("Missing DATABASE_URL, JWT_SECRET or RESET_PHRASE environment variable.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000
});

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || CORS_ORIGIN.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "12mb" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: "draft-7", legacyHeaders: false });

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS laundry_users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL,
      room_number TEXT NOT NULL,
      room_key TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(name_key, room_key)
    );
    CREATE TABLE IF NOT EXISTS laundry_receipts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES laundry_users(id) ON DELETE CASCADE,
      receipt_number TEXT NOT NULL UNIQUE,
      items JSONB NOT NULL,
      total_items INTEGER NOT NULL CHECK (total_items > 0),
      photos JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS laundry_receipts_user_created_idx
      ON laundry_receipts(user_id, created_at DESC);
  `);
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
function normalizeRoom(value) {
  return String(value || "").trim().toUpperCase();
}
function validIdentity(name, room) {
  return name.length >= 2 && name.length <= 60 && room.length >= 1 && room.length <= 20;
}
function makeToken(user) {
  return jwt.sign({ sub: String(user.id), name: user.name, room: user.room_number, role: "student" }, JWT_SECRET, { expiresIn: "7d", issuer: "laundari-api", audience: "laundari-web" });
}
function makeAdminToken() {
  return jwt.sign({ sub: "warden", username: ADMIN_USERNAME, role: "admin" }, JWT_SECRET, { expiresIn: "8h", issuer: "laundari-api", audience: "laundari-web" });
}
function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please log in again." });
  try {
    req.user = jwt.verify(token, JWT_SECRET, { issuer: "laundari-api", audience: "laundari-web" });
    if (req.user.role !== "student") return res.status(403).json({ error: "Student access only." });
    return next();
  } catch {
    return res.status(401).json({ error: "Your session expired. Please log in again." });
  }
}
function requireAdmin(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please sign in as the warden." });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: "laundari-api", audience: "laundari-web" });
    if (payload.role !== "admin" || payload.sub !== "warden") return res.status(403).json({ error: "Warden access only." });
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Your admin session expired. Please sign in again." });
  }
}
function safePhraseMatch(candidate) {
  const a = Buffer.from(String(candidate || ""), "utf8");
  const b = Buffer.from(RESET_PHRASE, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function receiptNumber() {
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  return "LD-" + date + "-" + crypto.randomInt(100000, 999999);
}


app.get("/api/health", (_req, res) => res.json({ ok: true, service: "laundari-api" }));

// Warden-only authentication and records. Credentials are kept in Render environment variables.
app.post("/api/admin/login", adminLimiter, async (req, res) => {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
    return res.status(503).json({ error: "Warden login has not been configured by the administrator." });
  }
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const usernameOk = username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
  const passwordOk = password.length > 0 && await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!usernameOk || !passwordOk) return res.status(401).json({ error: "Warden username or password is incorrect." });
  return res.json({ token: makeAdminToken(), admin: { username: ADMIN_USERNAME } });
});

app.get("/api/admin/overview", requireAdmin, async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM laundry_users) AS students,
        (SELECT COUNT(*)::int FROM laundry_receipts) AS receipts,
        (SELECT COUNT(*)::int FROM laundry_receipts WHERE created_at >= NOW() - INTERVAL '7 days') AS last_seven_days
    `);
    return res.json({ overview: result.rows[0] });
  } catch (error) { return next(error); }
});

app.get("/api/admin/receipts", requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim().slice(0, 100);
    const date = String(req.query.date || "").trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Date must use YYYY-MM-DD." });
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const pattern = "%" + search + "%";
    const values = [pattern, date || null, limit, offset];
    const where = "($1 = '%%' OR u.name ILIKE $1 OR u.room_number ILIKE $1 OR r.receipt_number ILIKE $1) AND ($2::date IS NULL OR r.created_at::date = $2::date)";
    const [rows, count] = await Promise.all([
      pool.query(`SELECT r.id, r.receipt_number, r.items, r.total_items, r.created_at, u.name AS student_name, u.room_number
        FROM laundry_receipts r JOIN laundry_users u ON u.id = r.user_id
        WHERE ${where} ORDER BY r.created_at DESC LIMIT $3 OFFSET $4`, values),
      pool.query(`SELECT COUNT(*)::int AS total FROM laundry_receipts r JOIN laundry_users u ON u.id = r.user_id WHERE ${where}`, values.slice(0, 2))
    ]);
    return res.json({ receipts: rows.rows, total: count.rows[0].total, limit, offset });
  } catch (error) { return next(error); }
});

app.get("/api/admin/receipts/:id", requireAdmin, async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid receipt." });
    const result = await pool.query(`
      SELECT r.id, r.receipt_number, r.items, r.total_items, r.photos, r.created_at,
             u.name AS student_name, u.room_number
      FROM laundry_receipts r JOIN laundry_users u ON u.id = r.user_id
      WHERE r.id = $1
    `, [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Receipt not found." });
    return res.json({ receipt: result.rows[0] });
  } catch (error) { return next(error); }
});


app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name);
    const room = normalizeRoom(req.body.roomNumber);
    const password = String(req.body.password || "");
    if (!validIdentity(name, room)) return res.status(400).json({ error: "Enter a valid name and room number." });
    if (password.length < 6 || password.length > 72) return res.status(400).json({ error: "Password must be 6–72 characters." });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO laundry_users(name, name_key, room_number, room_key, password_hash) VALUES($1, $2, $3, $4, $5) RETURNING id, name, room_number",
      [name, name.toLowerCase(), room, room.toLowerCase(), hash]
    );
    const user = result.rows[0];
    return res.status(201).json({ token: makeToken(user), user: { name: user.name, roomNumber: user.room_number } });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with this name and room number already exists. Please log in." });
    return next(error);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name);
    const room = normalizeRoom(req.body.roomNumber);
    const password = String(req.body.password || "");
    if (!validIdentity(name, room) || !password) return res.status(400).json({ error: "Enter your name, room number and password." });
    const result = await pool.query(
      "SELECT id, name, room_number, password_hash FROM laundry_users WHERE name_key = $1 AND room_key = $2",
      [name.toLowerCase(), room.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Name, room number or password is incorrect." });
    return res.json({ token: makeToken(user), user: { name: user.name, roomNumber: user.room_number } });
  } catch (error) { return next(error); }
});

app.post("/api/auth/reset", resetLimiter, async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name);
    const room = normalizeRoom(req.body.roomNumber);
    const phrase = String(req.body.recoveryPhrase || "");
    const newPassword = String(req.body.newPassword || "");
    if (!validIdentity(name, room) || !safePhraseMatch(phrase)) return res.status(400).json({ error: "Account details or recovery phrase are incorrect." });
    if (newPassword.length < 6 || newPassword.length > 72) return res.status(400).json({ error: "New password must be 6–72 characters." });
    const hash = await bcrypt.hash(newPassword, 12);
    const result = await pool.query(
      "UPDATE laundry_users SET password_hash = $1 WHERE name_key = $2 AND room_key = $3 RETURNING id",
      [hash, name.toLowerCase(), room.toLowerCase()]
    );
    if (!result.rowCount) return res.status(404).json({ error: "No account was found with those details." });
    return res.json({ message: "Password updated. You can now log in." });
  } catch (error) { return next(error); }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT name, room_number FROM laundry_users WHERE id = $1", [req.user.sub]);
    if (!result.rowCount) return res.status(401).json({ error: "Account not found." });
    return res.json({ user: { name: result.rows[0].name, roomNumber: result.rows[0].room_number } });
  } catch (error) { return next(error); }
});

app.post("/api/receipts", requireAuth, async (req, res, next) => {
  try {
    const items = req.body.items;
    const photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (!items || typeof items !== "object" || Array.isArray(items)) return res.status(400).json({ error: "Receipt items are invalid." });
    const cleanItems = {};
    let total = 0;
    for (const [name, value] of Object.entries(items)) {
      if (typeof name !== "string" || name.length > 40 || !Number.isInteger(value) || value < 0 || value > 100) return res.status(400).json({ error: "One or more item quantities are invalid." });
      if (value > 0) { cleanItems[name] = value; total += value; }
    }
    if (!total || total > 300) return res.status(400).json({ error: "Select between 1 and 300 items." });
    if (photos.length > 6 || photos.some(p => typeof p !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(p) || p.length > 650000)) return res.status(400).json({ error: "Photos must be up to 6 compressed images." });
    const number = receiptNumber();
    const result = await pool.query(
      "INSERT INTO laundry_receipts(user_id, receipt_number, items, total_items, photos) VALUES($1, $2, $3, $4, $5) RETURNING id, receipt_number, items, total_items, photos, created_at",
      [req.user.sub, number, JSON.stringify(cleanItems), total, JSON.stringify(photos)]
    );
    return res.status(201).json({ receipt: result.rows[0] });
  } catch (error) { return next(error); }
});

app.get("/api/receipts", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, receipt_number, items, total_items, photos, created_at FROM laundry_receipts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
      [req.user.sub]
    );
    return res.json({ receipts: result.rows });
  } catch (error) { return next(error); }
});

app.get("/api/receipts/:id", requireAuth, async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid receipt." });
    const result = await pool.query(
      "SELECT id, receipt_number, items, total_items, photos, created_at FROM laundry_receipts WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.sub]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Receipt not found." });
    return res.json({ receipt: result.rows[0] });
  } catch (error) { return next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.message === "Origin not allowed by CORS") return res.status(403).json({ error: "This website is not allowed to access the API." });
  return res.status(500).json({ error: "Something went wrong. Please try again." });
});

initializeDatabase().then(() => {
  app.listen(PORT, "0.0.0.0", () => console.log("Laundari API listening on port " + PORT));
}).catch(error => {
  console.error("Database initialization failed:", error);
  process.exit(1);
});
