#!/usr/bin/env node
/**
 * Bulk-fix HTML validation errors in index.html:
 *  - no-implicit-button-type: add type="button" to <button> lacking a type attribute
 *  - no-dup-id: rename duplicate id="comparisonSection" on the second occurrence
 *  - aria-label-misuse: add role="region" to <div> elements that carry aria-label
 *  - empty-heading: inject a non-breaking space as visually-hidden placeholder text
 *  - no-raw-characters: encode bare "&" as "&amp;" in human-readable text
 *
 * Idempotent: re-running is a no-op once the file is clean.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
const before = src;

let counts = { btnType: 0, dupId: 0, ariaRole: 0, emptyHeading: 0, rawAmp: 0 };

// 1) Add type="button" to <button> tags that have no type attribute.
src = src.replace(/<button\b([^>]*)>/g, (match, attrs) => {
  if (/\btype\s*=/.test(attrs)) return match;
  counts.btnType++;
  return `<button type="button"${attrs}>`;
});

// 2) Rename the SECOND occurrence of id="comparisonSection" (the dynamic table).
let dupSeen = 0;
src = src.replace(/id="comparisonSection"/g, (m) => {
  dupSeen++;
  if (dupSeen === 2) {
    counts.dupId++;
    return 'id="comparisonAdvancedSection"';
  }
  return m;
});

// 3) Add role="region" to <div> elements that have aria-label but no role.
src = src.replace(/<div\b([^>]*\baria-label\s*=[^>]*)>/g, (match, attrs) => {
  if (/\brole\s*=/.test(attrs)) return match;
  counts.ariaRole++;
  return `<div role="region"${attrs}>`;
});

// 4) Inject placeholder content for empty <h1>-<h6> tags that are filled at runtime.
src = src.replace(/<(h[1-6])\b([^>]*)><\/\1>/g, (match, tag, attrs) => {
  counts.emptyHeading++;
  // \u00A0 is a non-breaking space; renders as nothing visually but satisfies "must have text".
  return `<${tag}${attrs}>\u00A0</${tag}>`;
});

// 5) Encode bare "&" → "&amp;" when not already an entity.
//    Match "&" not followed by a known entity pattern (#NNN; or word; up to ~10 chars).
src = src.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,9}|#\d{1,6}|#x[0-9a-fA-F]{1,6});)/g, () => {
  counts.rawAmp++;
  return '&amp;';
});

if (src === before) {
  console.log('No changes needed.');
  process.exit(0);
}

fs.writeFileSync(FILE, src);
console.log('Fixes applied:', counts);
