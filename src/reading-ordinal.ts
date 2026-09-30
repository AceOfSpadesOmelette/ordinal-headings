import type { MarkdownPostProcessorContext } from "obsidian";
import { computeNumberedHeadings, stripBakedPrefix } from "./numbering";
import { formatsForPreset } from "./presets";
import type { LevelFormats, OrdinalSettings } from "./types";

const ATTR = "data-ordinal-headings";

/**
 * Synthetic / UI titles that look like headings but must not consume a number.
 * - `__title__`: Better Export PDF "Add file name as title"
 * - `inline-title`: Obsidian note title in the reading view chrome
 */
function isContentHeading(el: HTMLElement): boolean {
	if (el.classList.contains("__title__")) return false;
	if (el.classList.contains("inline-title")) return false;
	return true;
}

/**
 * Apply visual labels to h1–h6 in reading / live-preview rendered HTML.
 */
export class ReadingOrdinalManager {
	private settings: OrdinalSettings = {
		enabled: true,
		startLevel: 1,
		presetId: "decimal",
		customFormats: ["", "", "", "", "", ""],
		trailing: " ",
	};
	private noteEnabled = true;
	private notePresetId: string | null = null;

	setSettings(settings: OrdinalSettings): void {
		this.settings = settings;
	}

	setNoteEnabled(enabled: boolean): void {
		this.noteEnabled = enabled;
	}

	setNotePresetId(id: string | null): void {
		this.notePresetId = id;
	}

	registerPostProcessor(
		el: HTMLElement,
		_ctx: MarkdownPostProcessorContext,
	): void {
		if (!this.settings.enabled || !this.noteEnabled) {
			this.clear(el);
			return;
		}

		const presetId = this.notePresetId ?? this.settings.presetId;
		if (presetId === "none") {
			this.clear(el);
			return;
		}

		const formats = formatsForPreset(presetId, this.settings.customFormats);
		if (formats.every((f) => !f.trim())) {
			this.clear(el);
			return;
		}

		const headings = Array.from(
			el.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
		).filter(isContentHeading);
		if (headings.length === 0) return;

		const numbered = this.numberFromDomOrder(headings, formats);

		for (let i = 0; i < headings.length; i++) {
			const h = headings[i]!;
			const label = numbered[i]?.label ?? "";
			const existing = (h.textContent ?? "").trimStart();
			// Skip visual label if numbers were baked into the note
			if (label && existing.startsWith(label.trim())) {
				this.applyLabel(h, "");
				continue;
			}
			const stripped = stripBakedPrefix(existing);
			if (stripped !== existing) {
				this.applyLabel(h, "");
				continue;
			}
			this.applyLabel(h, label);
		}
	}

	private numberFromDomOrder(els: HTMLElement[], formats: LevelFormats) {
		const fake = els
			.map((el) => {
				const level = Number(el.tagName.slice(1)) || 1;
				const text = stripBakedPrefix((el.textContent ?? "").trim());
				return `${"#".repeat(level)} ${text}`;
			})
			.join("\n");
		return computeNumberedHeadings(
			fake,
			formats,
			this.settings.startLevel,
			this.settings.trailing,
		);
	}

	private applyLabel(el: HTMLElement, label: string): void {
		let badge = el.querySelector<HTMLElement>(`:scope > .ordinal-headings-label`);
		if (!label) {
			badge?.remove();
			el.removeAttribute(ATTR);
			return;
		}
		if (!badge) {
			badge = document.createElement("span");
			badge.className = "ordinal-headings-label";
			el.insertBefore(badge, el.firstChild);
		}
		badge.textContent = label;
		el.setAttribute(ATTR, "1");
	}

	private clear(root: HTMLElement): void {
		root.querySelectorAll(`.ordinal-headings-label`).forEach((n) => n.remove());
		root.querySelectorAll(`[${ATTR}]`).forEach((n) =>
			n.removeAttribute(ATTR),
		);
	}
}
