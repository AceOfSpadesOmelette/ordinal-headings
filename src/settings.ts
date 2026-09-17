import { App, PluginSettingTab, Setting } from "obsidian";
import type OrdinalHeadingsPlugin from "./main";
import { EMPTY_FORMATS, PRESETS } from "./presets";
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

export function normalizeSettings(raw: unknown): OrdinalSettings {
	const data = (raw ?? {}) as Partial<OrdinalSettings>;
	const start = Number(data.startLevel);
	const startLevel = (
		start >= 1 && start <= 6 ? start : 1
	) as HeadingLevel;

	let customFormats = data.customFormats;
	if (!Array.isArray(customFormats) || customFormats.length !== 6) {
		customFormats = [...DEFAULT_SETTINGS.customFormats];
	}

	return {
		enabled: data.enabled !== false,
		startLevel,
		presetId: typeof data.presetId === "string" ? data.presetId : "decimal",
		customFormats: customFormats as LevelFormats,
		trailing: typeof data.trailing === "string" ? data.trailing : " ",
	};
}

export class OrdinalSettingTab extends PluginSettingTab {
	plugin: OrdinalHeadingsPlugin;

	constructor(app: App, plugin: OrdinalHeadingsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Ordinal Headings" });

		new Setting(containerEl)
			.setName("Enable numbering")
			.setDesc(
				"Show live heading numbers visually (does not modify your notes).",
			)
			.addToggle((t) =>
				t.setValue(this.plugin.settings.enabled).onChange(async (v) => {
					this.plugin.settings.enabled = v;
					await this.plugin.saveSettings();
					this.plugin.applySettings();
				}),
			);

		new Setting(containerEl)
			.setName("Start at heading level")
			.setDesc("Headings above this level are left unnumbered.")
			.addDropdown((d) => {
				for (let i = 1; i <= 6; i++) {
					d.addOption(String(i), `Heading ${i}`);
				}
				d.setValue(String(this.plugin.settings.startLevel));
				d.onChange(async (v) => {
					this.plugin.settings.startLevel = Number(v) as HeadingLevel;
					await this.plugin.saveSettings();
					this.plugin.applySettings();
				});
			});

		containerEl.createEl("h3", { text: "List library" });
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "Pick a multilevel style, or choose Custom and edit formats below. Tokens: {n} {dotted} {1}–{6} {roman} {Roman} {alpha} {Alpha} {zh} {n-pad2}",
		});

		const gallery = containerEl.createDiv({ cls: "ordinal-headings-gallery" });
		for (const preset of PRESETS) {
			const card = gallery.createDiv({
				cls:
					"ordinal-headings-preset" +
					(this.plugin.settings.presetId === preset.id
						? " is-selected"
						: ""),
			});
			card.createDiv({
				cls: "ordinal-headings-preset-title",
				text: preset.name,
			});
			for (const line of preset.preview) {
				card.createDiv({
					cls: "ordinal-headings-preset-line",
					text: line,
				});
			}
			card.addEventListener("click", async () => {
				this.plugin.settings.presetId = preset.id;
				if (preset.id !== "none" && preset.id !== "custom") {
					this.plugin.settings.customFormats = [...preset.formats];
				}
				await this.plugin.saveSettings();
				this.plugin.applySettings();
				this.display();
			});
		}

		const customCard = gallery.createDiv({
			cls:
				"ordinal-headings-preset" +
				(this.plugin.settings.presetId === "custom" ? " is-selected" : ""),
		});
		customCard.createDiv({
			cls: "ordinal-headings-preset-title",
			text: "Custom",
		});
		customCard.createDiv({
			cls: "ordinal-headings-preset-line",
			text: "Define your own",
		});
		customCard.createDiv({
			cls: "ordinal-headings-preset-line",
			text: "e.g. 第{n}章",
		});
		customCard.addEventListener("click", async () => {
			this.plugin.settings.presetId = "custom";
			await this.plugin.saveSettings();
			this.plugin.applySettings();
			this.display();
		});

		containerEl.createEl("h3", { text: "Custom formats (levels 1–6)" });
		const formats =
			this.plugin.settings.presetId === "custom"
				? this.plugin.settings.customFormats
				: (PRESETS.find((p) => p.id === this.plugin.settings.presetId)
						?.formats ?? EMPTY_FORMATS);

		for (let i = 0; i < 6; i++) {
			const level = i + 1;
			new Setting(containerEl)
				.setName(`Heading ${level}`)
				.addText((t) => {
					t.setValue(formats[i] ?? "");
					t.setPlaceholder(i === 0 ? "第{n}章" : "{dotted}");
					t.setDisabled(this.plugin.settings.presetId !== "custom");
					t.onChange(async (v) => {
						if (this.plugin.settings.presetId !== "custom") return;
						this.plugin.settings.customFormats[i] = v;
						await this.plugin.saveSettings();
						this.plugin.applySettings();
					});
				});
		}

		containerEl.createEl("h3", { text: "How numbering works" });
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "By default, numbers are visual only — they appear next to headings while you edit/read, but are not written into the Markdown file. They update automatically when you add, remove, or reorder headings.",
		});
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "If a heading already starts with a number-like prefix (for example “1.” or “2.1”), the visual label is skipped so you do not see doubles like “1. 1. Title”.",
		});

		containerEl.createEl("h3", { text: "Put numbers into Markdown (bake)" });
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "Baking writes the numbers into the file text (useful for PDF, Publish, search, and the outline). It is manual and only affects the note you currently have open — it does not auto-insert while you type, and it does not process the whole vault.",
		});
		const bakeSteps = containerEl.createEl("ol", {
			cls: "setting-item-description ordinal-headings-help-list",
		});
		bakeSteps.createEl("li", {
			text: "Open the note you want to number (use Edit mode on mobile).",
		});
		bakeSteps.createEl("li", {
			text: "Choose your style above in the List library (bake uses the active preset).",
		});
		bakeSteps.createEl("li", {
			text: "Open the Command palette (Ctrl+P / Cmd+P on desktop; Commands on mobile).",
		});
		bakeSteps.createEl("li", {
			text: "Run: “Ordinal Headings: Bake numbers into current note”.",
		});
		bakeSteps.createEl("li", {
			text: "Headings in that note are rewritten, e.g. “# Intro” → “# 1 Intro” (exact format depends on your preset).",
		});
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "After you edit headings later, baked numbers can go stale. Run Bake again to renumber. Bake strips an old recognizable prefix first, so you should get “# 2.2 Title”, not “# 2.2 2.1 Title”.",
		});
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "To remove numbers from the file: Command palette → “Ordinal Headings: Strip baked numbers from current note”.",
		});

		containerEl.createEl("h3", { text: "Per-note control" });
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "Frontmatter (optional):",
		});
		containerEl.createEl("pre", {
			cls: "ordinal-headings-code-sample",
			text: "ordinal-headings: off\nordinal-headings-style: zh-chapter",
		});
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "ordinal-headings: off (or on) enables/disables this note. ordinal-headings-style picks a preset for this note (decimal, zh-chapter, custom, …).",
		});
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "Commands (Command palette): Bake numbers into current note · Strip baked numbers from current note · Toggle numbering for current note · Refresh heading numbers.",
		});
	}
}
