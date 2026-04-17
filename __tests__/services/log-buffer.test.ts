import {
  pushLogEntry,
  getLogBuffer,
  clearLogBuffer,
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
