#!/bin/bash
# record-and-upload.sh
# Called by nginx-rtmp exec_record_done
# Args: $1 = recording path, $2 = basename

# Load credentials from .env file
source /opt/khanqah/.env 2>/dev/null || true

RECORDING_PATH="$1"
BASENAME="$2"
MP3_PATH="/tmp/recordings/${BASENAME}.mp3"
IA_IDENTIFIER="khanqah-$(date +%Y%m%d-%H%M%S)"

# Configuration (set these as environment variables)
# IA_ACCESS_KEY, IA_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

# Step 1: Convert FLV to MP3
ffmpeg -i "$RECORDING_PATH" -vn -acodec libmp3lame -ab 128k "$MP3_PATH" -y

# Step 2: Upload to Internet Archive
curl -s --location --header "x-amz-auto-make-bucket:1" \
  --header "x-archive-meta-collection:opensource_audio" \
  --header "x-archive-meta-mediatype:audio" \
  --header "x-archive-meta-title:${BASENAME}" \
  --header "authorization: LOW ${IA_ACCESS_KEY}:${IA_SECRET_KEY}" \
  --upload-file "$MP3_PATH" \
  "http://s3.us.archive.org/${IA_IDENTIFIER}/${BASENAME}.mp3"

ARCHIVE_URL="https://archive.org/download/${IA_IDENTIFIER}/${BASENAME}.mp3"

# Step 3: Update live_sessions in Supabase (find the most recent 'processing' session)
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/live_sessions?status=eq.processing&order=started_at.desc&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"recording_url\": \"${ARCHIVE_URL}\", \"status\": \"ended\"}"

# Step 4: Cleanup
rm -f "$RECORDING_PATH" "$MP3_PATH"

echo "Upload complete: $ARCHIVE_URL"
