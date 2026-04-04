#!/usr/bin/env node
/**
 * Build script: concatenates all module JS files into dist/bundle.js
 * Preserves load order from index.html (globals first, init last).
 * Zero external dependencies.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// Order matters: globals → typing template → all modules → init → top-level src files
const files = [
  'src/modules/storage.js',
  'src/modules/dom-utils.js',
  'src/modules/globals.js',
  'src/modules/_typing-indicator-template.js',
  'src/modules/chat-demo.js',
  'src/modules/testimonials.js',
  'src/modules/pricing.js',
  'src/modules/faq.js',
  'src/modules/how-it-works.js',
  'src/modules/stats.js',
  'src/modules/use-cases.js',
  'src/modules/integrations.js',
  'src/modules/changelog.js',
  'src/modules/notification-preview.js',
  'src/modules/trust.js',
  'src/modules/site-nav.js',
  'src/modules/newsletter.js',
  'src/modules/roadmap.js',
  'src/modules/status-dashboard.js',
  'src/modules/calculator.js',
  'src/modules/capacity-planner.js',
  'src/modules/command-palette.js',
  'src/modules/share-fab.js',
  'src/modules/theme-toggle.js',
  'src/modules/scroll-progress.js',
  'src/modules/shortcuts-help.js',
  'src/modules/playground.js',
  'src/modules/activity-feed.js',
  'src/modules/prompt-gallery.js',
  'src/modules/personality-configurator.js',
  'src/modules/feature-tour.js',
  'src/modules/commands-cheat-sheet.js',
  'src/modules/onboarding-quiz.js',
  'src/modules/api-explorer.js',
  'src/modules/workflow-templates.js',
  'src/modules/quick-start-wizard.js',
  'src/modules/social-proof-toasts.js',
  'src/modules/before-after.js',
  'src/modules/growth-timeline.js',
  'src/modules/comparison-table.js',
  'src/modules/accessibility-panel.js',
  'src/modules/success-stories.js',
  'src/modules/feature-board.js',
  'src/modules/aiglossary.js',
  'src/modules/pipeline-builder.js',
  'src/modules/community-showcase.js',
  'src/modules/section-minimap.js',
  'src/modules/help-chat-widget.js',
  'src/modules/share-card-generator.js',
  'src/modules/speed-challenge.js',
  'src/modules/privacy-checkup.js',
  'src/modules/referral-program.js',
  'src/modules/init.js',
  'src/benchmarks.js',
  'src/command-reference.js',
  'src/role-demo-picker.js',
  'src/migration-guide.js',
  'src/workflow-builder.js',
  'src/modules/setup-checklist.js',
  'src/capability-radar.js',
];

let bundle = '/* Auto-generated bundle — do not edit directly. Run: npm run build */\n';
let totalSize = 0;

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Warning: ${file} not found, skipping`);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  totalSize += content.length;
  bundle += `\n/* === ${file} === */\n${content}\n`;
}

const outPath = path.join(distDir, 'bundle.js');
fs.writeFileSync(outPath, bundle);

console.log(`Bundled ${files.length} files (${(totalSize / 1024).toFixed(1)} KB) → dist/bundle.js (${(bundle.length / 1024).toFixed(1)} KB)`);
