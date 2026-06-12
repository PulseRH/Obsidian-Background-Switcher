
/**
 * @jest-environment jsdom
 */
import { describe, expect, test } from '@jest/globals';
import { checkPath, clampNumber, frontmatterTagMatches, getRuleBackgroundFill, getRuleSizeMode, getRuleTarget, normalizeOverlay, normalizePercent, normalizeTag, normalizeZoom, tagMatches } from '../src/main';
import { BackgroundFillType, BackgroundSizeMode, BackgroundTarget } from '../src/settingsTab';


jest.mock('obsidian', () => {
    class MockPlugin {
        app: any;
        constructor(app: any) {
            this.app = app;
        }
        // Add any mock methods or properties as needed
    }

    return {
        Plugin: MockPlugin,
        PluginSettingTab: class {
            constructor(app: any, plugin: any) {
                // Mock properties and methods as needed
            }
        },
        // ... other Obsidian exports
    };
});


describe('background settings utilities', () => {
    test('matches full folders but not filenames', () => {
        expect(checkPath("Other/Two Rules.md", "Other")).toBe(true);
        expect(checkPath("Index/300-Obsidian-index.md", "Obsidian")).toBe(false);
        expect(checkPath("Obsidian\\readme.md", "Obsidian")).toBe(true);
    });

    test('matches slash only for vault root notes', () => {
        expect(checkPath("Root note.md", "/")).toBe(true);
        expect(checkPath("Folder/Nested note.md", "/")).toBe(false);
        expect(checkPath("Folder\\Nested note.md", "/")).toBe(false);
    });

    test('normalizes percent values for CSS variables', () => {
        expect(normalizePercent(70)).toBe('70%');
        expect(normalizePercent(-10)).toBe('0%');
        expect(normalizePercent(120)).toBe('100%');
    });

    test('clamps number values to the configured range', () => {
        expect(clampNumber(1.2, 0.5, 2)).toBe(1.2);
        expect(clampNumber(0.2, 0.5, 2)).toBe(0.5);
        expect(clampNumber(3, 0.5, 2)).toBe(2);
    });

    test('defaults existing rules to whole background target', () => {
        expect(getRuleTarget({ target: BackgroundTarget.Note })).toBe(BackgroundTarget.Note);
        expect(getRuleTarget({})).toBe(BackgroundTarget.Whole);
    });

    test('defaults existing rules to image fill type', () => {
        expect(getRuleBackgroundFill({ fillType: BackgroundFillType.Color, color: '#232caf' })).toBe('#232caf');
        expect(getRuleBackgroundFill({ image: 'https://example.com/bg.jpg' })).toBe('url("https://example.com/bg.jpg")');
    });

    test('normalizes overlay values before saving and rendering', () => {
        expect(normalizeOverlay(0.24)).toBe(0.24);
        expect(normalizeOverlay(-1)).toBe(0);
        expect(normalizeOverlay(1)).toBe(0.8);
        expect(normalizeOverlay(undefined)).toBe(0);
    });

    test('defaults existing rules to cover sizing', () => {
        expect(getRuleSizeMode({ sizeMode: BackgroundSizeMode.Contain })).toBe(BackgroundSizeMode.Contain);
        expect(getRuleSizeMode({})).toBe(BackgroundSizeMode.Cover);
    });

    test('keeps zoom edge-safe for odd window sizes', () => {
        expect(normalizeZoom(1.25)).toBe(1.25);
        expect(normalizeZoom(0.4)).toBe(1);
        expect(normalizeZoom(3)).toBe(3);
        expect(normalizeZoom(8)).toBe(6);
        expect(normalizeZoom(undefined)).toBe(1);
    });

    test('matches inline tags with or without hash prefix', () => {
        expect(normalizeTag('test')).toBe('#test');
        expect(normalizeTag('#Project/Test ')).toBe('#project/test');
        expect(tagMatches([{ tag: '#test' }], 'test')).toBe(true);
        expect(tagMatches([{ tag: '#project/test' }], '#Project/Test')).toBe(true);
        expect(tagMatches([{ tag: '#private' }], 'test')).toBe(false);
        expect(frontmatterTagMatches(['test', 'private'], '#test')).toBe(true);
        expect(frontmatterTagMatches('test private', 'private')).toBe(true);
    });
});
