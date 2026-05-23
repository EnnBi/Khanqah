# APK Download Page — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose the latest debug APKs for both apps at a public URL (`arrashid.ennbi.com/downloads`) so testers can download them directly without needing WhatsApp or GitHub access.

**Architecture:** GitHub Actions builds both APKs, then a `deploy-downloads` job SSHes into the production server and copies the APKs plus a generated `index.html` to `/var/www/downloads/`. Nginx serves the directory statically. The HTML is generated at CI time with the build timestamp and commit SHA baked in — no JavaScript required.

**Tech Stack:** GitHub Actions, bash (CI), nginx (server), plain HTML/CSS (page)

---

## CI Changes

File modified: `.github/workflows/build-apks.yml`

A new job `deploy-downloads` is appended. It:
- `needs: [build-user-app, build-admin-app]` — only runs after both builds succeed
- Downloads both artifacts using `actions/download-artifact@v4`
- Generates `index.html` inline via a bash heredoc, with the build date (`$(date -u '+%d %b %Y, %H:%M UTC')`) and commit SHA (`${{ github.sha }}` truncated to 7 chars) baked in
- Configures SSH using the existing `secrets.DEPLOY_SSH_KEY` secret and host `165.22.208.103`
- `scp`s `index.html`, `khanqah-user.apk`, and `khanqah-admin.apk` to `root@165.22.208.103:/var/www/downloads/`

No new GitHub Secrets are needed — `DEPLOY_SSH_KEY` is already used by `deploy-backend.yml`.

## Server Setup (one-time)

Run once on `165.22.208.103`:
```bash
mkdir -p /var/www/downloads
```

Add to the nginx config for `arrashid.ennbi.com` (inside the existing `server {}` block):
```nginx
location /downloads/ {
    alias /var/www/downloads/;
    location ~\.apk$ {
        add_header Content-Disposition "attachment";
    }
}
```

Reload nginx once after adding the location block:
```bash
nginx -t && systemctl reload nginx
```

After this one-time setup, CI deploys new files on every push — no further nginx changes needed.

## Download Page

Static `index.html` served at `https://arrashid.ennbi.com/downloads/`.

Content:
- Page title: "Khanqah — Test Builds"
- Two cards, one per app:
  - **Khanqah** (user app) — build date/time (UTC), commit SHA (7 chars), "Download APK" button linking to `/downloads/khanqah-user.apk`
  - **Khanqah Admin** (admin app) — same info, "Download APK" button linking to `/downloads/khanqah-admin.apk`
- Both cards share the same build timestamp and commit (both apps built in the same CI run)
- Mobile-friendly layout (single column, large tap targets)
- Minimal styling — dark green / gold consistent with the app brand, no external dependencies

## Artifact Filenames

| File | Source artifact | Destination on server |
|------|----------------|----------------------|
| `khanqah-user.apk` | `khanqah-user-debug/app-debug.apk` | `/var/www/downloads/khanqah-user.apk` |
| `khanqah-admin.apk` | `khanqah-admin-debug/app-debug.apk` | `/var/www/downloads/khanqah-admin.apk` |
| `index.html` | Generated in CI | `/var/www/downloads/index.html` |

Filenames on the server are fixed (not versioned) — each push overwrites the previous build. This keeps the URL stable for testers.

## Out of Scope

- Authentication / password protection on the page
- Build history / changelog
- iOS builds
- Release (signed) APKs — debug only
