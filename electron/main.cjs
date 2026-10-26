const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

function normalizeEndpoint(baseUrl) {
  const trimmed = String(baseUrl || '').trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('A URL do FreeLLMAPI deve começar com http:// ou https://');
  }
  return trimmed.endsWith('/v1') ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`;
}

function sanitizeFusionConfig(fusion) {
  const k = Math.max(1, Math.min(8, Number(fusion?.k) || 4));
  const strategy = fusion?.strategy === 'best_of' ? 'best_of' : 'synthesize';
  const models = Array.isArray(fusion?.models)
    ? fusion.models.map((value) => String(value).trim()).filter(Boolean).slice(0, 8)
    : undefined;
  const judge = fusion?.judge ? String(fusion.judge).trim() : undefined;
  return { k, strategy, models, judge, expose_panel: true };
}

ipcMain.handle('fusion:review', async (_event, request) => {
  const endpoint = normalizeEndpoint(request?.baseUrl);
  const messages = Array.isArray(request?.messages) ? request.messages : [];
  if (!messages.length) throw new Error('Fusion Review recebeu uma conversa vazia.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request?.apiKey ? { Authorization: `Bearer ${request.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: 'fusion',
        messages,
        stream: false,
        fusion: sanitizeFusionConfig(request?.fusion),
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.error?.message || body?.message || `FreeLLMAPI respondeu HTTP ${response.status}`;
      throw new Error(message);
    }

    return {
      content: body?.choices?.[0]?.message?.content || '',
      route: response.headers.get('x-routed-via') || undefined,
      summary: body?._fusion || null,
      details: body?.x_fusion || null,
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Fusion Review excedeu 180 segundos.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 960,
    minHeight: 700,
    backgroundColor: '#09090b',
    title: 'GILGAL Cockpit2',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.crentefiel.gilgal.cockpit2');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
