/**
 * @jest-environment jsdom
 */
'use strict';

beforeEach(() => {
    document.body.innerHTML = '<div id="migration-guide"></div>';
    jest.resetModules();
});

function loadModule() {
    return require('../src/migration-guide');
}

describe('MigrationGuide', () => {
    describe('Platform data', () => {
        test('exports 4 platforms', () => {
            const mod = loadModule();
            expect(mod.PLATFORMS).toHaveLength(4);
        });

        test('each platform has required fields', () => {
            const mod = loadModule();
            mod.PLATFORMS.forEach((p) => {
                expect(p.id).toBeTruthy();
                expect(p.name).toBeTruthy();
                expect(p.icon).toBeTruthy();
                expect(p.color).toMatch(/^#/);
                expect(p.concepts.length).toBeGreaterThan(0);
                expect(p.migration.length).toBeGreaterThan(0);
                expect(p.beforeCode).toBeTruthy();
                expect(p.afterCode).toBeTruthy();
            });
        });

        test('platform IDs are unique', () => {
            const mod = loadModule();
            const ids = mod.PLATFORMS.map((p) => p.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        test('all migration steps have valid effort levels', () => {
            const mod = loadModule();
            const validEfforts = Object.keys(mod.EFFORT_META);
            mod.PLATFORMS.forEach((p) => {
                p.migration.forEach((s) => {
                    expect(validEfforts).toContain(s.effort);
                });
            });
        });

        test('each concept has theirs, ours, and note', () => {
            const mod = loadModule();
            mod.PLATFORMS.forEach((p) => {
                p.concepts.forEach((c) => {
                    expect(c.theirs).toBeTruthy();
                    expect(c.ours).toBeTruthy();
                    expect(c.note).toBeTruthy();
                });
            });
        });
    });

    describe('EFFORT_META', () => {
        test('has all levels', () => {
            const mod = loadModule();
            expect(mod.EFFORT_META).toHaveProperty('none');
            expect(mod.EFFORT_META).toHaveProperty('low');
            expect(mod.EFFORT_META).toHaveProperty('medium');
            expect(mod.EFFORT_META).toHaveProperty('high');
        });

        test('each level has label, color, icon', () => {
            const mod = loadModule();
            Object.values(mod.EFFORT_META).forEach((m) => {
                expect(m.label).toBeTruthy();
                expect(m.color).toMatch(/^#/);
                expect(m.icon).toBeTruthy();
            });
        });
    });

    describe('Initial render', () => {
        test('renders title', () => {
            loadModule();
            const el = document.getElementById('migration-guide');
            expect(el.textContent).toContain('Migration Guide');
        });

        test('renders all 4 platform cards', () => {
            loadModule();
            const cards = document.querySelectorAll('.mg-platform-card');
            expect(cards).toHaveLength(4);
        });

        test('platform cards show name and icon', () => {
            const mod = loadModule();
            mod.PLATFORMS.forEach((p) => {
                const card = document.querySelector(`[data-platform="${p.id}"]`);
                expect(card).not.toBeNull();
                expect(card.textContent).toContain(p.name);
            });
        });

        test('no detail view initially', () => {
            loadModule();
            expect(document.querySelector('.mg-detail')).toBeNull();
        });
    });

    describe('Platform selection', () => {
        test('clicking platform shows detail view', () => {
            const mod = loadModule();
            const card = document.querySelector('[data-platform="langchain"]');
            card.click();
            expect(document.querySelector('.mg-detail')).not.toBeNull();
        });

        test('detail shows concept mapping', () => {
            const mod = loadModule();
            mod._test.setSelectedPlatform('langchain');
            mod._test.render();
            const rows = document.querySelectorAll('.mg-concept-row');
            expect(rows.length).toBeGreaterThan(0);
        });

        test('detail shows code comparison', () => {
            const mod = loadModule();
            mod._test.setSelectedPlatform('crewai');
            mod._test.render();
            expect(document.querySelector('.mg-code-before')).not.toBeNull();
            expect(document.querySelector('.mg-code-after')).not.toBeNull();
        });

        test('detail shows migration checklist', () => {
            const mod = loadModule();
            mod._test.setSelectedPlatform('autogpt');
            mod._test.render();
            const items = document.querySelectorAll('.mg-check-item');
            const platform = mod.PLATFORMS.find((p) => p.id === 'autogpt');
            expect(items).toHaveLength(platform.migration.length);
        });

        test('clicking same platform toggles off', () => {
            const mod = loadModule();
            const card = document.querySelector('[data-platform="langchain"]');
            card.click();
            expect(document.querySelector('.mg-detail')).not.toBeNull();
            const card2 = document.querySelector('[data-platform="langchain"]');
            card2.click();
            expect(document.querySelector('.mg-detail')).toBeNull();
        });

        test('switching platforms shows different detail', () => {
            const mod = loadModule();
            mod._test.setSelectedPlatform('langchain');
            mod._test.render();
            const langchainConcepts = document.querySelectorAll('.mg-concept-row').length;
            mod._test.setSelectedPlatform('crewai');
            mod._test.render();
            const crewaiConcepts = document.querySelectorAll('.mg-concept-row').length;
            expect(langchainConcepts).not.toBe(crewaiConcepts);
        });
    });

    describe('Migration checklist', () => {
        test('checking a step updates progress', () => {
            const mod = loadModule();
            mod._test.setSelectedPlatform('langchain');
            mod._test.render();
            const checkbox = document.querySelector('.mg-checklist input[type="checkbox"]');
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
            const label = document.querySelector('.mg-progress-label');
            expect(label.textContent).toContain('1/');
        });

        test('checked steps persist across re-renders', () => {
            const mod = loadModule();
            mod._test.setCheckedSteps({ langchain: { 0: true, 2: true } });
            mod._test.setSelectedPlatform('langchain');
            mod._test.render();
            const checked = document.querySelectorAll('.mg-checklist input[type="checkbox"]:checked');
            expect(checked).toHaveLength(2);
        });

        test('progress shows correct percentage', () => {
            const mod = loadModule();
            const platform = mod.PLATFORMS.find((p) => p.id === 'custom');
            const allChecked = {};
            platform.migration.forEach((_, i) => { allChecked[i] = true; });
            mod._test.setCheckedSteps({ custom: allChecked });
            mod._test.setSelectedPlatform('custom');
            mod._test.render();
            const label = document.querySelector('.mg-progress-label');
            expect(label.textContent).toContain('100%');
        });
    });

    describe('Effort estimation', () => {
        test('shows effort cards', () => {
            const mod = loadModule();
            mod._test.setSelectedPlatform('langchain');
            mod._test.render();
            const cards = document.querySelectorAll('.mg-effort-card');
            expect(cards.length).toBeGreaterThan(0);
        });

        test('shows effort verdict', () => {
            const mod = loadModule();
            mod._test.setSelectedPlatform('langchain');
            mod._test.render();
            const verdict = document.querySelector('.mg-effort-verdict');
            expect(verdict).not.toBeNull();
            expect(verdict.textContent).toMatch(/Straightforward|Moderate|Complex/);
        });

        test('effort badges on checklist items', () => {
            const mod = loadModule();
            mod._test.setSelectedPlatform('custom');
            mod._test.render();
            const badges = document.querySelectorAll('.mg-effort-badge');
            expect(badges.length).toBeGreaterThan(0);
            badges.forEach((b) => {
                expect(b.textContent).toMatch(/Automatic|Easy|Moderate|Complex/);
            });
        });
    });

    describe('Styles', () => {
        test('injects style element', () => {
            loadModule();
            expect(document.getElementById('mg-styles')).not.toBeNull();
        });

        test('does not duplicate styles on reload', () => {
            loadModule();
            jest.resetModules();
            loadModule();
            const styles = document.querySelectorAll('#mg-styles');
            expect(styles).toHaveLength(1);
        });
    });

    describe('escapeHtml', () => {
        test('escapes angle brackets', () => {
            const mod = loadModule();
            expect(mod._test.escapeHtml('<script>alert(1)</script>')).not.toContain('<script>');
        });

        test('escapes ampersand', () => {
            const mod = loadModule();
            expect(mod._test.escapeHtml('A & B')).toContain('&amp;');
        });

        test('preserves normal text', () => {
            const mod = loadModule();
            expect(mod._test.escapeHtml('Hello World')).toBe('Hello World');
        });
    });
});
