const SHEET_NAME = "Runs";

function doGet(e) {
  const action = (e.parameter.action || "leaderboard").toLowerCase();
  const gameId = e.parameter.gameId || "frontline-guardian-child-protection-td";
  const sheet = getSheet_();
  const rows = readRows_(sheet, gameId);

  if (action === "stats") {
    return json_({
      ok: true,
      runs: rows.length,
      bestScore: rows.length ? rows[0].score : 0,
      averageScore: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0,
      averageWave: rows.length ? Number((rows.reduce((sum, row) => sum + row.wave, 0) / rows.length).toFixed(1)) : 0,
      updatedAt: new Date().toISOString(),
    });
  }

  return json_({
    ok: true,
    leaderboard: rows.slice(0, 20),
    updatedAt: new Date().toISOString(),
  });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const gameId = String(payload.gameId || "frontline-guardian-child-protection-td");
  const name = sanitize_(payload.name || "匿名社工", 16);
  const region = sanitize_(payload.region || "Global", 18);
  const score = Number(payload.score || 0);
  const wave = Number(payload.wave || 0);
  const outcome = sanitize_(payload.outcome || "defeat", 12);
  const hp = Number(payload.hp || 0);
  const timestamp = payload.timestamp || new Date().toISOString();

  const sheet = getSheet_();
  sheet.appendRow([gameId, timestamp, name, region, score, wave, outcome, hp]);

  return json_({ ok: true });
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["gameId", "timestamp", "name", "region", "score", "wave", "outcome", "hp"]);
  }

  return sheet;
}

function readRows_(sheet, gameId) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values
    .slice(1)
    .filter((row) => String(row[0]) === gameId)
    .map((row) => ({
      timestamp: row[1],
      name: row[2],
      region: row[3],
      score: Number(row[4] || 0),
      wave: Number(row[5] || 0),
      outcome: row[6],
      hp: Number(row[7] || 0),
    }))
    .sort((a, b) => b.score - a.score || b.wave - a.wave || b.hp - a.hp);
}

function sanitize_(value, maxLength) {
  return String(value).trim().slice(0, maxLength);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
