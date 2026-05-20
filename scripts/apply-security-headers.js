#!/usr/bin/env node
/**
 * scripts/apply-security-headers.js
 *
 * Idempotently applies a baseline security header set to every top-level
 * *.html file in the repo (and the docs/ subdirectory).
 *
 * Why this exists:
 *   - Only 4 of 76 HTML pages had a CSP meta tag, and even those used a
 *     `style-src 'self'` policy that disagreed with the actual inline
 *     <style> blocks and `style=""` attributes on the page.
 *   - This script enforces a single consistent policy: same CSP for every
 *     page, with `script-src` tightened automatically when a page has no
 *     inline scripts.
 *
 * Run it after authoring or modifying any HTML page:
 *
 *   node scripts/apply-security-headers.js          # apply, prints summary
 *   node scripts/apply-security-headers.js --check  # CI: exit 1 on drift
 *
 * The CI workflow (.github/workflows/ci.yml) runs this in --check mode so
 * that pages drift out of policy can never silently land on master.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK_ONLY = process.argv.includes('--check');

// Sentinel comments delimit the managed block. Anything between is owned by
// this script. Everything outside is untouched.
const BEGIN = '<!-- security-headers:begin (managed by scripts/apply-security-headers.js) -->';
const END = '<!-- security-headers:end -->';

// One CSP for the whole site. `'unsafe-inline'` for styles is required
// because nearly every page hand-rolls a <style> block and uses style=""
// attributes; we accept that tradeoff in exchange for getting strict
// script-src, object-src, frame-ancestors, base-uri, and form-action across
// the entire surface.
//
// `script-src` is tightened to 'self' for pages without inline <script>;
// pages that do have inline scripts get 'self' + 'unsafe-inline'.
function buildCsp({ allowInlineScript, allowGoatCounter }) {
  const scriptSrc = allowInlineScript ? "'self' 'unsafe-inline'" : "'self'";
  const connectSrc = allowGoatCounter
    ? "'self' https://agentbox.goatcounter.com"
    : "'self'";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'none'",
    "manifest-src 'self'",
  ].join('; ') + ';';
}

function buildBlock({ csp }) {
  // Indent matches typical hand-authored <head> indentation in this repo.
  return [
    BEGIN,
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    '<meta http-equiv="X-Content-Type-Options" content="nosniff">',
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
    '<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()">',
    END,
  ].join('\n    ');
}

// Detect a real inline script: <script ...>BODY</script> with no src attr
// and non-whitespace body. Tolerant of attributes and case.
function hasInlineScript(html) {
  const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] && m[1].trim().length > 0) return true;
  }
  return false;
}

function hasGoatCounter(html) {
  return /goatcounter\.com/i.test(html);
}

// Strip any pre-existing CSP / managed block / loose security meta tags so
// we own a single, canonical block per page.
function stripExisting(html) {
  let out = html;

  // 1. Remove the managed block, including the surrounding whitespace +
  //    newline that follows it. Keeps the file from accumulating blank
  //    lines on re-runs.
  const blockRe = new RegExp(
    `[ \\t]*${escapeRegex(BEGIN)}[\\s\\S]*?${escapeRegex(END)}\\r?\\n?`,
    'g'
  );
  out = out.replace(blockRe, '');

  // 2. Remove any stray Content-Security-Policy / X-Content-Type-Options /
  //    referrer / Permissions-Policy meta tags that live OUTSIDE the
  //    managed block (legacy hand-authored ones).
  const stray = [
    /[ \t]*<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>\r?\n?/gi,
    /[ \t]*<meta[^>]*http-equiv=["']X-Content-Type-Options["'][^>]*>\r?\n?/gi,
    /[ \t]*<meta[^>]*name=["']referrer["'][^>]*>\r?\n?/gi,
    /[ \t]*<meta[^>]*http-equiv=["']Permissions-Policy["'][^>]*>\r?\n?/gi,
  ];
  for (const re of stray) out = out.replace(re, '');

  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Insert the new managed block right after <meta name="viewport" ...>.
// Falls back to right after <head> if the viewport tag is absent (rare).
function insertBlock(html, block) {
  const viewportRe = /(<meta[^>]*name=["']viewport["'][^>]*>)\r?\n?/i;
  if (viewportRe.test(html)) {
    return html.replace(viewportRe, (m, tag) => `${tag}\n    ${block}\n`);
  }
  const headRe = /(<head\b[^>]*>)\r?\n?/i;
  if (headRe.test(html)) {
    return html.replace(headRe, (m, tag) => `${tag}\n    ${block}\n`);
  }
  // No <head> at all: skip rather than mangle.
  return null;
}

function processFile(absPath) {
  const original = fs.readFileSync(absPath, 'utf8');
  // Skip files that aren't actually HTML documents.
  if (!/<html\b/i.test(original) && !/<!DOCTYPE\s+html/i.test(original)) {
    return { absPath, status: 'skipped-not-html' };
  }

  const csp = buildCsp({
    allowInlineScript: hasInlineScript(original),
    allowGoatCounter: hasGoatCounter(original),
  });
  const block = buildBlock({ csp });

  const stripped = stripExisting(original);
  const next = insertBlock(stripped, block);
  if (next === null) return { absPath, status: 'skipped-no-head' };

  if (next === original) return { absPath, status: 'unchanged' };

  if (CHECK_ONLY) return { absPath, status: 'drift' };

  fs.writeFileSync(absPath, next);
  return { absPath, status: 'updated' };
}

function findHtmlFiles() {
  const files = [];
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(path.join(ROOT, entry.name));
    }
  }
  const docsDir = path.join(ROOT, 'docs');
  if (fs.existsSync(docsDir)) {
    for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        files.push(path.join(docsDir, entry.name));
      }
    }
  }
  return files.sort();
}

function main() {
  const files = findHtmlFiles();
  const counts = { updated: 0, unchanged: 0, drift: 0, skipped: 0 };
  const drifted = [];

  for (const f of files) {
    const { status, absPath } = processFile(f);
    if (status === 'updated') counts.updated++;
    else if (status === 'unchanged') counts.unchanged++;
    else if (status === 'drift') {
      counts.drift++;
      drifted.push(path.relative(ROOT, absPath));
    } else counts.skipped++;
  }

  console.log(
    `security-headers: ${files.length} html files | ` +
      `updated=${counts.updated} unchanged=${counts.unchanged} ` +
      `drift=${counts.drift} skipped=${counts.skipped}`
  );

  if (CHECK_ONLY && counts.drift > 0) {
    console.error(
      '\nsecurity-headers: drift detected. Run:\n' +
        '    node scripts/apply-security-headers.js\n' +
        'and commit the result.\n\nDrifted files:'
    );
    for (const f of drifted) console.error(`  - ${f}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  buildCsp,
  buildBlock,
  hasInlineScript,
  hasGoatCounter,
  stripExisting,
  insertBlock,
};
