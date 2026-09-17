import { MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import type { Extension } from "@codemirror/state";
import {
	bakeNumbersIntoEditor,
	stripNumbersFromEditor,
} from "./bake";
import { buildEditorOrdinalExtension } from "./editor-ordinal";
import { ReadingOrdinalManager } from "./reading-ordinal";
import {
	DEFAULT_SETTINGS,
	normalizeSettings,
	OrdinalSettingTab,
} from "./settings";
import { FRONTMATTER_KEY, type OrdinalSettings } from "./types";

export default class OrdinalHeadingsPlugin extends Plugin {
	settings: OrdinalSettings = { ...DEFAULT_SETTINGS };

	private editorExtensions: Extension[] = [];
	private readingManager = new ReadingOrdinalManager();

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerEditorExtension(this.editorExtensions);
		this.applySettings();

		this.registerMarkdownPostProcessor((el, ctx) => {
			const enabled = this.isNoteEnabled(ctx.sourcePath);
			this.readingManager.setNoteEnabled(enabled);
			this.readingManager.setNotePresetId(
				this.notePresetId(ctx.sourcePath),
			);
			this.readingManager.registerPostProcessor(el, ctx);
		});

		this.addSettingTab(new OrdinalSettingTab(this.app, this));
		this.registerCommands();

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.syncActiveNote();
			}),
		);
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.syncActiveNote();
			}),
		);
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				const active = this.app.workspace.getActiveFile();
				if (active && file.path === active.path) {
					this.syncActiveNote();
				}
			}),
		);

		this.app.workspace.onLayoutReady(() => {
			this.syncActiveNote();
			this.rerenderReadingPreviews();
		});
	}

	onunload(): void {
		this.editorExtensions.length = 0;
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	applySettings(): void {
		this.readingManager.setSettings(this.settings);
		this.syncActiveNote();
		this.rerenderReadingPreviews();
	}

	private registerCommands(): void {
		this.addCommand({
			id: "toggle-current-note",
			name: "Toggle numbering for current note",
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return;
				await this.toggleNoteFrontmatter(file);
			},
		});

		this.addCommand({
			id: "bake-current-note",
			name: "Bake numbers into current note",
			editorCallback: (editor) => {
				const n = bakeNumbersIntoEditor(editor, {
					...this.settings,
					presetId: this.effectivePresetId(),
				});
				new Notice(
					n > 0
						? `Baked numbers into ${n} heading(s).`
						: "No headings to number.",
				);
			},
		});

		this.addCommand({
			id: "strip-baked-current-note",
			name: "Strip baked numbers from current note",
			editorCallback: (editor) => {
				const n = stripNumbersFromEditor(editor);
				new Notice(
					n > 0
						? `Removed numbers from ${n} heading(s).`
						: "Nothing to strip.",
				);
			},
		});

		this.addCommand({
			id: "refresh-numbering",
			name: "Refresh heading numbers",
			callback: () => {
				this.applySettings();
				new Notice("Heading numbers refreshed.");
			},
		});
	}

	private effectivePresetId(): string {
		const file = this.app.workspace.getActiveFile();
		if (!file) return this.settings.presetId;
		return this.notePresetId(file.path);
	}

	private syncActiveNote(): void {
		const file = this.app.workspace.getActiveFile();
		const noteEnabled = file ? this.isNoteEnabled(file.path) : true;
		const presetId = file
			? this.notePresetId(file.path)
			: this.settings.presetId;
		this.readingManager.setNoteEnabled(noteEnabled);
		this.readingManager.setNotePresetId(presetId);
		this.applyEditorExtensions(noteEnabled, presetId);
	}

	private applyEditorExtensions(
		noteEnabled: boolean,
		presetId: string,
	): void {
		const enabled =
			this.settings.enabled && noteEnabled && presetId !== "none";
		this.editorExtensions.length = 0;
		this.editorExtensions.push(
			...buildEditorOrdinalExtension({
				enabled,
				startLevel: this.settings.startLevel,
				presetId,
				customFormats: this.settings.customFormats,
				trailing: this.settings.trailing,
			}),
		);
		this.app.workspace.updateOptions();
	}

	isNoteEnabled(sourcePath: string): boolean {
		if (!sourcePath) return this.settings.enabled;
		const cache = this.app.metadataCache.getCache(sourcePath);
		const fm = cache?.frontmatter;
		if (!fm) return true;

		const raw = fm[FRONTMATTER_KEY];
		if (raw === false || raw === "off" || raw === "false") return false;
		if (raw === true || raw === "on" || raw === "true") return true;
		return true;
	}

	notePresetId(sourcePath: string): string {
		const cache = this.app.metadataCache.getCache(sourcePath);
		const style =
			cache?.frontmatter?.[`${FRONTMATTER_KEY}-style`] ??
			cache?.frontmatter?.["ordinal-headings-style"];
		if (typeof style === "string" && style.trim()) return style.trim();
		return this.settings.presetId;
	}

	private async toggleNoteFrontmatter(file: TFile): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const cur = fm[FRONTMATTER_KEY];
			const currentlyOff =
				cur === false || cur === "off" || cur === "false";
			if (currentlyOff) {
				delete fm[FRONTMATTER_KEY];
			} else {
				fm[FRONTMATTER_KEY] = "off";
			}
		});
		this.syncActiveNote();
		this.rerenderReadingPreviews();
		const on = this.isNoteEnabled(file.path);
		new Notice(
			on
				? "Ordinal Headings enabled for this note."
				: "Ordinal Headings disabled for this note.",
		);
	}

	private rerenderReadingPreviews(): void {
		this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
			this.refreshLeaf(leaf);
		});
	}

	private refreshLeaf(leaf: WorkspaceLeaf): void {
		const view = leaf.view;
		if (!(view instanceof MarkdownView)) return;
		const preview = view.previewMode as { rerender?: (full?: boolean) => void };
		preview.rerender?.(true);
	}
}
