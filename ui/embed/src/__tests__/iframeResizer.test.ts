import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const EMBED_HTML_PATH = path.resolve(import.meta.dirname, '../../embed.html');
const PUBLIC_DIR = path.resolve(import.meta.dirname, '../../public');
const SCRIPT_SRC_PATTERN = /script\.setAttribute\('src', '\.\/(assets\/iframeResizer[^']+)'\)/;

describe('iframe-resizer child script', () => {
  it('is loaded by embed.html from the vendored MIT v4.3.9 file in public/assets', () => {
    // Extract the script path from the loader in embed.html
    const embedHtml = readFileSync(EMBED_HTML_PATH, 'utf8');
    const scriptPath = SCRIPT_SRC_PATTERN.exec(embedHtml)?.[1];
    expect(scriptPath).toBe('assets/iframeResizer.contentWindow-v4.3.9.min.js');

    // Check the file exists and its header carries the version and licence
    const scriptFile = path.join(PUBLIC_DIR, scriptPath ?? '');
    expect(existsSync(scriptFile)).toBe(true);
    const header = readFileSync(scriptFile, 'utf8').split('*/')[0];
    expect(header).toContain('v4.3.9');
    expect(header).toContain('License: MIT');
  });

  it('is only requested when the iframe-resizer parameter is true', () => {
    const embedHtml = readFileSync(EMBED_HTML_PATH, 'utf8');

    expect(embedHtml).toContain("new URLSearchParams(location.search).get('iframe-resizer') === 'true'");
  });
});
