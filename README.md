# QueueFlow

LINE 展覽排隊 · 入場核銷 · 活動管理系統

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_LIFF_ID=1234567890-xxxxxxxx
```

### 3. 建立 Supabase 資料庫

在 [Supabase SQL Editor](https://supabase.com/dashboard) 執行：

```
supabase/migrations/001_initial_schema.sql
```

### 4. 部署 Edge Functions

```bash
# 安裝 Supabase CLI
npm install -g supabase

# 登入
supabase login

# 設定 Secrets
supabase secrets set LINE_AUTH_SECRET=your-random-32-char-secret --project-ref YOUR_REF

# 部署
bash supabase/functions/deploy.sh
```

### 5. 建立第一個後台管理員

在 Supabase Dashboard > Authentication > Users > Add user：

- Email: `admin@yourbrand.com`
- Password: 自訂

### 6. 啟動開發伺服器

```bash
npm run dev
```

---

## 系統架構

```
前台（LINE/LIFF）          後台（管理者）
/queue/:slug               /admin/login
/my-ticket                 /admin/onboarding
/my-history                /admin/dashboard
                           /admin/events
                           /admin/events/:id/queue
                           /admin/events/:id/reports
```

## Edge Functions

| 函數 | 路徑 | 說明 |
|------|------|------|
| line-auth | POST /line-auth | LINE token 驗證，建立 Supabase session |
| onboarding | POST /onboarding | 品牌初始化設定 |
| take-ticket | POST /take-ticket | 前台領號 |
| checkin | POST /checkin | 入場核銷 |
| call-next | POST /call-next | 後台叫號 + LINE 推播 |

## 票券狀態

```
waiting → called → entered
              ↓
           skipped
              ↓
          cancelled
```

## 環境需求

- Node.js 18+
- Supabase 帳號
- LINE Developers 帳號（LINE Login Channel + Messaging API Channel）
