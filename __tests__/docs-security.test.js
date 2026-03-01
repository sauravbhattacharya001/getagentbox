/**
 * Tests that docs pages have proper security headers (CSP, X-Content-Type-Options, Referrer-Policy).
 */
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.resolve(__dirname, '..', 'docs');
const docsIndex = fs.readFileSync(path.join(DOCS_DIR, 'index.html'), 'utf-8');
const gettingStarted = fs.readFileSync(path.join(DOCS_DIR, 'getting-started.html'), 'utf-8');

const docsPages = [
  { name: 'docs/index.html', html: docsIndex },
  { name: 'docs/getting-started.html', html: gettingStarted },
];

describe.each(docsPages)('Security headers in $name', ({ name, html }) => {
  test('has Content-Security-Policy meta tag', () => {
    expect(html).toMatch(/<meta\s+http-equiv="Content-Security-Policy"/i);
  });

  test('CSP sets default-src to none', () => {
    expect(html).toMatch(/default-src\s+'none'/);
  });

  test('CSP allows unsafe-inline styles (inline <style> blocks)', () => {
    expect(html).toMatch(/style-src\s+'unsafe-inline'/);
  });

  test('CSP sets img-src to self', () => {
    expect(html).toMatch(/img-src\s+'self'/);
  });

  test('CSP sets frame-ancestors to none (anti-clickjacking)', () => {
    expect(html).toMatch(/frame-ancestors\s+'none'/);
  });

  test('CSP sets base-uri to self', () => {
    expect(html).toMatch(/base-uri\s+'self'/);
  });

  test('CSP sets form-action to self', () => {
    expect(html).toMatch(/form-action\s+'self'/);
  });

  test('has X-Content-Type-Options nosniff', () => {
    expect(html).toMatch(/<meta\s+http-equiv="X-Content-Type-Options"\s+content="nosniff"/i);
  });

  test('has referrer policy set to strict-origin-when-cross-origin', () => {
    expect(html).toMatch(/<meta\s+name="referrer"\s+content="strict-origin-when-cross-origin"/i);
  });

  test('CSP does not allow script-src unsafe-inline', () => {
    // Docs pages have no JS, so script-src should not include unsafe-inline
    const cspMatch = html.match(/content="([^"]*Content-Security-Policy[^"]*|default-src[^"]*)"/i);
    if (cspMatch) {
      const cspValue = cspMatch[0];
      // If script-src is present, it should not contain unsafe-inline
      if (cspValue.includes('script-src')) {
        expect(cspValue).not.toMatch(/script-src[^;]*'unsafe-inline'/);
      }
    }
  });

  test('has Permissions-Policy meta tag', () => {
    expect(html).toMatch(/<meta\s+http-equiv="Permissions-Policy"/i);
  });
});
