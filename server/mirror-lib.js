// Pure helpers for the mirror worker. No IO. Unit-tested in isolation.

function buildYtDlpArgs(format, outPathTemplate, url, cookiesPath) {
  // YouTube's bot check increasingly demands a logged-in session. If the
  // caller tells us a cookies file exists, include it so yt-dlp can send
  // YouTube cookies and slip past the "Sign in to confirm you're not a
  // bot" gate.
  const cookieArgs = cookiesPath ? ['--cookies', cookiesPath] : [];

  // Force yt-dlp to prefer clients that historically slip past the bot
  // challenge even without cookies: tv_embedded + tv_simply are the
  // embedded-TV JS surfaces (very light on auth), mweb is the mobile
  // web client (fewer anti-bot signals). `default` falls back to the
  // normal rotation if the preferred clients get rate-limited.
  const extractorArgs = [
    '--extractor-args',
    'youtube:player_client=tv_embedded,tv_simply,mweb,default',
  ];

  if (format === 'audio') {
    return [
      ...cookieArgs,
      ...extractorArgs,
      '-x', '--audio-format', 'mp3', '--audio-quality', '128K',
      '-o', outPathTemplate, url,
    ];
  }
  if (format === 'video') {
    return [
      ...cookieArgs,
      ...extractorArgs,
      '-f', 'bv*[height<=720]+ba/b[height<=720]',
      '--merge-output-format', 'mp4',
      '-o', outPathTemplate, url,
    ];
  }
  throw new Error(`unknown format: ${format}`);
}

function buildArchiveIdentifier(contentId) {
  return `khanqah-yt-${contentId}`;
}

function buildArchiveDownloadUrl(identifier, filename) {
  return `https://archive.org/download/${identifier}/${filename}`;
}

function buildArchiveUploadUrl(identifier, filename) {
  return `http://s3.us.archive.org/${identifier}/${filename}`;
}

function buildArchiveHeaders({ format, title, accessKey, secretKey }) {
  const isAudio = format === 'audio';
  return {
    'x-amz-auto-make-bucket': '1',
    'x-archive-meta-collection': isAudio ? 'opensource_audio' : 'opensource_movies',
    'x-archive-meta-mediatype':  isAudio ? 'audio'             : 'movies',
    'x-archive-meta-title':      title,
    authorization:               `LOW ${accessKey}:${secretKey}`,
  };
}

function tailStderr(stderr, limit = 2000) {
  if (!stderr) return '';
  const s = String(stderr);
  return s.length <= limit ? s : s.slice(-limit);
}

module.exports = {
  buildYtDlpArgs,
  buildArchiveIdentifier,
  buildArchiveDownloadUrl,
  buildArchiveUploadUrl,
  buildArchiveHeaders,
  tailStderr,
};
