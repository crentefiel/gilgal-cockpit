import type { CockpitData } from '../domain/types';

export interface GilgalAdapter {
  load(): CockpitData;
  save(data: CockpitData): void;
  reset(): CockpitData;
}

// V2 seam only. A real implementation may call Sentinel CLI and read Git evidence.
// It is intentionally not implemented in Local Demo Mode.
export type SentinelGitAdapter = GilgalAdapter;

