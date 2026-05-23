# APK Download Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the latest debug APKs for both apps at `https://arrashid.ennbi.com/downloads/` with a clean download page showing build date and commit.

**Architecture:** A `deploy-downloads` job is appended to the existing `build-apks.yml` GitHub Actions workflow. It runs after both build jobs, downloads their artifacts, generates a self-contained `index.html` with the build timestamp and commit SHA baked in, then SCPs everything to `/var/www/downloads/` on the production server. Nginx serves the directory with an `alias` location block added to the existing `khanqah` site config. Files on the server are overwritten on each deploy so the URL stays stable.

**Tech Stack:** GitHub Actions, bash heredoc (HTML generation), nginx alias + Content-Disposition, existing `DEPLOY_SSH_KEY` secret

---

## File Map

| File | Change |
|------|--------|
| `.github/workflows/build-apks.yml` | Add `deploy-downloads` job |
| `/etc/nginx/sites-enabled/khanqah` (on server) | Add `/downloads/` location block (one-time manual step) |

---

### Task 1: Server-side setup (one-time manual)

**Files:**
- Modify: `/etc/nginx/sites-enabled/khanqah` (on server at 165.22.208.103)

- [ ] **Step 1: SSH into the server**

```bash
ssh -i ~/Documents/Workspace/digiocean root@165.22.208.103
```

- [ ] **Step 2: Create the downloads directory**

```bash
mkdir -p /var/www/downloads
```

- [ ] **Step 3: Add the nginx location block**

Open `/etc/nginx/sites-enabled/khanqah` in an editor and add the following block **inside the `server {}` block that handles HTTPS (the one with `ssl_certificate` lines), immediately before the closing `}`**:

```nginx
location /downloads/ {
    alias /var/www/downloads/;
    location ~\.apk$ {
        add_header Content-Disposition "attachment";
    }
}
```

The file already has a `location /` block, a `location /hls` block, and a `location /api` block. Place this new block after all of them, before the closing `}`.

- [ ] **Step 4: Test and reload nginx**

```bash
nginx -t
```
Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

```bash
systemctl reload nginx
```

- [ ] **Step 5: Verify the location is live**

```bash
curl -I https://arrashid.ennbi.com/downloads/
```
Expected: `HTTP/2 404` or `HTTP/2 200` (404 is fine — directory is empty, nginx is routing correctly).

---

### Task 2: Add `deploy-downloads` job to the CI workflow

**Files:**
- Modify: `.github/workflows/build-apks.yml`

- [ ] **Step 1: Open the workflow file**

File: `.github/workflows/build-apks.yml`

Current content ends after the `build-admin-app` job. Append the following job at the end of the file (same indentation level as `build-user-app` and `build-admin-app`):

```yaml
  deploy-downloads:
    name: Deploy APK download page
    runs-on: ubuntu-latest
    needs: [build-user-app, build-admin-app]
    timeout-minutes: 10

    env:
      DEPLOY_HOST: 165.22.208.103
      DEPLOY_USER: root
      DEPLOY_DIR: /var/www/downloads

    steps:
      - name: Download user APK
        uses: actions/download-artifact@v4
        with:
          name: khanqah-user-debug
          path: artifacts/user

      - name: Download admin APK
        uses: actions/download-artifact@v4
        with:
          name: khanqah-admin-debug
          path: artifacts/admin

      - name: Rename APKs
        run: |
          cp artifacts/user/app-debug.apk khanqah-user.apk
          cp artifacts/admin/app-debug.apk khanqah-admin.apk

      - name: Generate index.html
        run: |
          BUILD_DATE=$(date -u '+%d %b %Y, %H:%M UTC')
          COMMIT_SHORT="${GITHUB_SHA::7}"
          cat > index.html <<HTML
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Khanqah — Test Builds</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: #022F2B;
                color: #F4EFE7;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 40px 16px;
              }
              h1 {
                font-size: 1.4rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                color: #D4AF37;
                margin-bottom: 6px;
              }
              .subtitle {
                font-size: 0.8rem;
                color: #A89674;
                letter-spacing: 0.1em;
                margin-bottom: 40px;
              }
              .cards {
                display: flex;
                flex-direction: column;
                gap: 20px;
                width: 100%;
                max-width: 420px;
              }
              .card {
                background: #0B4A43;
                border-radius: 16px;
                padding: 24px;
              }
              .card-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: #F4EFE7;
                margin-bottom: 10px;
              }
              .meta {
                font-size: 0.75rem;
                color: #A89674;
                line-height: 1.8;
                margin-bottom: 20px;
              }
              .meta span { display: block; }
              .btn {
                display: block;
                background: #D4AF37;
                color: #022F2B;
                text-decoration: none;
                font-weight: 700;
                font-size: 0.9rem;
                letter-spacing: 0.06em;
                text-align: center;
                padding: 14px;
                border-radius: 50px;
              }
              .footer {
                margin-top: 40px;
                font-size: 0.7rem;
                color: #A89674;
                opacity: 0.6;
              }
            </style>
          </head>
          <body>
            <h1>KHANQAH</h1>
            <p class="subtitle">TEST BUILDS</p>
            <div class="cards">
              <div class="card">
                <div class="card-title">Khanqah — User App</div>
                <div class="meta">
                  <span>Built: ${BUILD_DATE}</span>
                  <span>Commit: ${COMMIT_SHORT}</span>
                </div>
                <a class="btn" href="/downloads/khanqah-user.apk">Download APK</a>
              </div>
              <div class="card">
                <div class="card-title">Khanqah Admin</div>
                <div class="meta">
                  <span>Built: ${BUILD_DATE}</span>
                  <span>Commit: ${COMMIT_SHORT}</span>
                </div>
                <a class="btn" href="/downloads/khanqah-admin.apk">Download APK</a>
              </div>
            </div>
            <p class="footer">Debug builds — for testing only</p>
          </body>
          </html>
          HTML

      - name: Configure SSH
        run: |
          install -d -m 700 ~/.ssh
          printf '%s\n' "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts 2>/dev/null

      - name: Deploy to server
        run: |
          scp -i ~/.ssh/deploy_key \
            index.html \
            khanqah-user.apk \
            khanqah-admin.apk \
            "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_DIR/"
```

- [ ] **Step 2: Verify YAML indentation**

The `deploy-downloads:` key must be at the same indent level as `build-user-app:` and `build-admin-app:` (2 spaces from the start, under `jobs:`). Double-check no tabs are mixed in.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build-apks.yml
git commit -m "ci: add deploy-downloads job — serve APKs at /downloads"
git push origin main
```

---

### Task 3: Verify the deployment

- [ ] **Step 1: Watch the Actions run**

Go to `https://github.com/EnnBi/Khanqah/actions` and open the latest "Build APKs" workflow run triggered by the push. Confirm all three jobs pass: `Build user app APK`, `Build admin app APK`, `Deploy APK download page`.

- [ ] **Step 2: Check the page**

Open `https://arrashid.ennbi.com/downloads/` in a browser. You should see two cards with the build date and commit, each with a "Download APK" button.

- [ ] **Step 3: Test the downloads**

Click each button. The browser should prompt to download (not open) the APK file. Check the filenames are `khanqah-user.apk` and `khanqah-admin.apk`.

- [ ] **Step 4: Test on mobile**

Open the URL on an Android device. Tap a download button. Confirm the APK downloads and Android offers to install it (requires "Install unknown apps" enabled in settings, which your testers will need).
