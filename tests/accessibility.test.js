'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ICONS } = require('../public/js/icons');

const REPO_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');

const HTML_FILES = fs
  .readdirSync(PUBLIC_DIR)
  .filter((f) => f.endsWith('.html'))
  .map((f) => path.join(PUBLIC_DIR, f))
  .concat([path.join(REPO_ROOT, 'index.html')]);

describe('Automated Frontend Accessibility & Markup Integrity', () => {
  describe.each(HTML_FILES)('HTML Document: %s', (filePath) => {
    const relativePath = path.relative(REPO_ROOT, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    test('declares html doctype and lang="en"', () => {
      expect(content).toMatch(/<!doctype html>/i);
      expect(content).toMatch(/<html[^>]+lang="en"/i);
    });

    test('contains required meta tags: charset and viewport', () => {
      expect(content).toMatch(/<meta\s+charset="utf-8"/i);
      expect(content).toMatch(/<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1"/i);
    });

    test('has exactly one title tag with descriptive content', () => {
      const titles = content.match(/<title>[\s\S]*?<\/title>/gi) || [];
      expect(titles).toHaveLength(1);
      expect(titles[0].replace(/<\/?title>/gi, '').trim().length).toBeGreaterThan(0);
    });

    test('includes skip-to-content link pointing to #main', () => {
      expect(content).toMatch(/<a[^>]+class="[^"]*skip-link[^"]*"[^>]+href="#main"/i);
    });

    test('has exactly one main landmark with id="main"', () => {
      const mains = content.match(/<main[^>]*>/gi) || [];
      expect(mains).toHaveLength(1);
      expect(mains[0]).toMatch(/id="main"/);
    });

    test('has exactly one h1 landmark per page', () => {
      const h1s = content.match(/<h1[^>]*>/gi) || [];
      expect(h1s).toHaveLength(1);
    });

    test('does not use inline styles or style attributes (strict CSP)', () => {
      expect(content).not.toMatch(/<style[^>]*>/i);
      expect(content).not.toMatch(/\sstyle\s*=/i);
    });

    test('does not use inline scripts (strict CSP)', () => {
      const inlineScripts = content.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || [];
      expect(inlineScripts).toHaveLength(0);
    });

    test('all images provide an alt attribute', () => {
      const images = content.match(/<img[^>]*>/gi) || [];
      images.forEach((img) => {
        expect(img).toMatch(/\salt\s*=/i);
      });
    });

    test('all data-icon attributes reference valid icons', () => {
      const iconMatches = content.matchAll(/data-icon="([^"]+)"/g);
      for (const match of iconMatches) {
        const iconName = match[1];
        expect(ICONS).toHaveProperty(iconName);
      }
    });

    test('links to public scripts and stylesheets resolve to existing files', () => {
      const links = content.matchAll(/<(?:link\s+rel="stylesheet"|script)\s+[^>]*(?:href|src)="(\/[^"?#]+)"/gi);
      for (const match of links) {
        const localPath = match[1];
        if (localPath.startsWith('/css/') || localPath.startsWith('/js/')) {
          const resolvedPath = path.join(PUBLIC_DIR, localPath);
          expect(fs.existsSync(resolvedPath)).toBe(true);
        }
      }
    });

    test('references Google Fonts with display=swap and correct Atkinson Hyperlegible family', () => {
      expect(content).toMatch(
        /href="https:\/\/fonts\.googleapis\.com\/css2\?family=Atkinson\+Hyperlegible:wght@400;700&family=Inter:wght@400;600;700&display=swap"/
      );
    });
  });

  describe('Design Tokens Contrast Compliance (WCAG AA & AAA)', () => {
    function luminance(hex) {
      const rgb = hex
        .replace('#', '')
        .match(/.{2}/g)
        .map((x) => parseInt(x, 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    function ratio(hex1, hex2) {
      const l1 = luminance(hex1);
      const l2 = luminance(hex2);
      const max = Math.max(l1, l2);
      const min = Math.min(l1, l2);
      return (max + 0.05) / (min + 0.05);
    }

    const tokens = {
      bg: '#faf8f4',
      surface: '#ffffff',
      text: '#1f2933',
      textMuted: '#52606d',
      primary: '#0f766e',
      primaryHover: '#0b5f59',
      danger: '#b42318',
      white: '#ffffff',
    };

    test('body text passes WCAG AAA (>= 7:1) on bg and surface', () => {
      expect(ratio(tokens.text, tokens.bg)).toBeGreaterThanOrEqual(7.0);
      expect(ratio(tokens.text, tokens.surface)).toBeGreaterThanOrEqual(7.0);
    });

    test('secondary muted text passes WCAG AA (>= 4.5:1) on bg and surface', () => {
      expect(ratio(tokens.textMuted, tokens.bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(tokens.textMuted, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    });

    test('primary action passes WCAG AA (>= 4.5:1) on bg and surface', () => {
      expect(ratio(tokens.primary, tokens.bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(tokens.primary, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    });

    test('button white text passes WCAG AA (>= 4.5:1) on primary and danger', () => {
      expect(ratio(tokens.white, tokens.primary)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(tokens.white, tokens.danger)).toBeGreaterThanOrEqual(4.5);
    });

    test('focus ring provides at least 3:1 contrast against page background', () => {
      expect(ratio(tokens.primary, tokens.bg)).toBeGreaterThanOrEqual(3.0);
    });
  });
});
