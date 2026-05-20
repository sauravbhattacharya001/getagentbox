/**
 * Tests for scripts/apply-security-headers.js
 *
 * Covers the pure helpers (no filesystem) so we can guarantee:
 *   - CSP is consistent across pages
 *   - `script-src` tightens to 'self' when no inline scripts exist
 *   - GoatCounter connect-src is only added when actually used
 *   - The strip+insert flow is idempotent
 */

'use strict';

const {
  buildCsp,
  buildBlock,
  hasInlineScript,
  hasGoatCounter,
  stripExisting,
  insertBlock,
} = require('../scripts/apply-security-headers');

describe('apply-security-headers helpers', () => {
  describe('buildCsp', () => {
    test('strict variant has no unsafe-inline for scripts', () => {
      const csp = buildCsp({ allowInlineScript: false, allowGoatCounter: false });
      expect(csp).toMatch(/script-src 'self';/);
      expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    });

    test('loose variant allows unsafe-inline scripts when needed', () => {
      const csp = buildCsp({ allowInlineScript: true, allowGoatCounter: false });
      expect(csp).toMatch(/script-src 'self' 'unsafe-inline';/);
    });

    test('style-src always permits unsafe-inline (legacy hand-authored CSS)', () => {
      const csp = buildCsp({ allowInlineScript: false, allowGoatCounter: false });
      expect(csp).toMatch(/style-src 'self' 'unsafe-inline';/);
    });

    test('connect-src only includes GoatCounter when allowed', () => {
      const withGc = buildCsp({ allowInlineScript: false, allowGoatCounter: true });
      const withoutGc = buildCsp({ allowInlineScript: false, allowGoatCounter: false });
      expect(withGc).toMatch(/connect-src 'self' https:\/\/agentbox\.goatcounter\.com;/);
      expect(withoutGc).toMatch(/connect-src 'self';/);
    });

    test('locks down dangerous sinks on every page', () => {
      const csp = buildCsp({ allowInlineScript: true, allowGoatCounter: true });
      expect(csp).toMatch(/object-src 'none';/);
      expect(csp).toMatch(/frame-ancestors 'none';/);
      expect(csp).toMatch(/base-uri 'self';/);
      expect(csp).toMatch(/form-action 'self';/);
    });
  });

  describe('hasInlineScript', () => {
    test('returns false for a page with only external scripts', () => {
      const html = '<head><script src="a.js"></script></head>';
      expect(hasInlineScript(html)).toBe(false);
    });

    test('returns false for an empty inline script tag', () => {
      // Empty body should not force us to open the script-src policy.
      expect(hasInlineScript('<script></script>')).toBe(false);
      expect(hasInlineScript('<script>\n\n</script>')).toBe(false);
    });

    test('returns true for a real inline script', () => {
      expect(hasInlineScript('<script>console.log(1)</script>')).toBe(true);
    });

    test('returns true even when src attr appears in unrelated tags', () => {
      const html =
        '<img src="x.png">\n<script>doStuff()</script>\n<script src="y.js"></script>';
      expect(hasInlineScript(html)).toBe(true);
    });

    test('is case-insensitive and tolerates attributes', () => {
      expect(hasInlineScript('<SCRIPT type="text/javascript">x</SCRIPT>')).toBe(true);
    });
  });

  describe('hasGoatCounter', () => {
    test('detects the analytics endpoint host', () => {
      expect(
        hasGoatCounter(
          '<script data-goatcounter="https://agentbox.goatcounter.com/count" src="vendor/count.js"></script>'
        )
      ).toBe(true);
    });

    test('returns false when not referenced', () => {
      expect(hasGoatCounter('<p>nothing here</p>')).toBe(false);
    });
  });

  describe('stripExisting + insertBlock', () => {
    const baseHead =
      '<!DOCTYPE html><html><head>\n' +
      '    <meta charset="UTF-8">\n' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '    <title>Page</title>\n' +
      '</head><body></body></html>';

    test('removes legacy stray CSP meta tags', () => {
      const html =
        baseHead.replace(
          '<title>',
          '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'">\n    <title>'
        );
      const stripped = stripExisting(html);
      expect(stripped).not.toMatch(/Content-Security-Policy/);
    });

    test('removes a managed block including its trailing newline', () => {
      const managed =
        baseHead.replace(
          '<title>',
          '<!-- security-headers:begin (managed by scripts/apply-security-headers.js) -->\n' +
            '    <meta http-equiv="Content-Security-Policy" content="x">\n' +
            '    <!-- security-headers:end -->\n' +
            '    <title>'
        );
      const stripped = stripExisting(managed);
      expect(stripped).not.toMatch(/security-headers:begin/);
      expect(stripped).not.toMatch(/security-headers:end/);
      expect(stripped).not.toMatch(/Content-Security-Policy/);
      // Two consecutive blank lines = drift; the managed block should be
      // removed cleanly without leaving a phantom newline.
      expect(stripped).not.toMatch(/\n\n\n/);
    });

    test('insertBlock places block immediately after the viewport meta', () => {
      const csp = buildCsp({ allowInlineScript: false, allowGoatCounter: false });
      const block = buildBlock({ csp });
      const out = insertBlock(stripExisting(baseHead), block);

      const viewportIdx = out.indexOf('name="viewport"');
      const blockIdx = out.indexOf('security-headers:begin');
      const titleIdx = out.indexOf('<title>');
      expect(viewportIdx).toBeGreaterThan(-1);
      expect(blockIdx).toBeGreaterThan(viewportIdx);
      expect(blockIdx).toBeLessThan(titleIdx);
    });

    test('full strip+insert is idempotent', () => {
      const csp = buildCsp({ allowInlineScript: false, allowGoatCounter: false });
      const block = buildBlock({ csp });

      const once = insertBlock(stripExisting(baseHead), block);
      const twice = insertBlock(stripExisting(once), block);
      expect(twice).toBe(once);
    });

    test('returns null when there is no <head> to anchor against', () => {
      const csp = buildCsp({ allowInlineScript: false, allowGoatCounter: false });
      const block = buildBlock({ csp });
      const out = insertBlock('<html><body>no head</body></html>', block);
      expect(out).toBeNull();
    });
  });
});
