import { App, Notice, PluginSettingTab, type Setting, type SettingDefinition, type SettingDefinitionItem } from "obsidian";
import type OrdinalHeadingsPlugin from "./main";
import { EMPTY_FORMATS, PRESETS } from "./presets";
import { applyImportedSettings, downloadSettingsJson, parseSettingsJson, pickSettingsFile } from "./settings-io";
import type { HeadingLevel, LevelFormats, OrdinalSettings } from "./types";

export const DEFAULT_SETTINGS: OrdinalSettings = {
	enabled: true,
	startLevel: 1,
	presetId: "decimal",
	customFormats: [
		"{dotted}",
		"{dotted}",
		"{dotted}",
		"{dotted}",
		"{dotted}",
		"{dotted}",
	],
	trailing: " ",
};

function asHeadingLevel(value: unknown): HeadingLevel {
	const start = Number(value);
	if (start === 1 || start === 2 || start === 3 || start === 4 || start === 5 || start === 6) {
		return start;
	}
	return 1;
}

function asLevelFormats(value: unknown): LevelFormats {
	if (!Array.isArray(value) || value.length !== 6) {
		return [...DEFAULT_SETTINGS.customFormats];
	}
	const formats: string[] = [];
	for (const item of value) {
		if (typeof item !== "string") return [...DEFAULT_SETTINGS.customFormats];
		formats.push(item);
	}
	const first = formats[0];
	const second = formats[1];
	const third = formats[2];
	const fourth = formats[3];
	const fifth = formats[4];
	const sixth = formats[5];
	if (
		first === undefined ||
		second === undefined ||
		third === undefined ||
		fourth === undefined ||
		fifth === undefined ||
		sixth === undefined
	) {
		return [...DEFAULT_SETTINGS.customFormats];
	}
	return [first, second, third, fourth, fifth, sixth];
}

export function normalizeSettings(raw: unknown): OrdinalSettings {
	const data = (raw ?? {}) as Partial<OrdinalSettings>;
	return {
		enabled: data.enabled !== false,
		startLevel: asHeadingLevel(data.startLevel),
		presetId: typeof data.presetId === "string" ? data.presetId : "decimal",
		customFormats: asLevelFormats(data.customFormats),
		trailing: typeof data.trailing === "string" ? data.trailing : " ",
	};
}

const START_LEVEL_OPTIONS: Record<string, string> = {
	"1": "Heading 1",
	"2": "Heading 2",
	"3": "Heading 3",
	"4": "Heading 4",
	"5": "Heading 5",
	"6": "Heading 6",
};

export class OrdinalSettingTab extends PluginSettingTab {
	plugin: OrdinalHeadingsPlugin;

	constructor(app: App, plugin: OrdinalHeadingsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override getControlValue(key: string): unknown {
		if (key === "startLevel") return String(this.plugin.settings.startLevel);
		return super.getControlValue(key);
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === "startLevel") value = asHeadingLevel(value);
		await super.setControlValue(key, value);
		this.plugin.applySettings();
	}

	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Enable numbering",
				desc: "Show live heading numbers visually (does not modify your notes).",
				control: { type: "toggle", key: "enabled" },
			},
			{
				name: "Start at heading level",
				desc: "Headings above this level are left unnumbered.",
				control: {
					type: "dropdown",
					key: "startLevel",
					options: START_LEVEL_OPTIONS,
				},
			},
			{
				name: "List library",
				desc: "Pick a multilevel style, or choose Custom and edit formats below. Tokens: {n} {dotted} {1}–{6} {roman} {Roman} {alpha} {Alpha} {zh} {n-pad2}",
				render: (setting) => {
					this.renderPresetGallery(setting);
				},
			},
			{
				type: "group",
				heading: "Custom formats",
				items: [0, 1, 2, 3, 4, 5].map((index) => this.formatDefinition(index)),
			},
			{
				type: "group",
				heading: "How numbering works",
				items: [
					{
						name: "Visual labels",
						desc: "By default, numbers are visual only — they appear next to headings while you edit or read, but are not written into the Markdown file. They update automatically when you add, remove, or reorder headings.",
					},
					{
						name: "Existing prefixes",
						desc: "If a heading already starts with a number-like prefix (for example “1.” or “2.1”), the visual label is skipped so you do not see doubles like “1. 1. Title”.",
					},
				],
			},
			{
				type: "group",
				heading: "Bake into Markdown",
				items: [
					{
						name: "What baking does",
						desc: "Baking writes the numbers into the file text (useful for PDF, Publish, search, and the outline). It is manual and only affects the note you currently have open. It does not auto-insert while you type, and it does not process the whole vault.",
					},
					{
						name: "Bake the current note",
						desc: "Open the note, choose a style in the list library, then run Bake numbers into current note from the command palette. Headings are rewritten, for example “# Intro” becomes “# 1 Intro”. Run it again after later edits. Bake strips an old recognizable prefix first.",
					},
					{
						name: "Remove baked numbers",
						desc: "Run Strip baked numbers from current note from the command palette.",
					},
				],
			},
			{
				type: "group",
				heading: "Per-note control",
				items: [
					{
						name: "Frontmatter",
						desc: "ordinal-headings: off (or on) enables or disables this note. ordinal-headings-style picks a preset for this note (decimal, zh-chapter, custom, and the other library ids).",
					},
					{
						name: "Commands",
						desc: "Bake numbers into current note, Strip baked numbers from current note, Toggle numbering for current note, and Refresh heading numbers.",
					},
				],
			},
			{
				type: "group",
				heading: "Backup",
				items: [
					{
						name: "Export settings",
						desc: "Download the current configuration as JSON.",
						action: () => {
							downloadSettingsJson(this.plugin.settings, "ordinal-headings-settings.json");
						},
					},
					{
						name: "Import settings",
						desc: "Replace the current configuration from a JSON file.",
						action: () => {
							this.importSettings();
						},
					},
				],
			},
		];
	}

	private formatDefinition(index: number): SettingDefinition {
		const level = index + 1;
		return {
			name: `Heading ${level}`,
			render: (setting) => {
				const formats =
					this.plugin.settings.presetId === "custom"
						? this.plugin.settings.customFormats
						: (PRESETS.find((preset) => preset.id === this.plugin.settings.presetId)?.formats ??
							EMPTY_FORMATS);
				setting.addText((text) => {
					text.setValue(formats[index] ?? "");
					text.setPlaceholder(index === 0 ? "第{n}章" : "{dotted}");
					text.setDisabled(this.plugin.settings.presetId !== "custom");
					text.onChange((value) => {
						if (this.plugin.settings.presetId !== "custom") return;
						this.plugin.settings.customFormats = replaceFormat(
							this.plugin.settings.customFormats,
							index,
							value,
						);
						void this.plugin.saveSettings().then(() => {
							this.plugin.applySettings();
						});
					});
				});
			},
		};
	}

	private renderPresetGallery(setting: Setting): void {
		const gallery = setting.settingEl.createDiv({ cls: "ordinal-headings-gallery" });
		for (const preset of PRESETS) {
			this.renderPresetCard(gallery, preset.id, preset.name, preset.preview);
		}
		this.renderPresetCard(gallery, "custom", "Custom", ["Define your own", "e.g. 第{n}章"]);
	}

	private renderPresetCard(gallery: HTMLElement, id: string, name: string, lines: string[]): void {
		const selected = this.plugin.settings.presetId === id;
		const card = gallery.createDiv({
			cls: selected ? "ordinal-headings-preset is-selected" : "ordinal-headings-preset",
		});
		card.createDiv({ cls: "ordinal-headings-preset-title", text: name });
		for (const line of lines) {
			card.createDiv({ cls: "ordinal-headings-preset-line", text: line });
		}
		card.addEventListener("click", () => {
			void this.choosePreset(id);
		});
	}

	private async choosePreset(id: string): Promise<void> {
		this.plugin.settings.presetId = id;
		const preset = PRESETS.find((item) => item.id === id);
		if (preset && id !== "none" && id !== "custom") {
			this.plugin.settings.customFormats = [...preset.formats];
		}
		await this.plugin.saveSettings();
		this.plugin.applySettings();
		this.update();
	}

	private importSettings(): void {
		pickSettingsFile((text) => {
			try {
				const next = parseSettingsJson(text, normalizeSettings);
				applyImportedSettings(this.plugin.settings, next);
				void this.plugin.saveSettings().then(
					() => {
						this.plugin.applySettings();
						this.update();
						new Notice("Ordinal headings settings imported");
					},
					() => {
						new Notice("Could not import settings");
					},
				);
			} catch (err) {
				new Notice(err instanceof Error ? err.message : "Could not import settings");
			}
		});
	}
}

function replaceFormat(formats: LevelFormats, index: number, value: string): LevelFormats {
	const next: LevelFormats = [...formats];
	const slot = next[index];
	if (slot === undefined) return formats;
	next[index] = value;
	return next;
}
