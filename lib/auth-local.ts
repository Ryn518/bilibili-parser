'use client';

import { CONFIG } from './config';
import { getStorageItem, setStorageItem } from './storage';

export interface LocalAuthRecord {
  salt: string;
  hash: string;
}

function normalizeUsername(name: string) {
  return String(name || '').trim().toLowerCase();
}

function loadRecords(): Record<string, LocalAuthRecord> {
  return getStorageItem<Record<string, LocalAuthRecord>>(CONFIG.AUTH_RECORDS_KEY, {});
}

export function getLocalAuthRecord(username: string): LocalAuthRecord | null {
  const key = normalizeUsername(username);
  if (!key) return null;
  return loadRecords()[key] || null;
}

export function saveLocalAuthRecord(username: string, record: LocalAuthRecord) {
  const key = normalizeUsername(username);
  if (!key) return;
  const records = loadRecords();
  records[key] = record;
  setStorageItem(CONFIG.AUTH_RECORDS_KEY, records);
}

export function hasLocalAuthRecord(username: string) {
  return !!getLocalAuthRecord(username);
}
