import { App, ButtonComponent, ColorComponent, DropdownComponent, PluginSettingTab, Setting, SliderComponent, TextComponent } from 'obsidian';
import type BackgroundSwitcherPlugin from './main';

const IMPORT_FOLDER = 'Background Switcher Images';

export enum RuleType {
    Folder = "folder",
    Frontmatter = "frontmatter",
    Tag = "tag"
}

export enum BackgroundTarget {
    Whole = "whole",
    Note = "note"
}

export enum BackgroundFillType {
    Image = "image",
    Color = "color",
    Gradient = "gradient"
}

export enum BackgroundSizeMode {
    Cover = "cover",
    Contain = "contain"
}

export interface BackgroundImageRule {
    id: string;
    value: string;
    type: RuleType;
    target?: BackgroundTarget;
    fillType?: BackgroundFillType;
    image: string;
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
    sizeMode?: BackgroundSizeMode;
    overlayOpacity?: number;
    zoom?: number;
    positionX?: number;
    positionY?: number;
    saturate?: number;
    brightness?: number;
}

export class BackgroundRuleSettings {
    backgroundRules: BackgroundImageRule[] = [];
    simpleMode = false;
}

export const DEFAULT_SETTINGS: BackgroundRuleSettings = {
    simpleMode: false,
    backgroundRules: [
        {
            id: "frontmatter-test-unsplash",
            value: "tags: test",
            type: RuleType.Frontmatter,
            target: BackgroundTarget.Whole,
            fillType: BackgroundFillType.Image,
            image:
                'https://images.unsplash.com/photo-1602076172058-08ca551bad2b?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            color: '#232caf',
            gradientFrom: '#232caf',
            gradientTo: '#c44545',
            sizeMode: BackgroundSizeMode.Cover,
            overlayOpacity: 0,
            zoom: 1,
            positionX: 70,
            positionY: 0,
            saturate: 1,
            brightness: 1,
        }
    ],
};

export class SettingsTab extends PluginSettingTab {
    plugin: BackgroundSwitcherPlugin;

    constructor(app: App, plugin: BackgroundSwitcherPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('obr-settings');

        containerEl.createEl('p', {
            text: 'Add rules to switch the whole Obsidian background image. Rules are matched in order--first match wins.',
            cls: 'setting-item-description'
        });

        new Setting(containerEl)
            .setName('Background image only')
            .setDesc('Disable the extra transparency and frosted-glass blur. Shows just the background image and note background, with semi-transparent sidebars and tabs.')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.simpleMode)
                    .onChange((value) => {
                        this.plugin.settings.simpleMode = value;
                        void this.plugin.saveSettings();
                    });
            });

        const table = containerEl.createEl('div', { cls: 'obr-rules-table' });
        const rulesContainer = table.createEl('div', { cls: 'obr-rules-body' });
        this.renderRules(rulesContainer);

        new Setting(containerEl)
            .addButton((btn) => {
                btn.setButtonText('Add rule')
                    .setCta()
                    .onClick(() => {
                        const newRule: BackgroundImageRule = {
                            id: Date.now().toString(),
                            value: '',
                            type: RuleType.Folder,
                            target: BackgroundTarget.Whole,
                            fillType: BackgroundFillType.Image,
                            image: '',
                            color: '#232caf',
                            gradientFrom: '#232caf',
                            gradientTo: '#c44545',
                            sizeMode: BackgroundSizeMode.Cover,
                            overlayOpacity: 0,
                            zoom: 1,
                            positionX: 70,
                            positionY: 0,
                            saturate: 1,
                            brightness: 1,
                        };
                        this.plugin.settings.backgroundRules.push(newRule);
                        void this.plugin.saveSettings();
                        this.renderRules(rulesContainer);
                    });
            });
    }

    renderRules(container: HTMLElement): void {
        container.empty();
        this.plugin.settings.backgroundRules.forEach((rule, index) => {
            this.addRuleRow(container, rule, index);
        });
    }

    addRuleRow(container: HTMLElement, rule: BackgroundImageRule, index: number): void {
        const row = container.createEl('div', { cls: 'obr-rule-row' });
        const topRow = row.createEl('div', { cls: 'obr-rule-line obr-rule-line-top' });
        const bottomRow = row.createEl('div', { cls: 'obr-rule-line obr-rule-line-bottom' });

        const valueCell = this.createRuleCell(topRow, 'Value');
        const valueInput = new TextComponent(valueCell)
            .setPlaceholder(this.getValuePlaceholder(rule.type))
            .setValue(rule.value)
            .onChange((value) => {
                rule.value = value;
                void this.plugin.saveSettings();
            });

        const typeCell = this.createRuleCell(topRow, 'Type');
        new DropdownComponent(typeCell)
            .addOption(RuleType.Folder, 'Folder')
            .addOption(RuleType.Frontmatter, 'Frontmatter')
            .addOption(RuleType.Tag, 'Tag')
            .setValue(rule.type)
            .onChange((value) => {
                rule.type = value as RuleType;
                valueInput.setPlaceholder(this.getValuePlaceholder(rule.type));
                void this.plugin.saveSettings();
            });

        const targetCell = this.createRuleCell(topRow, 'Target');
        new DropdownComponent(targetCell)
            .addOption(BackgroundTarget.Whole, 'Whole')
            .addOption(BackgroundTarget.Note, 'Note')
            .setValue(rule.target ?? BackgroundTarget.Whole)
            .onChange((value) => {
                rule.target = value as BackgroundTarget;
                void this.plugin.saveSettings();
            });

        const fillTypeCell = this.createRuleCell(topRow, 'Fill');
        new DropdownComponent(fillTypeCell)
            .addOption(BackgroundFillType.Image, 'Image')
            .addOption(BackgroundFillType.Color, 'Color')
            .addOption(BackgroundFillType.Gradient, 'Gradient')
            .setValue(rule.fillType ?? BackgroundFillType.Image)
            .onChange((value) => {
                rule.fillType = value as BackgroundFillType;
                void this.plugin.saveSettings();
                this.renderRules(container);
            });

        const imageCell = this.createRuleCell(topRow, 'Background', 'obr-image-cell');
        this.addBackgroundInput(imageCell, rule);

        if ((rule.fillType ?? BackgroundFillType.Image) === BackgroundFillType.Image) {
            const layoutCell = this.createRuleCell(bottomRow, 'Layout', 'obr-layout-cell');
            this.addLayoutControls(layoutCell, rule);

            const overlayCell = this.createRuleCell(bottomRow, 'Overlay');
            this.addOverlaySlider(overlayCell, rule);
        } else {
            bottomRow.addClass('obr-rule-line-simple');
        }

        const priorityCell = this.createRuleCell(bottomRow, 'Priority', 'obr-priority-cell');

        new ButtonComponent(priorityCell)
            .setIcon('chevron-up')
            .setTooltip('Move up (higher priority)')
            .setDisabled(index === 0)
            .onClick(() => {
                this.plugin.settings.backgroundRules.splice(index, 1);
                this.plugin.settings.backgroundRules.splice(index - 1, 0, rule);
                void this.plugin.saveSettings();
                this.renderRules(container);
            });

        new ButtonComponent(priorityCell)
            .setIcon('chevron-down')
            .setTooltip('Move down (lower priority)')
            .setDisabled(index === this.plugin.settings.backgroundRules.length - 1)
            .onClick(() => {
                this.plugin.settings.backgroundRules.splice(index, 1);
                this.plugin.settings.backgroundRules.splice(index + 1, 0, rule);
                void this.plugin.saveSettings();
                this.renderRules(container);
            });

        const deleteCell = this.createRuleCell(bottomRow, 'Remove', 'obr-delete-cell');
        new ButtonComponent(deleteCell)
            .setIcon('x')
            .setTooltip('Delete rule')
            .onClick(() => {
                this.plugin.settings.backgroundRules = this.plugin.settings.backgroundRules.filter((r) => r.id !== rule.id);
                void this.plugin.saveSettings();
                this.renderRules(container);
            });
    }

    private createRuleCell(row: HTMLElement, label: string, extraClass = ''): HTMLElement {
        const cls = extraClass ? `obr-cell ${extraClass}` : 'obr-cell';
        const cell = row.createEl('div', { cls });
        cell.createEl('span', { text: label, cls: 'obr-field-label' });
        return cell;
    }

    private getValuePlaceholder(type: RuleType): string {
        switch (type) {
            case RuleType.Folder:
                return 'Folder name';
            case RuleType.Tag:
                return 'tag or #tag';
            case RuleType.Frontmatter:
                return 'key: value';
        }
    }

    private addLayoutControls(cell: HTMLElement, rule: BackgroundImageRule): void {
        new DropdownComponent(cell)
            .addOption(BackgroundSizeMode.Cover, 'Cover')
            .addOption(BackgroundSizeMode.Contain, 'Contain')
            .setValue(rule.sizeMode ?? BackgroundSizeMode.Cover)
            .onChange((value) => {
                rule.sizeMode = value as BackgroundSizeMode;
                void this.plugin.saveSettings();
            });

        this.addMiniNumber(cell, 'Zoom', 'x', 'Image scale, where 1x is normal and 6x is very zoomed in.', rule.zoom ?? 1, 1, 6, 0.01, (value) => {
            rule.zoom = value;
        });
        this.addMiniNumber(cell, 'X', '%', 'Horizontal focal point: 0% left, 50% center, 100% right.', rule.positionX ?? 70, 0, 100, 1, (value) => {
            rule.positionX = value;
        });
        this.addMiniNumber(cell, 'Y', '%', 'Vertical focal point: 0% top, 50% center, 100% bottom.', rule.positionY ?? 0, 0, 100, 1, (value) => {
            rule.positionY = value;
        });
    }

    private addMiniNumber(
        cell: HTMLElement,
        label: string,
        suffix: string,
        tooltip: string,
        value: number,
        min: number,
        max: number,
        step: number,
        updateRule: (value: number) => void
    ): void {
        const wrapper = cell.createEl('label', {
            cls: 'obr-mini-number',
            attr: { title: tooltip }
        });
        wrapper.createEl('span', { text: label });
        const input = new TextComponent(wrapper).setValue(value.toString());
        input.inputEl.type = 'number';
        input.inputEl.min = min.toString();
        input.inputEl.max = max.toString();
        input.inputEl.step = step.toString();
        input.inputEl.ariaLabel = tooltip;
        wrapper.createEl('span', { text: suffix, cls: 'obr-unit-suffix' });
        input.onChange((rawValue) => {
            const parsed = parseFloat(rawValue);
            if (Number.isNaN(parsed)) return;
            updateRule(Math.min(Math.max(parsed, min), max));
            void this.plugin.saveSettings();
        });
    }

    private addBackgroundInput(cell: HTMLElement, rule: BackgroundImageRule): void {
        switch (rule.fillType ?? BackgroundFillType.Image) {
            case BackgroundFillType.Color:
                this.addColorInput(cell, rule);
                break;
            case BackgroundFillType.Gradient:
                this.addGradientInput(cell, rule);
                break;
            case BackgroundFillType.Image:
                this.addImageInput(cell, rule);
                break;
        }
    }

    private addImageInput(cell: HTMLElement, rule: BackgroundImageRule): void {
        const displayValue = this.getImageInputDisplayValue(rule.image);
        const imageInput = new TextComponent(cell)
            .setPlaceholder('Image URL or file path')
            .setValue(displayValue)
            .onChange((value) => {
                if (this.isDataUrl(rule.image) && value === displayValue) return;
                rule.image = value.trim();
                void this.plugin.saveSettings();
            });
        imageInput.inputEl.addClass('obr-image-input');
        imageInput.inputEl.title = this.isDataUrl(rule.image) ? displayValue : rule.image;

        this.addFileButton(cell, imageInput, rule);
    }

    private getImageInputDisplayValue(value: string): string {
        return this.isDataUrl(value) ? 'Imported image - choose a file again to shorten' : value;
    }

    private isDataUrl(value: string): boolean {
        return value.trim().startsWith('data:');
    }

    private addColorInput(cell: HTMLElement, rule: BackgroundImageRule): void {
        const color = rule.color ?? '#232caf';
        const colorInput = new TextComponent(cell).setValue(color);
        colorInput.inputEl.addClass('obr-color-input');

        const picker = new ColorComponent(cell)
            .setValue(color)
            .onChange((value) => {
                rule.color = value;
                colorInput.setValue(value);
                void this.plugin.saveSettings();
            });

        colorInput.onChange((value) => {
            if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value)) {
                rule.color = value;
                picker.setValue(value);
                void this.plugin.saveSettings();
            }
        });
    }

    private addGradientInput(cell: HTMLElement, rule: BackgroundImageRule): void {
        const from = rule.gradientFrom ?? '#232caf';
        const to = rule.gradientTo ?? '#c44545';

        new ColorComponent(cell)
            .setValue(from)
            .onChange((value) => {
                rule.gradientFrom = value;
                void this.plugin.saveSettings();
            });

        new ColorComponent(cell)
            .setValue(to)
            .onChange((value) => {
                rule.gradientTo = value;
                void this.plugin.saveSettings();
            });
    }

    private addOverlaySlider(cell: HTMLElement, rule: BackgroundImageRule): void {
        const valueEl = cell.createEl('span', {
            text: (rule.overlayOpacity ?? 0).toFixed(2),
            cls: 'obr-overlay-value'
        });

        new SliderComponent(cell)
            .setLimits(0, 0.8, 0.01)
            .setValue(rule.overlayOpacity ?? 0)
            .setDynamicTooltip()
            .onChange((value) => {
                rule.overlayOpacity = value;
                valueEl.setText(value.toFixed(2));
                void this.plugin.saveSettings();
            });
    }

    private addFileButton(cell: HTMLElement, imageInput: TextComponent, rule: BackgroundImageRule): void {
        const fileInput = cell.createEl('input', { type: 'file', cls: 'obr-file-input' });
        fileInput.accept = 'image/*';
        fileInput.onchange = () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            void this.importImageFile(file, imageInput, rule);
        };

        new ButtonComponent(cell)
            .setIcon('folder-open')
            .setTooltip('Choose image file')
            .onClick(() => {
                fileInput.click();
            });
    }

    private async importImageFile(file: File, imageInput: TextComponent, rule: BackgroundImageRule): Promise<void> {
        const imagePath = await this.copyImageIntoVault(file);
        rule.image = imagePath;
        imageInput.setValue(imagePath);
        imageInput.inputEl.title = imagePath;
        await this.plugin.saveSettings();
    }

    private async copyImageIntoVault(file: File): Promise<string> {
        await this.ensureImportFolder();
        const imagePath = this.getImportedImagePath(file);
        await this.app.vault.createBinary(imagePath, await file.arrayBuffer());
        return imagePath;
    }

    private async ensureImportFolder(): Promise<void> {
        if (!this.app.vault.getAbstractFileByPath(IMPORT_FOLDER)) {
            await this.app.vault.createFolder(IMPORT_FOLDER);
        }
    }

    private getImportedImagePath(file: File): string {
        const safeName = file.name
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-z0-9-_]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || 'background';
        const extension = this.getImageExtension(file);
        return `${IMPORT_FOLDER}/${safeName}-${Date.now()}${extension}`;
    }

    private getImageExtension(file: File): string {
        const nameExtension = file.name.match(/\.[a-z0-9]+$/i)?.[0];
        if (nameExtension) return nameExtension.toLowerCase();
        if (file.type === 'image/jpeg') return '.jpg';
        if (file.type === 'image/png') return '.png';
        if (file.type === 'image/gif') return '.gif';
        if (file.type === 'image/webp') return '.webp';
        if (file.type === 'image/svg+xml') return '.svg';
        return '.png';
    }
}
