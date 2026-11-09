import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_TITLE, GAME_VERSION } from '../../src/constants';
import { APP_MANIFEST } from '../../src/pwa/pwaConfig';

const root = process.cwd();
const read = (relative: string): string => readFileSync(join(root, relative), 'utf8');

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  engines?: { node?: string };
  scripts?: Record<string, string>;
}

const pkg = JSON.parse(read('package.json')) as PackageJson;

describe('Phase 29.5 — release readiness', () => {
  it('keeps the release version in sync across its sources', () => {
    expect(pkg.name).toBe('knowledge-realms');
    expect(pkg.version).toBe(GAME_VERSION);
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.private).toBe(true);
  });

  it('declares a reproducible toolchain', () => {
    expect(pkg.engines?.node).toBe('>=20.19.0');
    expect(read('.nvmrc').trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(existsSync(join(root, 'package-lock.json'))).toBe(true);
  });

  it('exposes a single release gate script', () => {
    const verify = pkg.scripts?.verify ?? '';
    expect(verify).toContain('typecheck');
    expect(verify).toContain('test');
    expect(verify).toContain('build');
    expect(pkg.scripts?.build).toBe('tsc && vite build');
  });

  it('shows the release version on the start menu', () => {
    expect(read('src/ui/start-menu/StartMenu.ts')).toContain('v${GAME_VERSION}');
    expect(read('src/constants.ts')).toContain(`GAME_VERSION = '${GAME_VERSION}'`);
  });

  it('registers the service worker only in production builds', () => {
    const main = read('src/main.ts');
    expect(main).toContain('import.meta.env.PROD');
    expect(main.indexOf('registerServiceWorker()')).toBeGreaterThan(
      main.indexOf('import.meta.env.PROD'),
    );
  });

  it('serves a root-path static build with no external assets', () => {
    const html = read('index.html');
    expect(html).toContain('href="/pwa-icon.svg"');
    expect(html).toContain('src="/src/main.ts"');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain(`content="${APP_MANIFEST.theme_color}"`);
    expect(read('vite.config.ts')).not.toContain('sourcemap: true');
    expect(APP_MANIFEST.start_url).toBe('/');
    expect(APP_MANIFEST.scope).toBe('/');
  });

  it('ships third-party license notices', () => {
    const notices = read('public/THIRD_PARTY_NOTICES.txt');
    expect(notices).toContain('Phaser');
    expect(notices).toContain('Workbox');
    expect(notices).toContain('MIT License');
    expect(notices).toContain('Richard Davey, Phaser Studio Inc.');
    expect(notices).toContain('Google LLC');
    expect(GAME_TITLE).toBe('Knowledge Realms');
  });

  it('documents every required release section', () => {
    const checklist = read('docs/RELEASE_CHECKLIST.md');
    for (const section of [
      'Release gate',
      'Reproducible production build',
      'Version number strategy',
      'Release notes template',
      'Deployment instructions',
      'Rollback procedure',
      'Asset and license inventory',
      'Known limitations',
      'Smoke-test checklist',
      'Save backup guidance',
      'Browser support statement',
    ]) {
      expect(checklist).toContain(section);
    }
    expect(checklist).toContain('Not deployed');
    expect(checklist).toContain('npm ci');
    expect(checklist).toContain('SAVE_DATA_SCHEMA_VERSION` (currently **6**)');
  });

  it('keeps save schema and export versions documented independently', () => {
    const storage = read('src/storage/StorageTypes.ts');
    const transfer = read('src/storage/SaveTransfer.ts');
    expect(storage).toContain('SAVE_DATA_SCHEMA_VERSION = 6');
    expect(transfer).toContain('SAVE_EXPORT_FORMAT_VERSION = 1');
  });
});
