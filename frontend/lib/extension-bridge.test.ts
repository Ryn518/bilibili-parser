import { describe, expect, it } from 'vitest';
import { hostNeedsExtension } from './extension-bridge';

describe('hostNeedsExtension', () => {
  it('asks the public site to use the extension', () => {
    expect(hostNeedsExtension('kebiaoplan.cn')).toBe(true);
    expect(hostNeedsExtension('www.kebiaoplan.cn')).toBe(true);
  });

  it('lets local development keep the server path', () => {
    expect(hostNeedsExtension('localhost')).toBe(false);
    expect(hostNeedsExtension('127.0.0.1')).toBe(false);
  });
});
