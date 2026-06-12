/* global document, window */
import { MarkdownView, Plugin, TFile, WorkspaceLeaf } from 'obsidian';

import { BackgroundFillType, BackgroundImageRule, BackgroundRuleSettings, BackgroundSizeMode, BackgroundTarget, DEFAULT_SETTINGS, RuleType, SettingsTab } from './settingsTab';

const BODY_CLASS = 'obsidian-rule-background-enabled';
const SIMPLE_CLASS = 'obsidian-rule-background-simple';
const NOTE_CLASS = 'obsidian-rule-note-background-enabled';
const WHOLE_BACKGROUND_LAYER_CLASS = 'obsidian-rule-background-layer';
const WHOLE_OVERLAY_LAYER_CLASS = 'obsidian-rule-background-overlay';
const WHOLE_BACKGROUND_LAYER_EXIT_CLASS = 'obsidian-rule-background-layer-exit';
const WHOLE_OVERLAY_LAYER_EXIT_CLASS = 'obsidian-rule-background-overlay-exit';
const NOTE_EXIT_CLASS = 'obsidian-rule-note-background-exit';
const ANIMATION_MS = 420;

export const checkPath = (currentPath: string, folder: string): boolean => {
    if (folder.trim() === '/') {
        return !/[/\\]/.test(currentPath);
    }
    const parts = currentPath.split(/[/\\]/);
    return parts.includes(folder);
};

export const clampNumber = (value: number | undefined, min: number, max: number): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
};

export const normalizePercent = (value: number | undefined): string => {
    return `${clampNumber(value, 0, 100)}%`;
};

export const getRuleTarget = (rule: Pick<BackgroundImageRule, 'target'>): BackgroundTarget => {
    return rule.target ?? BackgroundTarget.Whole;
};

export const normalizeOverlay = (value: number | undefined): number => {
    return clampNumber(value ?? 0, 0, 0.8);
};

export const normalizeZoom = (value: number | undefined): number => {
    return clampNumber(value ?? 1, 1, 6);
};

export const getRuleSizeMode = (rule: Pick<BackgroundImageRule, 'sizeMode'>): BackgroundSizeMode => {
    return rule.sizeMode ?? BackgroundSizeMode.Cover;
};

export interface CachedTag {
    tag: string;
}

export const normalizeTag = (value: string): string => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '';
    return normalized.startsWith('#') ? normalized : `#${normalized}`;
};

export const tagMatches = (tags: CachedTag[] | undefined, value: string): boolean => {
    const normalizedValue = normalizeTag(value);
    if (!normalizedValue) return false;
    return tags?.some((tag) => normalizeTag(tag.tag) === normalizedValue) ?? false;
};

export const frontmatterTagMatches = (frontMatterValue: unknown, value: string): boolean => {
    const normalizedValue = normalizeTag(value);
    if (!normalizedValue) return false;
    if (Array.isArray(frontMatterValue)) {
        return frontMatterValue.some((tag) => normalizeTag(String(tag)) === normalizedValue);
    }
    if (typeof frontMatterValue === 'string') {
        return frontMatterValue
            .split(/[,\s]+/)
            .some((tag) => normalizeTag(tag) === normalizedValue);
    }
    return false;
};

const toCssUrl = (value: string): string => {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `url("${escaped}")`;
};

export const getRuleBackgroundFill = (
    rule: Partial<Pick<BackgroundImageRule, 'fillType' | 'image' | 'color' | 'gradientFrom' | 'gradientTo'>>
): string => {
    switch (rule.fillType ?? BackgroundFillType.Image) {
        case BackgroundFillType.Color:
            return rule.color ?? '#232caf';
        case BackgroundFillType.Gradient:
            return `linear-gradient(135deg, ${rule.gradientFrom ?? '#232caf'}, ${rule.gradientTo ?? '#c44545'})`;
        case BackgroundFillType.Image:
            return toCssUrl((rule.image ?? '').trim());
    }
};

export default class BackgroundSwitcherPlugin extends Plugin {
    settings: BackgroundRuleSettings;
    activeWholeSignature = '';

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new SettingsTab(this.app, this));

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", this.onActiveLeafChange.bind(this))
        );
        this.registerEvent(
            this.app.metadataCache.on("changed", this.onMetadataChange.bind(this))
        );
        this.registerEvent(
            this.app.vault.on("rename", this.onFileRename.bind(this))
        );

        this.applyRules();
    }

    onunload() {
        this.clearBackground();
    }

    onActiveLeafChange(activeLeaf: WorkspaceLeaf) {
        this.applyRules();
    }

    onMetadataChange(file: TFile) {
        if (file === this.app.workspace.getActiveFile()) {
            this.applyRules();
        }
    }

    onFileRename(file: TFile) {
        this.applyRules();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.normalizeSettings();
    }

    async saveSettings() {
        this.normalizeSettings();
        await this.saveData(this.settings);
        this.applyRules();
    }

    normalizeSettings() {
        this.settings.backgroundRules.forEach((rule) => {
            rule.target = getRuleTarget(rule);
            rule.fillType = rule.fillType ?? BackgroundFillType.Image;
            rule.overlayOpacity = normalizeOverlay(rule.overlayOpacity);
            rule.zoom = normalizeZoom(rule.zoom);
            rule.positionX = clampNumber(rule.positionX ?? 70, 0, 100);
            rule.positionY = clampNumber(rule.positionY ?? 0, 0, 100);
            rule.sizeMode = getRuleSizeMode(rule);
            rule.color = rule.color ?? '#232caf';
            rule.gradientFrom = rule.gradientFrom ?? '#232caf';
            rule.gradientTo = rule.gradientTo ?? '#c44545';
        });
    }

    applyRules() {
        this.clearNoteBackgrounds();

        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            this.clearBackground();
            return;
        }

        const matchedRule = this.settings.backgroundRules.find((rule) => {
            return this.ruleMatchesFile(activeFile, rule);
        });

        if (!matchedRule || !this.ruleHasBackground(matchedRule)) {
            this.clearBackground();
            return;
        }

        if (getRuleTarget(matchedRule) === BackgroundTarget.Note) {
            this.clearBackground();
            this.applyNoteBackground(matchedRule);
            return;
        }

        this.applyWholeBackground(matchedRule);
    }

    ruleHasBackground(rule: BackgroundImageRule): boolean {
        switch (rule.fillType ?? BackgroundFillType.Image) {
            case BackgroundFillType.Color:
            case BackgroundFillType.Gradient:
                return true;
            case BackgroundFillType.Image:
                return rule.image.trim().length > 0;
        }
    }

    ruleMatchesFile(file: TFile, rule: BackgroundImageRule): boolean {
        switch (rule.type) {
            case RuleType.Folder:
                return checkPath(file.path, rule.value);
            case RuleType.Frontmatter: {
                const [key, value] = rule.value.split(":", 2);
                const fileCache = this.app.metadataCache.getFileCache(file);
                if (key?.trim().toLowerCase() === 'tags') {
                    const cacheTags = fileCache?.tags;
                    if (tagMatches(cacheTags, value)) return true;
                    if (frontmatterTagMatches(fileCache?.frontmatter?.[key], value)) return true;
                }
                const frontMatterValue = fileCache?.frontmatter?.[key];
                const normalizedFrontMatterValue = frontMatterValue?.toString().toLowerCase().trim();
                const normalizedValueToMatch = value?.toString().toLowerCase().trim();
                return normalizedFrontMatterValue === normalizedValueToMatch;
            }
            case RuleType.Tag: {
                const cacheTags = this.app.metadataCache.getFileCache(file)?.tags;
                return tagMatches(cacheTags, rule.value);
            }
        }
    }

    applyWholeBackground(rule: BackgroundImageRule) {
        const body = document.body;
        const cssSettings = this.getRuleCssSettings(rule);
        const signature = this.getRuleSignature(rule);
        const isNewBackground = this.activeWholeSignature !== signature;
        const existingBackgroundLayer = this.getWholeBackgroundLayer();
        const existingOverlayLayer = this.getWholeOverlayLayer();

        if (isNewBackground) {
            this.fadeOutWholeLayer(existingBackgroundLayer, WHOLE_BACKGROUND_LAYER_EXIT_CLASS);
            this.fadeOutWholeLayer(existingOverlayLayer, WHOLE_OVERLAY_LAYER_EXIT_CLASS);
        }

        const backgroundLayer = isNewBackground ? this.createWholeBackgroundLayer() : this.ensureWholeBackgroundLayer();
        const overlayLayer = isNewBackground ? this.createWholeOverlayLayer() : this.ensureWholeOverlayLayer();

        body.classList.toggle(BODY_CLASS, !this.settings.simpleMode);
        body.classList.toggle(SIMPLE_CLASS, this.settings.simpleMode);
        this.applyCssSettings(body, cssSettings);
        this.applyCssSettings(backgroundLayer, cssSettings);
        this.applyCssSettings(overlayLayer, cssSettings);
        this.activeWholeSignature = signature;
    }

    getRuleSignature(rule: BackgroundImageRule): string {
        return [
            getRuleTarget(rule),
            rule.fillType ?? BackgroundFillType.Image,
            this.getRuleBackgroundFill(rule),
            getRuleSizeMode(rule),
            normalizeZoom(rule.zoom),
            normalizePercent(rule.positionX ?? 70),
            normalizePercent(rule.positionY ?? 0),
            clampNumber(rule.saturate, 0, 2),
            clampNumber(rule.brightness, 0.2, 2),
            normalizeOverlay(rule.overlayOpacity),
        ].join('|');
    }

    getWholeBackgroundLayer(): HTMLElement | null {
        return document.body.querySelector<HTMLElement>(`.${WHOLE_BACKGROUND_LAYER_CLASS}`);
    }

    getWholeOverlayLayer(): HTMLElement | null {
        return document.body.querySelector<HTMLElement>(`.${WHOLE_OVERLAY_LAYER_CLASS}`);
    }

    ensureWholeBackgroundLayer(): HTMLElement {
        const existingLayer = this.getWholeBackgroundLayer();
        if (existingLayer) return existingLayer;

        return this.createWholeBackgroundLayer();
    }

    createWholeBackgroundLayer(): HTMLElement {
        const layer = document.createElement('div');
        layer.addClass(WHOLE_BACKGROUND_LAYER_CLASS);
        document.body.prepend(layer);
        return layer;
    }

    ensureWholeOverlayLayer(): HTMLElement {
        const existingLayer = this.getWholeOverlayLayer();
        if (existingLayer) return existingLayer;

        return this.createWholeOverlayLayer();
    }

    createWholeOverlayLayer(): HTMLElement {
        const layer = document.createElement('div');
        layer.addClass(WHOLE_OVERLAY_LAYER_CLASS);
        document.body.prepend(layer);
        return layer;
    }

    fadeOutWholeLayer(layer: HTMLElement | null, exitClass: string) {
        if (!layer) return;
        layer.removeClass(WHOLE_BACKGROUND_LAYER_CLASS);
        layer.removeClass(WHOLE_OVERLAY_LAYER_CLASS);
        layer.addClass(exitClass);
        window.setTimeout(() => {
            layer.remove();
        }, ANIMATION_MS);
    }

    applyNoteBackground(rule: BackgroundImageRule) {
        const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        const contentView = activeLeaf?.containerEl.querySelector(".view-content") as HTMLElement | null;
        if (!contentView) return;

        contentView.classList.add(NOTE_CLASS);
        contentView.removeClass('obsidian-rule-note-background-fade');
        void contentView.offsetWidth;
        contentView.addClass('obsidian-rule-note-background-fade');
        this.applyCssSettings(contentView, this.getRuleCssSettings(rule));
    }

    getRuleCssSettings(rule: BackgroundImageRule): Record<string, string> {
        return {
            '--obs-rule-bg-fill': this.getRuleBackgroundFill(rule),
            '--obs-rule-bg-size': getRuleSizeMode(rule),
            '--obs-rule-bg-zoom': normalizeZoom(rule.zoom).toString(),
            '--obs-rule-bg-pos-x': normalizePercent(rule.positionX ?? 70),
            '--obs-rule-bg-pos-y': normalizePercent(rule.positionY ?? 0),
            '--obs-rule-bg-saturate': clampNumber(rule.saturate, 0, 2).toString(),
            '--obs-rule-bg-brightness': clampNumber(rule.brightness, 0.2, 2).toString(),
            '--obs-rule-bg-overlay-opacity': normalizeOverlay(rule.overlayOpacity).toString(),
        };
    }

    getRuleBackgroundFill(rule: BackgroundImageRule): string {
        if ((rule.fillType ?? BackgroundFillType.Image) !== BackgroundFillType.Image) {
            return getRuleBackgroundFill(rule);
        }
        return getRuleBackgroundFill({
            ...rule,
            image: this.resolveImageSource(rule.image),
        });
    }

    resolveImageSource(value: string): string {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (/^(?:https?:|app:|file:|data:|blob:)/i.test(trimmed)) return trimmed;

        const normalizedPath = trimmed.replace(/^\/+/, '');
        const directFile = this.app.vault.getAbstractFileByPath(normalizedPath);
        if (directFile instanceof TFile) {
            return this.app.vault.getResourcePath(directFile);
        }

        const linkedFile = this.app.metadataCache.getFirstLinkpathDest(normalizedPath, '');
        if (linkedFile) {
            return this.app.vault.getResourcePath(linkedFile);
        }

        return trimmed;
    }

    applyCssSettings(element: HTMLElement, settings: Record<string, string>) {
        Object.entries(settings).forEach(([property, value]) => {
            element.style.setProperty(property, value);
        });
    }

    clearBackground() {
        const body = document.body;
        body.classList.remove(BODY_CLASS);
        body.classList.remove(SIMPLE_CLASS);
        this.fadeOutWholeLayer(this.getWholeBackgroundLayer(), WHOLE_BACKGROUND_LAYER_EXIT_CLASS);
        this.fadeOutWholeLayer(this.getWholeOverlayLayer(), WHOLE_OVERLAY_LAYER_EXIT_CLASS);
        this.activeWholeSignature = '';
        this.clearCssSettings(body);
    }

    clearNoteBackgrounds() {
        this.app.workspace.getLeavesOfType("markdown").forEach((leaf: WorkspaceLeaf) => {
            const contentView = leaf.view.containerEl.querySelector<HTMLElement>(".view-content");
            if (!contentView) return;
            if (contentView.hasClass(NOTE_CLASS)) {
                this.applyCssSettings(contentView, this.getElementCssSettings(contentView));
                contentView.addClass(NOTE_EXIT_CLASS);
                window.setTimeout(() => {
                    contentView.classList.remove(NOTE_CLASS);
                    contentView.classList.remove(NOTE_EXIT_CLASS);
                    this.clearCssSettings(contentView);
                }, ANIMATION_MS);
            } else {
                contentView.classList.remove(NOTE_EXIT_CLASS);
                this.clearCssSettings(contentView);
            }
            contentView.classList.remove('obsidian-rule-note-background-fade');
        });
    }

    clearCssSettings(element: HTMLElement) {
        [
            '--obs-rule-bg-image',
            '--obs-rule-bg-fill',
            '--obs-rule-bg-size',
            '--obs-rule-bg-zoom',
            '--obs-rule-bg-pos-x',
            '--obs-rule-bg-pos-y',
            '--obs-rule-bg-saturate',
            '--obs-rule-bg-brightness',
            '--obs-rule-bg-overlay-opacity',
        ].forEach((property) => element.style.removeProperty(property));
    }

    getElementCssSettings(element: HTMLElement): Record<string, string> {
        return {
            '--obs-rule-bg-fill': element.style.getPropertyValue('--obs-rule-bg-fill'),
            '--obs-rule-bg-size': element.style.getPropertyValue('--obs-rule-bg-size'),
            '--obs-rule-bg-zoom': element.style.getPropertyValue('--obs-rule-bg-zoom'),
            '--obs-rule-bg-pos-x': element.style.getPropertyValue('--obs-rule-bg-pos-x'),
            '--obs-rule-bg-pos-y': element.style.getPropertyValue('--obs-rule-bg-pos-y'),
            '--obs-rule-bg-saturate': element.style.getPropertyValue('--obs-rule-bg-saturate'),
            '--obs-rule-bg-brightness': element.style.getPropertyValue('--obs-rule-bg-brightness'),
            '--obs-rule-bg-overlay-opacity': element.style.getPropertyValue('--obs-rule-bg-overlay-opacity'),
        };
    }
}
