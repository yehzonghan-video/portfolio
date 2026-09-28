# 個人影像作品集

這個專案由兩個互不暴露機密的部分組成：

- **GitHub Pages 前台**：純 HTML、CSS、JavaScript，從 `data/site.json` 與 `data/works.json` 載入公開內容。
- **Streamlit 後台**：以 GitHub Contents API 安全地更新同一份 JSON 與封面圖片；Token 僅放在 Streamlit Secrets。

## 本機預覽前台

請用靜態伺服器開啟專案根目錄（不能直接雙擊 `index.html`，因為瀏覽器會封鎖 JSON 載入）：

```powershell
python -m http.server 8000
```

開啟 `http://localhost:8000`。前台頁面使用 hash 路由，因此 GitHub Pages 不需要伺服器重新導向：`#/works`、`#/works/demo-event-film`。

## 啟動後台

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run admin.py
```

建立 `.streamlit/secrets.toml`（該檔已被 git 忽略）：

```toml
ADMIN_USERNAME = "your-admin-name"
ADMIN_PASSWORD = "use-a-long-unique-password"
GITHUB_TOKEN = "github_pat_..."
GITHUB_REPO = "yehzonghan-video/portfolio"
GITHUB_BRANCH = "main"
```

GitHub Token 需要此 repository 的 **Contents: Read and write** 權限。前台永遠不會讀取這個檔案或 Token。

## GitHub Pages

推送至 `main` 後，至 GitHub repository 的 **Settings → Pages**，選擇 **Deploy from a branch**、`main`、`/(root)`，再儲存即可。網站網址通常是 `https://yehzonghan-video.github.io/portfolio/`。

## 資料與管理方式

- 所有公開文案都在 `data/site.json`；網站名稱留空時，前台不顯示品牌名稱。
- 所有作品都在 `data/works.json`；只有 `published: true` 的作品會出現在前台。
- 進入 Streamlit 後台後，可從「作品管理」新增、編輯、刪除、上／下架、設定精選與排序；「網站內容管理」可更新首頁、關於、服務、聯絡與 Footer。
- 若尚未設定 Secrets，後台仍可讀取本機 JSON 以預覽，但所有寫入會清楚提示需要設定 GitHub API。

影片僅存嵌入網址，不應上傳大型影片到 GitHub。未來可把影片放在 YouTube、Vimeo、Cloudflare Stream、Mux 或 Google Drive（必須可嵌入），然後在後台更新網址。

