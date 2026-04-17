import {
  pushLogEntry,
  getLogBuffer,
  clearLogBuffer,
  serializeLogArgs,
  installConsolePatch,
  __restoreConsoleForTest,
} from '../../services/log-buffer';
import { LOG_BUFFER_SIZE } from '../../services/bug-reporter-types';

describe('log-buffer', () => {
  beforeEach(() => {
    clearLogBuffer();
  });

  it('starts empty', () => {
    expect(getLogBuffer()).toEqual([]);
  });

  it('pushes an entry', () => {
    pushLogEntry('log', 'hello');
    const buf = getLogBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].level).toBe('log');
    expect(buf[0].message).toBe('hello');
    expect(buf[0].timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('keeps at most LOG_BUFFER_SIZE entries (FIFO drop)', () => {
    for (let i = 0; i < LOG_BUFFER_SIZE + 10; i++) {
      pushLogEntry('log', `msg-${i}`);
    }
    const buf = getLogBuffer();
    expect(buf).toHaveLength(LOG_BUFFER_SIZE);
    expect(buf[0].message).toBe('msg-10');
    expect(buf[buf.length - 1].message).toBe(`msg-${LOG_BUFFER_SIZE + 9}`);
  });

  it('getLogBuffer returns a copy (caller mutation does not affect buffer)', () => {
    pushLogEntry('log', 'a');
    const buf = getLogBuffer();
    buf.push({ timestamp: 'x', level: 'log', message: 'injected' });
    expect(getLogBuffer()).toHaveLength(1);
  });

  it('clearLogBuffer empties the buffer', () => {
    pushLogEntry('log', 'a');
    pushLogEntry('log', 'b');
    clearLogBuffer();
    expect(getLogBuffer()).toEqual([]);
  });
});

describe('serializeLogArgs', () => {
  it('stringifies plain args separated by spaces', () => {
    expect(serializeLogArgs(['hi', 42, true])).toBe('hi 42 true');
  });

  it('serializes objects with JSON', () => {
    expect(serializeLogArgs([{ a: 1 }])).toBe('{"a":1}');
  });

  it('handles circular references gracefully', () => {
    const o: any = { name: 'x' };
    o.self = o;
    const out = serializeLogArgs([o]);
    expect(out).toContain('[Circular]');
  });

  it('handles Error objects by showing message', () => {
    expect(serializeLogArgs([new Error('boom')])).toContain('boom');
  });
});

describe('installConsolePatch', () => {
  afterEach(() => {
    __restoreConsoleForTest();
    clearLogBuffer();
  });

  it('captures console.log calls into the buffer', () => {
    installConsolePatch();
    console.log('captured');
    const buf = getLogBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].level).toBe('log');
    expect(buf[0].message).toBe('captured');
  });

  it('captures console.warn and console.error', () => {
    installConsolePatch();
    console.warn('w');
    console.error('e');
    const buf = getLogBuffer();
    expect(buf.map((e) => e.level)).toEqual(['warn', 'error']);
  });

  it('calling installConsolePatch twice is idempotent', () => {
    installConsolePatch();
    installConsolePatch();
    console.log('once');
    expect(getLogBuffer()).toHaveLength(1);
  });
});
