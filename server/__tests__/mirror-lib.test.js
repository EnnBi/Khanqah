const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildYtDlpArgs,
  buildArchiveIdentifier,
  buildArchiveDownloadUrl,
  buildArchiveUploadUrl,
  buildArchiveHeaders,
  tailStderr,
} = require('../mirror-lib');

test('buildYtDlpArgs: audio', () => {
  const args = buildYtDlpArgs('audio', '/tmp/mirror/abc.%(ext)s', 'https://youtu.be/xyz');
  assert.deepEqual(args, [
    '-x', '--audio-format', 'mp3', '--audio-quality', '128K',
    '-o', '/tmp/mirror/abc.%(ext)s', 'https://youtu.be/xyz',
  ]);
});

test('buildYtDlpArgs: video is capped at 720p for disk + bandwidth sanity', () => {
  const args = buildYtDlpArgs('video', '/tmp/mirror/abc.%(ext)s', 'https://youtu.be/xyz');
  assert.deepEqual(args, [
    '-f', 'bv*[height<=720]+ba/b[height<=720]',
    '--merge-output-format', 'mp4',
    '-o', '/tmp/mirror/abc.%(ext)s', 'https://youtu.be/xyz',
  ]);
});

test('buildYtDlpArgs: unknown format throws', () => {
  assert.throws(() => buildYtDlpArgs('gif', '/tmp/x', 'url'), /unknown format/i);
});

test('buildArchiveIdentifier: prefixed with khanqah-yt-', () => {
  assert.equal(
    buildArchiveIdentifier('e3a2-4b1f-9c8d'),
    'khanqah-yt-e3a2-4b1f-9c8d',
  );
});

test('buildArchiveDownloadUrl', () => {
  assert.equal(
    buildArchiveDownloadUrl('khanqah-yt-abc', 'abc.mp3'),
    'https://archive.org/download/khanqah-yt-abc/abc.mp3',
  );
});

test('buildArchiveUploadUrl', () => {
  assert.equal(
    buildArchiveUploadUrl('khanqah-yt-abc', 'abc.mp3'),
    'http://s3.us.archive.org/khanqah-yt-abc/abc.mp3',
  );
});

test('buildArchiveHeaders: audio', () => {
  const h = buildArchiveHeaders({
    format: 'audio', title: 'Jummah Bayan', accessKey: 'AK', secretKey: 'SK',
  });
  assert.equal(h['x-amz-auto-make-bucket'], '1');
  assert.equal(h['x-archive-meta-collection'], 'opensource_audio');
  assert.equal(h['x-archive-meta-mediatype'], 'audio');
  assert.equal(h['x-archive-meta-title'], 'Jummah Bayan');
  assert.equal(h.authorization, 'LOW AK:SK');
});

test('buildArchiveHeaders: video uses the movies collection', () => {
  const h = buildArchiveHeaders({
    format: 'video', title: 'Short Clip', accessKey: 'AK', secretKey: 'SK',
  });
  assert.equal(h['x-archive-meta-collection'], 'opensource_movies');
  assert.equal(h['x-archive-meta-mediatype'], 'movies');
});

test('tailStderr: passes short strings through', () => {
  assert.equal(tailStderr('boom'), 'boom');
});

test('tailStderr: keeps only the trailing N chars for long strings', () => {
  const long = 'x'.repeat(5000);
  const tail = tailStderr(long, 2000);
  assert.equal(tail.length, 2000);
  assert.equal(tail, 'x'.repeat(2000));
});

test('tailStderr: handles empty / nullish input', () => {
  assert.equal(tailStderr(undefined), '');
  assert.equal(tailStderr(null), '');
  assert.equal(tailStderr(''), '');
});
