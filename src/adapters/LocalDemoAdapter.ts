import type { CockpitData } from '../domain/types';
import { freshDemoData } from '../demo/demoData';
import type { GilgalAdapter } from './GilgalAdapter';

export const STORAGE_KEY = 'gilgal-cockpit:state';
export const SCHEMA_VERSION = 1;

type StorageEnvelope = { schemaVersion: number; data: CockpitData };

function isCockpitData(value: unknown): value is CockpitData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CockpitData>;
  return Boolean(
    data.stable && typeof data.stable.sha === 'string' &&
    data.candidate && typeof data.candidate.sha === 'string' &&
    Array.isArray(data.checks) && Array.isArray(data.history) &&
    (data.role === 'human' || data.role === 'agent'),
  );
}

export class LocalDemoAdapter implements GilgalAdapter {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): CockpitData {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return freshDemoData();
      const envelope = JSON.parse(raw) as Partial<StorageEnvelope>;
      const migrated = this.migrate(envelope);
      return migrated ?? freshDemoData();
    } catch {
      return freshDemoData();
    }
  }

  save(data: CockpitData): void {
    const envelope: StorageEnvelope = { schemaVersion: SCHEMA_VERSION, data };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }

  reset(): CockpitData {
    this.storage.removeItem(STORAGE_KEY);
    return freshDemoData();
  }

  private migrate(envelope: Partial<StorageEnvelope>): CockpitData | null {
    if (envelope.schemaVersion === SCHEMA_VERSION && isCockpitData(envelope.data)) return envelope.data;
    return null;
  }
}

