import { describe, expect, it } from 'vitest';
import { viewJsonpUrl } from './bilibili-jsonp';

describe('viewJsonpUrl', () => {
  it('asks the public view endpoint to call back with a script', () => {
    const url = new URL(viewJsonpUrl({ bvid: 'BV1GJ411x7h7' }, 'dayplan_cb'));
    expect(url.origin + url.pathname).toBe('https://api.bilibili.com/x/web-interface/view');
    expect(url.searchParams.get('bvid')).toBe('BV1GJ411x7h7');
    expect(url.searchParams.get('jsonp')).toBe('jsonp');
    expect(url.searchParams.get('callback')).toBe('dayplan_cb');
  });

  it('rejects a callback that could break out of the script', () => {
    expect(() => viewJsonpUrl({ aid: '2' }, 'cb();alert(1)')).toThrow('回调名无效');
  });
});
