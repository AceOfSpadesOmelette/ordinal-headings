/** Minimal Obsidian API stubs for unit tests. */

export class Plugin {
	app: unknown;
	manifest: unknown;
	async loadData(): Promise<unknown> {
		return {};
	}
	async saveData(_data: unknown): Promise<void> {}
	addCommand(_cmd: unknown): void {}
	addSettingTab(_tab: unknown): void {}
	registerEditorExtension(_ext: unknown): void {}
	registerMarkdownPostProcessor(_cb: unknown): void {}
	registerEvent(_ref: unknown): void {}
}

export class PluginSettingTab {
	app: unknown;
	plugin: unknown;
	containerEl: HTMLElement;
	constructor(app: unknown, plugin: unknown) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}
	display(): void {}
	hide(): void {}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {}
	setName(_name: string): this {
		return this;
	}
	setDesc(_desc: string): this {
		return this;
	}
	addText(_cb: unknown): this {
		return this;
	}
	addToggle(_cb: unknown): this {
		return this;
	}
	addDropdown(_cb: unknown): this {
		return this;
	}
	addButton(_cb: unknown): this {
		return this;
	}
}

export class Notice {
	constructor(_message: string | DocumentFragment, _timeout?: number) {}
}

export class MarkdownRenderChild {
	containerEl: HTMLElement;
	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}
	onload(): void {}
	onunload(): void {}
}

export type Editor = {
	getValue: () => string;
	setValue: (v: string) => void;
	getLine: (n: number) => string;
	setLine: (n: number, text: string) => void;
	lineCount: () => number;
};
