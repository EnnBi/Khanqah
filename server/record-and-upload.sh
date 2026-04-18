#!/bin/bash
# record-and-upload.sh
# Called by nginx-rtmp exec_record_done
# Args: $1 = recording path, $2 = basename
#
# Flow:
#   1. FLV → MP3
#   2. Pull the processing live_sessions row (title, started_by)
#   3. Upload MP3 to archive.org with the session's title
#   4. Insert a row into `content` under the "Live Sessions" category
#      so the recording shows up in the public library
#   5. Mark live_sessions.status='ended' with recording_url
#   6. Clean up the temp files

set -u

source /opt/khanqah/.env 2>/dev/null || true

RECORDING_PATH="$1"
BASENAME="$2"
MP3_PATH="/tmp/recordings/${BASENAME}.mp3"
IA_IDENTIFIER="khanqah-$(date +%Y%m%d-%H%M%S)"
ARCHIVE_URL="https://archive.org/download/${IA_IDENTIFIER}/${BASENAME}.mp3"

# ── 1. FLV → MP3 ─────────────────────────────────────────────
ffmpeg -i "$RECORDING_PATH" -vn -acodec libmp3lame -ab 128k "$MP3_PATH" -y

# ── 2. Look up the pending session (most recent 'processing' row) ──
SESSION_JSON=$(curl -s \
  "${SUPABASE_URL}/rest/v1/live_sessions?status=eq.processing&order=started_at.desc&limit=1&select=id,title_en,title_ur,started_by" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

SESSION_ID=$(printf '%s' "$SESSION_JSON" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if d else "")')
TITLE_EN=$(printf '%s' "$SESSION_JSON" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0].get("title_en","") if d else "")')
TITLE_UR=$(printf '%s' "$SESSION_JSON" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0].get("title_ur","") if d else "")')
STARTED_BY=$(printf '%s' "$SESSION_JSON" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0].get("started_by","") if d else "")')

if [ -z "$TITLE_EN" ]; then TITLE_EN="$BASENAME"; fi
if [ -z "$TITLE_UR" ]; then TITLE_UR="$TITLE_EN"; fi

# ── 3. Upload MP3 to Internet Archive with the session title ──
curl -s --location --header "x-amz-auto-make-bucket:1" \
  --header "x-archive-meta-collection:opensource_audio" \
  --header "x-archive-meta-mediatype:audio" \
  --header "x-archive-meta-title:${TITLE_EN}" \
  --header "authorization: LOW ${IA_ACCESS_KEY}:${IA_SECRET_KEY}" \
  --upload-file "$MP3_PATH" \
  "http://s3.us.archive.org/${IA_IDENTIFIER}/${BASENAME}.mp3"

# ── 4. Insert a content row so the recording shows up publicly ──
# Look up the "Live Sessions" bayan category (seeded by migration 006).
CAT_JSON=$(curl -s \
  "${SUPABASE_URL}/rest/v1/categories?name_en=eq.Live%20Sessions&type=eq.bayan&limit=1&select=id" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")
CATEGORY_ID=$(printf '%s' "$CAT_JSON" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if d else "")')

if [ -n "$CATEGORY_ID" ] && [ -n "$STARTED_BY" ]; then
  CONTENT_PAYLOAD=$(python3 -c "
import json
print(json.dumps({
  'title_en': '''$TITLE_EN''',
  'title_ur': '''$TITLE_UR''',
  'type': 'bayan',
  'category_id': '$CATEGORY_ID',
  'media_url': '$ARCHIVE_URL',
  'uploaded_by': '$STARTED_BY',
  'is_video': False,
  'mirror_status': 'not_applicable',
}))
")
  curl -s -X POST "${SUPABASE_URL}/rest/v1/content" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$CONTENT_PAYLOAD"
else
  echo "[record-and-upload] skipping content insert — missing category_id ('$CATEGORY_ID') or started_by ('$STARTED_BY')"
fi

# ── 5. Mark the live_sessions row as ended with recording_url ──
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/live_sessions?status=eq.processing&order=started_at.desc&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"recording_url\": \"${ARCHIVE_URL}\", \"status\": \"ended\"}"

# ── 6. Cleanup ────────────────────────────────────────────────
rm -f "$RECORDING_PATH" "$MP3_PATH"

echo "Upload complete: $ARCHIVE_URL (session: $SESSION_ID)"
