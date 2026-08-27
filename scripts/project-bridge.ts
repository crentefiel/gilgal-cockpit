import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve, dirname } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

interface ProjectMetadata {
  name: string;
  path: string;
  url: string;
  openLabel: string;
  description?: string;
}

const DEFAULT_PROJECT_ROOT = 'D:\\SINUCA-GILGAL';
const COCKPIT_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

function loadProjectMetadata(projectRoot: string): ProjectMetadata | null {
  const configPath = resolve(projectRoot, 'project.config.json');
  if (existsSync(configPath)) {
    try { return readJson(configPath) as ProjectMetadata; } catch { }
  }
  const cockpitConfigPath = resolve(COCKPIT_ROOT, 'project.config.json');
  if (existsSync(cockpitConfigPath)) {
    try { return readJson(cockpitConfigPath) as ProjectMetadata; } catch { }
  }
  return null;
}

function git(projectRoot: string, args: string[]): string {
  try { return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' }).trim(); } catch { return ''; }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function latestReport(projectRoot: string): { path: string; report: unknown } | null {
  const directory = resolve(projectRoot, '.gilgal/reports');
  if (!existsSync(directory)) return null;
  const file = readdirSync(directory).filter((name) => name.startsWith('sentinel-') && name.endsWith('.json')).sort().at(-1);
  return file ? { path: resolve(directory, file), report: readJson(resolve(directory, file)) } : null;
}

export function readProject(projectRoot = process.env.GILGAL_COCKPIT_PROJECT ?? DEFAULT_PROJECT_ROOT) {
  const configPath = resolve(projectRoot, 'gilgal.sentinel.json');
  if (!existsSync(configPath)) throw new Error(`Projeto GILGAL não encontrado em ${projectRoot}.`);
  const latest = latestReport(projectRoot);
  const metadata = loadProjectMetadata(projectRoot);
  return {
    project: {
      name: metadata?.name ?? basename(projectRoot).replaceAll('-', ' '),
      path: projectRoot,
      gameUrl: metadata?.url ?? process.env.GILGAL_COCKPIT_PROJECT_URL ?? 'http://127.0.0.1:5180/',
      openLabel: metadata?.openLabel ?? 'ABRIR PROJETO',
      branch: git(projectRoot, ['branch', '--show-current']),
      headSha: git(projectRoot, ['rev-parse', 'HEAD']),
      dirty: Boolean(git(projectRoot, ['status', '--porcelain'])),
      reportPath: latest?.path ?? null,
    },
    config: readJson(configPath), report: latest?.report ?? null,
  };
}

function runCli(projectRoot: string, args: string[]): Promise<{ exitCode: number; output: string }> {
  const cli = resolve(projectRoot, '.gilgal/reference/sentinel/dist/src/cli.js');
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [cli, 'sentinel', ...args, '--config', 'gilgal.sentinel.json'], { cwd: projectRoot, windowsHide: true });
    let output = '';
    child.stdout.on('data', (chunk) => { output += String(chunk); });
    child.stderr.on('data', (chunk) => { output += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => resolveRun({ exitCode: code ?? 1, output }));
  });
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += String(chunk); if (body.length > 4096) reject(new Error('Corpo da requisição muito grande.')); });
    request.on('end', () => resolveBody(body));
    request.on('error', reject);
  });
}

export function gilgalProjectBridge(): Plugin {
  const projectRoot = process.env.GILGAL_COCKPIT_PROJECT ?? DEFAULT_PROJECT_ROOT;
  return {
    name: 'gilgal-project-bridge',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = request.url?.split('?')[0];
        if (!url?.startsWith('/api/project')) return next();
        try {
          if (url === '/api/project' && request.method === 'GET') return sendJson(response, 200, { data: readProject(projectRoot) });
          if (url === '/api/project/run-sentinel' && request.method === 'POST') {
            const run = await runCli(projectRoot, ['check']);
            if (run.exitCode === 3 || run.exitCode === 4) return sendJson(response, 500, { message: `Sentinel erro operacional (exit ${run.exitCode}).`, output: run.output.slice(-4000) });
            return sendJson(response, 200, { data: readProject(projectRoot), message: `Sentinel concluído com exit ${run.exitCode}.` });
          }
          if (url === '/api/project/approve' && request.method === 'POST') {
            const body = JSON.parse(await readBody(request)) as { contractId?: string };
            if (!body.contractId || !/^[a-z0-9-]{1,100}$/i.test(body.contractId)) return sendJson(response, 400, { message: 'Contrato manual inválido.' });
            const contracts = readJson(resolve(projectRoot, 'gilgal.contracts.json')) as { contracts?: Array<{ id: string; type: string }> };
            if (!contracts.contracts?.some((contract) => contract.id === body.contractId && contract.type === 'manual')) return sendJson(response, 400, { message: 'O contrato informado não é uma validação humana.' });
            const approval = await runCli(projectRoot, ['approve', body.contractId]);
            if (approval.exitCode !== 0) return sendJson(response, 500, { message: 'Não foi possível registrar a aprovação.', output: approval.output.slice(-4000) });
            const check = await runCli(projectRoot, ['check']);
            if (check.exitCode === 3 || check.exitCode === 4) return sendJson(response, 500, { message: 'Aprovação registrada, mas a nova análise falhou.', output: check.output.slice(-4000) });
            return sendJson(response, 200, { data: readProject(projectRoot), message: 'Aprovação humana vinculada ao SHA atual e Sentinel executado novamente.' });
          }
          return sendJson(response, 404, { message: 'Rota operacional não encontrada.' });
        } catch (error) {
          return sendJson(response, 500, { message: error instanceof Error ? error.message : 'Erro operacional desconhecido.' });
        }
      });
    },
  };
}
