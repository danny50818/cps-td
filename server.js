const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const GAME_ID = process.env.LEADERBOARD_GAME_ID || "frontline-guardian-v4";
const MAX_LEADERBOARD_ROWS = 10;
const localScores = [];

app.use(express.json({ limit: "256kb" }));
app.use(express.static(__dirname, { extensions: ["html"] }));

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=")
      ? false
      : { rejectUnauthorized: false },
  });
}

function normalizedGameId(value) {
  const input = String(value || GAME_ID).trim();
  return input.slice(0, 64) || GAME_ID;
}

function normalizedEntry(payload) {
  return {
    gameId: normalizedGameId(payload.gameId),
    name: String(payload.name || "匿名社工").trim().slice(0, 16) || "匿名社工",
    region: String(payload.region || "Local").trim().slice(0, 18) || "Local",
    score: Math.max(0, Math.round(Number(payload.score) || 0)),
    wave: Math.max(0, Math.round(Number(payload.wave) || 0)),
    outcome: String(payload.outcome || "").trim().slice(0, 16),
    stage: String(payload.stage || "").trim().slice(0, 24),
    timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
  };
}

async function ensureSchema() {
  if (!pool) return;
  await pool.query(`
    create table if not exists leaderboard_entries (
      id bigserial primary key,
      game_id text not null,
      player_name text not null,
      region text not null,
      score integer not null,
      wave integer not null,
      outcome text,
      stage text,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create index if not exists leaderboard_entries_game_id_score_idx
      on leaderboard_entries (game_id, score desc, wave desc, created_at asc);
  `);
}

async function writeEntry(entry) {
  if (!pool) {
    localScores.push(entry);
    localScores.sort((a, b) => b.score - a.score || b.wave - a.wave);
    localScores.splice(40);
    return;
  }
  await pool.query(
    `insert into leaderboard_entries
      (game_id, player_name, region, score, wave, outcome, stage, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.gameId,
      entry.name,
      entry.region,
      entry.score,
      entry.wave,
      entry.outcome,
      entry.stage,
      entry.timestamp,
    ],
  );
}

async function readLeaderboard(gameId) {
  if (!pool) {
    return localScores
      .filter((entry) => entry.gameId === gameId)
      .slice(0, MAX_LEADERBOARD_ROWS);
  }
  const result = await pool.query(
    `select
        player_name as name,
        region,
        score,
        wave,
        outcome,
        stage,
        created_at as timestamp
     from leaderboard_entries
     where game_id = $1
     order by score desc, wave desc, created_at asc
     limit $2`,
    [gameId, MAX_LEADERBOARD_ROWS],
  );
  return result.rows;
}

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, database: !!pool });
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const gameId = normalizedGameId(req.query.gameId);
    const leaderboard = await readLeaderboard(gameId);
    res.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard read failed", error);
    res.status(500).json({ error: "leaderboard_read_failed" });
  }
});

app.post("/api/leaderboard", async (req, res) => {
  try {
    const payload = normalizedEntry(req.body || {});
    await writeEntry(payload);
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Leaderboard write failed", error);
    res.status(500).json({ error: "leaderboard_write_failed" });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Frontline Guardian server listening on ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database schema", error);
    process.exit(1);
  });
