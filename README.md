# 守護線 Frontline Guardian

這是一款以兒少保護社工為主題的網頁塔防遊戲，結合：

- `project_td_tactics_design_plan.md` 的拖曳放置、同類合成、動態尋路與波次設計
- `兒少保護社工困境分析報告.pdf` 的高案量、跨網斷裂、資源匱乏、輿論風暴、法責壓力等實務困境

## 檔案

- `index.html`
  單檔可玩版遊戲，含 15 個固定地形關卡、每關 3 輪、無限模式、職級部署、隨機獎勵卡與排行榜介面。
- `server.js`
  Node.js 網頁服務，會同時提供遊戲頁面與 `/api/leaderboard` 排行榜 API。
- `render.yaml`
  Render Blueprint，一次建立 Web Service 與 Postgres。
- `package.json`
  Render 與本機執行 `server.js` 所需的相依與啟動腳本。
- `leaderboard-google-apps-script.gs`
  Google Apps Script 後端範本，用來把排行榜做成全球可共用。

## 直接遊玩

最簡單的方式是直接啟動內建的 Node 服務：

```bash
npm install
npm start
```

然後打開：

```text
http://127.0.0.1:10000
```

## 目前玩法

- 開場故事改成 `intro modal`
- `15` 個不同路線關卡，每關 `3` 輪
- `1` 個無限模式
- 終點是 `社安網堡壘`，會顯示血量
- 保留「擠壓路線改變怪物路徑」玩法，但每張關卡現在都有地形背景與初始道路
- 每一波與開場部署時間都會倒數，倒數結束直接開打
- 塔要從地圖下方拖曳到戰場部署，長按卡片可看技能與名稱資訊
- 關卡採逐關解鎖，至少通過第 `4` 關才會開放無限模式
- 每過 `4` 關，會再開放 `3` 種新的部署塔
- 可部署職級：
  `社工助理`、`社工`、`社工督導`、`高級社工師`、`社工組長`、`超強主任`、`天才局長`、`安心市長`、`高級政委`
- 擊破怪物會累積積分，用來購買更高職級部署
- 排行榜可切換「全球」與「本機」模式；部署到 Render 後，全球榜會寫入 Render Postgres。
- 每輪清完會出現隨機獎勵卡，例如：
  `創傷知情`、`跨網協作`、`通靈技能`、`法律暴擊`、`長官支援`
- 隨機事件可能包含：
  `案量海嘯`、`跨網斷裂`、`資源匱乏`、`因公涉訟`、`家長攻擊`

## 用 Render 佈署

1. 把這個資料夾推到 GitHub。
2. 到 Render 建立新的 Blueprint，選這個 repo。
3. Render 會讀取根目錄的 `render.yaml`，建立：
   - `frontline-guardian` Web Service
   - `frontline-guardian-db` Postgres
4. 等第一次 deploy 完成後，遊戲頁面與排行榜 API 就會在同一個 Render 服務上運作。

排行榜 API 路徑：

```text
/api/leaderboard
```

## 注意

- 未連上 Postgres 時，`server.js` 會先用記憶體暫存排行榜，重開服務後會清空。
- `render.yaml` 會把 `frontline-guardian-db` 的 `connectionString` 注入成 `DATABASE_URL`，不需要手動填資料庫密碼。
- `leaderboard-google-apps-script.gs` 仍保留作為舊版替代方案，但 Render 版不需要它。
