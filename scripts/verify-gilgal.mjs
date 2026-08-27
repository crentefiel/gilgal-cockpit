import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const fail = (message) => {
  process.stderr.write(`REAL GILGAL CONTRACT FAIL: ${message}\n`);
  process.exitCode = 1;
};

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const branch = git('branch', '--show-current');
const config = JSON.parse(readFileSync('gilgal.sentinel.json', 'utf8'));
const contracts = JSON.parse(readFileSync('gilgal.contracts.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

// REAL-GILGAL-01: STABLE never edited directly.
if (branch === config.stable.ref) fail('current AI workspace is STABLE.');

// REAL-GILGAL-02: candidate built from exact STABLE ancestry.
try { execFileSync('git', ['merge-base', '--is-ancestor', config.stable.ref, 'HEAD']); }
catch { fail('STABLE is not an ancestor of CANDIDATE.'); }

// REAL-GILGAL-03/04: required project commands exist.
if (!packageJson.scripts?.typecheck) fail('typecheck command missing.');
if (!packageJson.scripts?.test) fail('tests command missing.');

// REAL-GILGAL-05: the pure Gate engine and its contracts are versioned.
if (!existsSync('src/domain/gate.ts') || !existsSync('src/domain/cockpit.contracts.test.ts')) fail('Gate engine contracts missing.');

// REAL-GILGAL-06: Change Budget exists, is non-negative, and current diff fits.
const budget = config.changeBudget;
const values = [budget.maxFiles, budget.maxInsertions, budget.maxDeletions, budget.maxChangedLines];
if (!budget.enabled || values.some((value) => !Number.isFinite(value) || value < 0)) fail('Change Budget invalid.');
const diff = git('diff', '--numstat', config.stable.ref, 'HEAD').split(/\r?\n/).filter(Boolean);
let insertions = 0;
let deletions = 0;
for (const row of diff) {
  const [added, removed] = row.split('\t');
  insertions += Number(added) || 0;
  deletions += Number(removed) || 0;
}
if (diff.length > budget.maxFiles || insertions > budget.maxInsertions || deletions > budget.maxDeletions || insertions + deletions > budget.maxChangedLines) {
  fail('SCOPE EXPANSION DETECTED.');
}

// REAL-GILGAL-07: visual review remains manual and therefore PENDING until HUMAN approval.
const visual = contracts.contracts.find((contract) => contract.id === 'cockpit-visual-real');
if (!visual || visual.type !== 'manual' || !visual.critical) fail('critical manual visual contract missing.');

// REAL-GILGAL-08: candidate cannot auto-promote itself.
const operations = readFileSync('src/domain/operations.ts', 'utf8');
if (!operations.includes("state.role !== 'human'") || !operations.includes('evaluateGilgalGate(state)')) {
  fail('promotion role guard or Gate recheck missing.');
}

// REAL-GILGAL-09: operational mode reads real evidence through a local bridge without implementing Git promotion.
if (!existsSync('scripts/project-bridge.ts') || !existsSync('src/adapters/RealProjectAdapter.ts')) {
  fail('real project bridge or adapter missing.');
}

if (!process.exitCode) process.stdout.write('REAL-GILGAL-01..09 PASS\n');
