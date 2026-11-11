import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fsSync from 'node:fs';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import express from 'express';
import type { Request, Response } from 'express';
import { Client as PgClient } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadJsonFallbackConfig(filePath: string): void {
  try {
    if (!fsSync.existsSync(filePath)) return;
    const parsed = JSON.parse(fsSync.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim() && !process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  } catch {
    // ignore malformed optional config
  }
}

loadJsonFallbackConfig(path.resolve(__dirname, 'supabase.config.json'));
dotenv.config({ path: path.resolve(__dirname, 'supabase.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const PORT = Number(process.env.PORT || 3000);
const QUERIES_DIR = path.resolve(__dirname, 'public', 'supabase', 'queries');

interface ExecutedScript {
  file: string;
  durationMs: number;
}

function extractProjectRef(supabaseUrl: string): string | null {
  try {
    const parsed = new URL(supabaseUrl.trim());
    const [ref] = parsed.hostname.split('.');
    return ref || null;
  } catch {
    return null;
  }
}

async function listOrderedSqlFiles(): Promise<string[]> {
  const entries = await fs.readdir(QUERIES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

async function runViaManagementApi(
  projectRef: string,
  token: string,
  sql: string
): Promise<void> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    let message = `Supabase query failed with HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message || body.error || message;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) message = text;
    }
    throw new Error(message);
  }
}

async function runAllQueriesInOrder(): Promise<{
  executedFiles: ExecutedScript[];
  totalDurationMs: number;
}> {
  let supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  if (!supabaseUrl || supabaseUrl.includes('your-project')) {
    supabaseUrl = 'https://ufowtgmpaahyshdxlnlq.supabase.co';
  }
  const supabaseToken = process.env.VITE_SUPABASE_TOKEN || '';
  const databaseKey = process.env.VITE_SUPABASE_DATABASE_KEY || '';
  const projectRef = extractProjectRef(supabaseUrl);

  if (!projectRef) {
    throw new Error('VITE_SUPABASE_URL is missing or invalid in .env / supabase.env.');
  }

  if (!supabaseToken && !databaseKey) {
    throw new Error(
      'Missing Supabase database credentials in .env / supabase.env (VITE_SUPABASE_TOKEN or VITE_SUPABASE_DATABASE_KEY).'
    );
  }

  const sqlFiles = await listOrderedSqlFiles();
  if (sqlFiles.length === 0) {
    throw new Error('No .sql files were found in public/supabase/queries/.');
  }

  const totalStart = performance.now();
  const executedFiles: ExecutedScript[] = [];

  if (supabaseToken) {
    for (const file of sqlFiles) {
      const fileStart = performance.now();
      const sql = await fs.readFile(path.join(QUERIES_DIR, file), 'utf8');
      try {
        await runViaManagementApi(projectRef, supabaseToken, sql);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed executing ${file}: ${reason}`);
      }
      executedFiles.push({
        file,
        durationMs: Math.round(performance.now() - fileStart),
      });
    }
  } else {
    const client = new PgClient({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      user: 'postgres',
      password: databaseKey,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    try {
      for (const file of sqlFiles) {
        const fileStart = performance.now();
        const sql = await fs.readFile(path.join(QUERIES_DIR, file), 'utf8');
        try {
          await client.query(sql);
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed executing ${file}: ${reason}`);
        }
        executedFiles.push({
          file,
          durationMs: Math.round(performance.now() - fileStart),
        });
      }
    } finally {
      await client.end();
    }
  }

  return {
    executedFiles,
    totalDurationMs: Math.round(performance.now() - totalStart),
  };
}

async function createServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.post('/api/reset-db', async (_req: Request, res: Response) => {
    try {
      const result = await runAllQueriesInOrder();
      res.status(200).json({
        ok: true,
        executedFiles: result.executedFiles,
        totalDurationMs: result.totalDurationMs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected database reset error.';
      res.status(500).json({
        ok: false,
        error: message,
      });
    }
  });

  const isStartScript = process.env.npm_lifecycle_event === 'start';
  const useProdStatic = process.env.NODE_ENV === 'production' || isStartScript;

  let mountedVite = false;
  if (!useProdStatic) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      mountedVite = true;
    } catch {
      mountedVite = false;
    }
  }

  if (!mountedVite) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((req: Request, res: Response, next) => {
      if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api/')) {
        res.sendFile(path.join(distDir, 'index.html'));
        return;
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void createServer();
