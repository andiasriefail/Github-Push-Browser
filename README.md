# gitpush

Upload files to GitHub directly from your browser — no terminal, no installation required.

🔗 **Demo:** https://gitpush-browser.vercel.app/

---

## Features

- Upload files/folders to GitHub repo via drag & drop
- Auto-extract `.zip`, folder structure preserved
- Browse repo — view, edit, download, rename, delete files
- **Upload images → raw URL directly to clipboard** (for README, etc.)
- Copy raw/blob URL after upload
- Rename / move files in repo
- Download single file or entire repo as ZIP
- Bulk rename & drag reorder files before push
- Create new repo & branch
- Commit history saved locally (IndexedDB)
- No server — all requests go directly to `api.github.com`
- Token saved in IndexedDB on your device only

---

## How to use

### 1. Login

Two ways:

**Personal Access Token (PAT)** — simplest
1. Go to https://github.com/settings/tokens/new?scopes=repo&description=gitpush
2. Select **repo** scope, set expiration
3. Copy token → paste in PAT field in gitpush → click Connect

**GitHub OAuth** — for self-hosting (see deploy section)

---

## Deploy yourself

### Vercel

Required file structure:

```
/
├── index.html
├── vercel.json
└── api/
    └── oauth-callback.js
```

**`vercel.json`** sets security headers and serverless functions:

```json
{
  "version": 2,
  "functions": {
    "api/oauth-callback.js": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",             "value": "DENY" },
        { "key": "X-Content-Type-Options",       "value": "nosniff" },
        { "key": "X-DNS-Prefetch-Control",       "value": "on" },
        { "key": "Referrer-Policy",              "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",           "value": "geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()" },
        { "key": "Content-Security-Policy",      "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis[...]
        { "key": "Strict-Transport-Security",    "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Cross-Origin-Opener-Policy",   "value": "same-origin" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

> **Why no CORS in `vercel.json`?**
> CORS for `/api/oauth-callback` is set directly in `api/oauth-callback.js` via `res.setHeader(...)`. Duplicating it in `vercel.json` could cause conflicts.

**`api/oauth-callback.js`** uses Node.js format (`req, res`) — Vercel Serverless Functions format.

Environment variables (set in Vercel Dashboard → Settings → Environment Variables):
```
GITHUB_CLIENT_ID=Iv1.xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
```

---

### Cloudflare Pages

Required file structure:

```
/
├── index.html
├── _headers
└── functions/
    └── api/
        └── oauth-callback.js
```

**`_headers`** sets security headers — **only read by Cloudflare Pages** (and Netlify). Vercel ignores this file:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-DNS-Prefetch-Control: on
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gst[...]
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/api/*
  Cache-Control: no-store
```

> **Why no CORS in `_headers`?**
> CORS for `/api/oauth-callback` is set in `functions/api/oauth-callback.js` via `Response` headers. Same as Vercel — no need to duplicate in `_headers`.

**`functions/api/oauth-callback.js`** uses Web API format (`Request`/`Response`) — Cloudflare Pages Functions format. **Different from Vercel version** which uses Node.js `req/res`.

| | Vercel | Cloudflare Pages |
|---|---|---|
| File handler | `api/oauth-callback.js` | `functions/api/oauth-callback.js` |
| Format | Node.js `(req, res)` | Web API `({ request, env })` |
| Environment variables | `process.env.XXX` | `env.XXX` |
| CORS | `res.setHeader(...)` | Via `Response` object |
| URL called by browser | `/api/oauth-callback` | `/api/oauth-callback` |

URL is exactly the same — Cloudflare automatically routes `/api/*` to `/functions/api/*`.

Environment variables (set in Cloudflare Dashboard → Pages → Settings → Environment Variables):
```
GITHUB_CLIENT_ID=Iv1.xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
```

---

## Difference between `vercel.json` vs `_headers`

| | `vercel.json` | `_headers` |
|---|---|---|
| Read by | Vercel only | Cloudflare Pages, Netlify |
| Format | JSON | Plain text |
| Location | project root | project root |
| Configures | Headers + Functions config | Headers only |

Both exist in this repo. Vercel reads `vercel.json` and ignores `_headers`. Cloudflare Pages reads `_headers` and ignores `vercel.json`. No conflicts.

---

## Security headers explained

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevent page from being opened in iframe (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Browser cannot guess file type |
| `X-DNS-Prefetch-Control` | `on` | Speed up DNS lookup to api.github.com |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer info leakage to other domains |
| `Permissions-Policy` | `geolocation=(), camera=(), ...` | Disable all unused browser APIs |
| `Content-Security-Policy` | (see below) | Whitelist sources for loadable resources |
| `Strict-Transport-Security` | `max-age=63072000` | Force HTTPS for 2 years |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate tabs, required for reliable `clipboard.writeText()` |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevent resource hotlinking from other domains |

**CSP breakdown:**
```
default-src 'self'
  → all resources must be from own domain, except those listed below

script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com
  → scripts can be inline (for <script> in index.html) + JSZip from cdnjs

style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  → inline styles allowed + Google Fonts CSS

font-src https://fonts.gstatic.com
  → fonts only from Google Fonts CDN

img-src 'self' https://avatars.githubusercontent.com https://raw.githubusercontent.com data: blob:
  → GitHub avatars, raw images from repo, data URIs, blob URLs (for downloads)

connect-src 'self' https://api.github.com https://github.com https://raw.githubusercontent.com
  → fetch/XHR only to GitHub API, GitHub OAuth, and GitHub raw content

worker-src blob:
  → allow JSZip to use blob URL for Web Worker when extracting large ZIPs

frame-ancestors 'none'
  → cannot be embedded in iframe on any domain
```

---

## Security

- All GitHub API requests are made **directly from your browser** — no proxy server touches your token
- Token is stored in **IndexedDB** on your device, never sent to gitpush server
- The only thing that touches the server (Vercel/CF Pages) is OAuth callback — only to exchange temporary `code` for `access_token`, and that `code` is single-use only
- Verify yourself: open DevTools → Network → all requests go only to `api.github.com`

---

## License

MIT
