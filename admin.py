"""私人作品集後台：Secrets 只在 Streamlit server 使用，絕不傳給前台。"""
import base64
import json
import mimetypes
import re
from datetime import datetime, date
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

import streamlit as st

ROOT = Path(__file__).parent
SITE_PATH = "data/site.json"
WORKS_PATH = "data/works.json"
IMAGE_LIMIT = 5 * 1024 * 1024

st.set_page_config(page_title="作品集管理", page_icon="🎬", layout="wide")

def secret(name, default=""):
    return str(st.secrets.get(name, default))

def github_ready():
    return all(secret(k) for k in ("GITHUB_TOKEN", "GITHUB_REPO", "GITHUB_BRANCH"))

def github_request(path, method="GET", payload=None):
    if not github_ready():
        raise RuntimeError("尚未設定 GitHub Secrets。")
    url = f"https://api.github.com/repos/{secret('GITHUB_REPO')}/contents/{quote(path)}?ref={quote(secret('GITHUB_BRANCH'))}"
    headers = {"Accept": "application/vnd.github+json", "Authorization": f"Bearer {secret('GITHUB_TOKEN')}", "X-GitHub-Api-Version": "2022-11-28"}
    data = json.dumps(payload).encode("utf-8") if payload else None
    request = Request(url, data=data, method=method, headers=headers)
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8")) if response.length != 0 else {}
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API 回應 {error.code}：{detail}") from error

def read_remote_json(path, fallback):
    """GitHub 設定齊全時讀正式資料；否則讀本機範例方便設計預覽。"""
    if not github_ready():
        return json.loads((ROOT / path).read_text(encoding="utf-8")), None
    result = github_request(path)
    return json.loads(base64.b64decode(result["content"]).decode("utf-8")), result["sha"]

def commit_file(path, content, message, sha=None):
    if not github_ready():
        raise RuntimeError("請先在 .streamlit/secrets.toml 設定 GITHUB_TOKEN、GITHUB_REPO、GITHUB_BRANCH。")
    payload = {"message": message, "content": base64.b64encode(content).decode(), "branch": secret("GITHUB_BRANCH")}
    if sha: payload["sha"] = sha
    return github_request(path, "PUT", payload)

def save_json(path, data, message):
    _, sha = read_remote_json(path, data)
    commit_file(path, json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8") + b"\n", message, sha)

def slugify(value):
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return value or f"work-{datetime.now():%Y%m%d%H%M%S}"

def split_csv(value):
    return [part.strip() for part in value.replace("，", ",").split(",") if part.strip()]

def login():
    configured = bool(secret("ADMIN_USERNAME") and secret("ADMIN_PASSWORD"))
    if not configured:
        st.error("尚未設定 ADMIN_USERNAME 與 ADMIN_PASSWORD。請建立 `.streamlit/secrets.toml`，格式可參考 `.streamlit/secrets.toml.example`。")
        st.stop()
    if st.session_state.get("authenticated"):
        return
    st.title("作品集管理")
    with st.form("login"):
        username = st.text_input("帳號")
        password = st.text_input("密碼", type="password")
        submitted = st.form_submit_button("登入")
    if submitted:
        if username == secret("ADMIN_USERNAME") and password == secret("ADMIN_PASSWORD"):
            st.session_state.authenticated = True
            st.rerun()
        st.error("帳號或密碼不正確。")
    st.stop()

def work_form(existing=None, form_key="work_form", category_options=None):
    existing = existing or {}
    category_options = sorted(set(category_options or []))
    current_category = existing.get("category", "")
    if current_category and current_category not in category_options:
        category_options.append(current_category)
    category_choices = ["未分類", *category_options, "＋新增分類"]
    category_index = category_choices.index(current_category) if current_category in category_choices else 0
    # 新增與編輯 tab 會同時建立在頁面中，因此每個表單必須有獨立 key。
    with st.form(form_key, clear_on_submit=existing == {}):
        left, right = st.columns(2)
        with left:
            title = st.text_input("作品名稱 *", existing.get("title", ""))
            selected_category = st.selectbox("分類", category_choices, index=category_index)
            category = st.text_input("新增分類", placeholder="例如：商業、活動、短影音") if selected_category == "＋新增分類" else ("" if selected_category == "未分類" else selected_category)
            short_description = st.text_area("簡短說明", existing.get("short_description", ""), height=100)
            description = st.text_area("完整作品說明", existing.get("description", ""), height=180)
            work_date = st.date_input("拍攝日期", value=date.fromisoformat(existing["work_date"]) if existing.get("work_date") else None)
            organization = st.text_input("合作單位", existing.get("collaboration", {}).get("organization", ""))
            collaboration_type = st.text_input("合作方式", existing.get("collaboration", {}).get("type", ""))
        with right:
            video_url = st.text_input("影片網址／嵌入網址", existing.get("video_url", ""))
            options = ["youtube", "vimeo", "embed"]
            current_type = existing.get("video_type", "youtube")
            video_type = st.selectbox("影片類型", options, index=options.index(current_type) if current_type in options else 0)
            cover_url = st.text_input("封面圖片網址", existing.get("cover_image", ""))
            upload = st.file_uploader("或上傳封面（最大 5 MB）", type=["jpg", "jpeg", "png", "webp"])
            roles = st.text_input("我的工作（以逗號分隔）", ", ".join(existing.get("my_role", [])))
            equipment = st.text_input("使用器材（以逗號分隔）", ", ".join(existing.get("equipment", [])))
            production_text = st.text_area("其他製作資訊（每行：欄位：內容）", "\n".join(f"{k}：{v}" for k,v in existing.get("production", {}).items()), height=100)
            featured = st.checkbox("精選作品", existing.get("featured", False))
            published = st.checkbox("已發布", existing.get("published", False))
            sort_order = st.number_input("排序（數字小的在前）", min_value=0, value=int(existing.get("sort_order", 999)), step=1)
        submitted = st.form_submit_button("儲存作品", type="primary")
    if not submitted:
        return None
    if not title.strip():
        st.error("請填寫作品名稱。")
        return None
    image_path = cover_url.strip()
    if upload:
        if upload.size > IMAGE_LIMIT:
            st.error("封面圖片不可超過 5 MB。")
            return None
        suffix = Path(upload.name).suffix.lower() or ".jpg"
        image_path = f"assets/covers/{slugify(title)}-{datetime.now():%Y%m%d%H%M%S}{suffix}"
        commit_file(image_path, upload.getvalue(), f"Upload cover image for {title}")
    production = {}
    for line in production_text.splitlines():
        if "：" in line: key, value = line.split("：", 1)
        elif ":" in line: key, value = line.split(":", 1)
        else: continue
        if key.strip() and value.strip(): production[key.strip()] = value.strip()
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    return {**existing, "id": existing.get("id") or slugify(title), "title": title.strip(), "slug": existing.get("slug") or slugify(title), "category": category.strip(), "short_description": short_description.strip(), "description": description.strip(), "video_url": video_url.strip(), "video_type": video_type, "cover_image": image_path, "work_date": work_date.isoformat() if work_date else "", "collaboration": {"organization": organization.strip(), "type": collaboration_type.strip()}, "my_role": split_csv(roles), "equipment": split_csv(equipment), "production": production, "featured": featured, "published": published, "sort_order": int(sort_order), "created_at": existing.get("created_at", now), "updated_at": now}

def manage_works(works):
    st.header("作品管理")
    st.caption("上傳封面與儲存作品會直接 Commit 至 GitHub，GitHub Pages 隨後重新部署。")
    categories = sorted({work.get("category", "").strip() for work in works if work.get("category", "").strip()})
    tabs = st.tabs(["作品列表", "新增作品", "編輯／刪除", "分類管理"])
    with tabs[0]:
        if works:
            st.dataframe([{"作品名稱":w.get("title"),"分類":w.get("category"),"合作單位":w.get("collaboration",{}).get("organization"),"拍攝日期":w.get("work_date"),"發布":w.get("published"),"精選":w.get("featured"),"排序":w.get("sort_order")} for w in sorted(works,key=lambda x:x.get("sort_order",999))], use_container_width=True, hide_index=True)
        else: st.info("尚無作品。")
    with tabs[1]:
        new_work = work_form(form_key="new_work_form", category_options=categories)
        if new_work:
            works.append(new_work); save_json(WORKS_PATH, works, f"Add work: {new_work['title']}"); st.success("已新增並提交 GitHub。重新整理後可看到最新資料。")
    with tabs[2]:
        if not works: st.info("尚無可編輯作品。 ")
        else:
            choices = {f"{w.get('title','未命名')} ({w.get('slug')})": i for i,w in enumerate(works)}
            chosen = st.selectbox("選擇作品", list(choices))
            index = choices[chosen]
            edited = work_form(works[index], form_key=f"edit_work_form_{works[index].get('id', index)}", category_options=categories)
            if edited:
                works[index] = edited; save_json(WORKS_PATH, works, f"Update work: {edited['title']}"); st.success("已更新並提交 GitHub。")
            st.divider(); st.warning("刪除作品只會刪除作品 JSON 紀錄，不會刪除既有封面檔案。")
            confirm = st.checkbox("我確定要刪除這個作品", key=f"delete-{index}")
            if st.button("刪除這個作品", type="secondary", disabled=not confirm):
                title = works[index].get("title", "work"); works.pop(index); save_json(WORKS_PATH, works, f"Delete work: {title}"); st.success("已刪除作品紀錄並提交 GitHub。"); st.rerun()
    with tabs[3]:
        st.caption("分類由作品資料自動產生；刪除分類後，該分類下的作品會改為「未分類」。")
        if not categories:
            st.info("目前沒有可管理的分類。")
        else:
            category = st.selectbox("選擇要刪除的分類", categories)
            affected = [work for work in works if work.get("category", "").strip() == category]
            st.warning(f"「{category}」目前套用在 {len(affected)} 件作品。")
            confirm_category = st.checkbox(f"我確定要刪除「{category}」並將作品改為未分類", key=f"delete-category-{category}")
            if st.button("刪除分類", type="secondary", disabled=not confirm_category):
                now = datetime.now().astimezone().isoformat(timespec="seconds")
                for work in affected:
                    work["category"] = ""
                    work["updated_at"] = now
                save_json(WORKS_PATH, works, f"Delete category: {category}")
                st.success("分類已刪除，受影響作品已改為未分類。")
                st.rerun()

def manage_site(site):
    st.header("網站內容管理")
    st.caption("網站名稱留白時，前台導覽列、標題與 SEO 都不會顯示品牌名稱。")
    with st.form("site_form"):
        basic, about, contact = st.tabs(["基本與首頁", "關於與服務", "聯絡與頁尾"])
        with basic:
            site_name = st.text_input("網站名稱", site.get("site_name", "")); tagline = st.text_input("網站標語", site.get("site_tagline", "")); h = site.get("hero", {})
            hero_title = st.text_area("Hero 標題", h.get("title", "")); hero_subtitle = st.text_input("Hero 副標題", h.get("subtitle", "")); hero_description = st.text_area("Hero 說明", h.get("description", "")); hero_button = st.text_input("Hero 按鈕文字", h.get("button_text", "")); hero_image = st.text_input("Hero 圖片網址", h.get("image", "")); f = site.get("featured", {})
            featured_title = st.text_input("精選作品標題", f.get("title", "")); featured_description = st.text_area("精選作品說明", f.get("description", ""))
        with about:
            a = site.get("about", {}); about_title = st.text_input("關於標題", a.get("title", "")); about_content = st.text_area("自我介紹", a.get("content", "")); philosophy = st.text_area("工作理念", a.get("philosophy", "")); about_other = st.text_area("其他說明", a.get("other", ""));
            services_json = st.text_area("服務（JSON 陣列；每項含 name、description）", json.dumps(site.get("services", []), ensure_ascii=False, indent=2), height=220)
            process = site.get("process", {})
            process_title = st.text_input("合作流程標題", process.get("title", "合作流程"))
            process_steps_json = st.text_area("合作流程（JSON 陣列）", json.dumps(process.get("steps", []), ensure_ascii=False, indent=2), height=140)
        with contact:
            c = site.get("contact", {}); contact_title = st.text_input("聯絡標題", c.get("title", "")); contact_description = st.text_area("聯絡說明", c.get("description", "")); email = st.text_input("Email", c.get("email", "")); instagram = st.text_input("Instagram 網址", c.get("instagram", "")); line = st.text_input("LINE 網址", c.get("line", "")); other = st.text_input("其他連結", c.get("other", "")); footer = st.text_input("Footer 文字", site.get("footer", {}).get("text", ""))
        submit = st.form_submit_button("儲存網站內容", type="primary")
    if submit:
        try:
            services = json.loads(services_json)
            process_steps = json.loads(process_steps_json)
        except json.JSONDecodeError:
            st.error("服務或合作流程欄位不是有效 JSON。請使用範例的陣列格式。")
            return
        if not isinstance(process_steps, list) or not all(isinstance(step, str) and step.strip() for step in process_steps):
            st.error("合作流程必須是由文字組成的 JSON 陣列。")
            return
        site.update({"site_name":site_name.strip(),"site_tagline":tagline.strip(),"hero":{"title":hero_title.strip(),"subtitle":hero_subtitle.strip(),"description":hero_description.strip(),"button_text":hero_button.strip(),"image":hero_image.strip()},"featured":{"title":featured_title.strip(),"description":featured_description.strip()},"about":{"title":about_title.strip(),"content":about_content.strip(),"philosophy":philosophy.strip(),"other":about_other.strip()},"services":services,"process":{"title":process_title.strip(),"steps":[step.strip() for step in process_steps]},"contact":{"title":contact_title.strip(),"description":contact_description.strip(),"email":email.strip(),"instagram":instagram.strip(),"line":line.strip(),"other":other.strip()},"footer":{"text":footer.strip()}})
        save_json(SITE_PATH, site, "Update site content"); st.success("網站內容已提交 GitHub。")

login()
try:
    site, _ = read_remote_json(SITE_PATH, {}); works, _ = read_remote_json(WORKS_PATH, [])
except Exception as exc:
    st.error(f"無法讀取作品資料：{exc}"); st.stop()

with st.sidebar:
    st.title("🎬 管理後台")
    page = st.radio("功能", ["儀表板", "作品管理", "網站內容管理"])
    if st.button("登出"):
        st.session_state.authenticated = False; st.rerun()
    st.caption("GitHub API：" + ("已設定" if github_ready() else "未設定（僅可讀本機範例）"))

if page == "儀表板":
    st.header("儀表板")
    cols = st.columns(4); published = sum(bool(w.get("published")) for w in works); featured = sum(bool(w.get("featured")) for w in works)
    for col, label, value in zip(cols, ["作品總數","已發布","草稿","精選作品"], [len(works),published,len(works)-published,featured]): col.metric(label, value)
    st.info("選擇左側「作品管理」或「網站內容管理」開始更新。")
elif page == "作品管理": manage_works(works)
else: manage_site(site)
