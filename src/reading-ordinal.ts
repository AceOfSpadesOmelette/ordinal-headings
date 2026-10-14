import type { App, MarkdownPostProcessorContext } from "obsidian";
import {
	computeNumberedHeadings,
	numberHeadings,
	stripBakedPrefix,
} from "./numbering";
import { formatsForPreset } from "./presets";
import type {
	HeadingHit,
	HeadingLevel,
	LevelFormats,
	NumberedHeading,
	OrdinalSettings,
} from "./types";

const ATTR = "data-ordinal-headings";

const PREVIEW_ROOT_SEL =
	".markdown-preview-view, .markdown-reading-view, .markdown-rendered";

/**
 * Synthetic / UI titles that look like headings but must not consume a number.
 * - `__title__`: Better Export PDF / Pagina "Add file name as title"
 * - `inline-title`: Obsidian note title in the reading view chrome
 * - `conspectus-toc-title`: Conspectus TOC heading (not a document section)
 */
function isContentHeading(el: HTMLElement): boolean {
	if (el.classList.contains("__title__")) return false;
	if (el.classList.contains("inline-title")) return false;
	if (el.classList.contains("conspectus-toc-title")) return false;
	return true;
}

function queryContentHeadings(
	root: HTMLElement,
	startLevel: HeadingLevel = 1,
): HTMLElement[] {
	return Array.from(
		root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
	).filter((el) => {
		if (!isContentHeading(el)) return false;
		const level = Number(el.tagName.slice(1)) || 1;
		return level >= startLevel && level <= 6;
	});
}

/**
 * Resolve the document preview root for document-wide numbering.
 * Never falls back to the post-processor section element — that would restart
 * counters at 1 for each section (broken with mixed baked/unbaked headings).
 */
function resolvePreviewRoot(el: HTMLElement): HTMLElement | null {
	if (el.matches(PREVIEW_ROOT_SEL)) return el;
	return el.closest<HTMLElement>(PREVIEW_ROOT_SEL);
}

/**
 * Apply visual labels to h1–h6 in reading / live-preview rendered HTML.
 */
export class ReadingOrdinalManager {
	private app: App | null = null;
	private settings: OrdinalSettings = {
		enabled: true,
		startLevel: 1,
		presetId: "decimal",
		customFormats: ["", "", "", "", "", ""],
		trailing: " ",
	};
	private noteEnabled = true;
	private notePresetId: string | null = null;

	setApp(app: App): void {
		this.app = app;
	}

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
		ctx: MarkdownPostProcessorContext,
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

		const sectionHeadings = queryContentHeadings(
			el,
			this.settings.startLevel,
		);
		if (sectionHeadings.length === 0) return;

		const numbered = this.numberFromCache(ctx.sourcePath, formats);
		if (numbered === null) {
			// Cache unavailable: fall back to renumbering the whole preview root
			// from DOM order so we never restart counters per section.
			this.applyFromPreviewRoot(el, formats);
			return;
		}
		if (numbered.length === 0) return;

		const pairs = this.pairSectionHeadings(
			el,
			ctx,
			sectionHeadings,
			numbered,
		);
		for (const { el: h, label } of pairs) {
			this.applyLabelWithBakeCheck(h, label);
		}
	}

	/**
	 * Document-wide numbering from metadataCache.headings.
	 */
	private numberFromCache(
		sourcePath: string,
		formats: LevelFormats,
	): NumberedHeading[] | null {
		if (!this.app || !sourcePath) return null;
		const cache = this.app.metadataCache.getCache(sourcePath);
		const cached = cache?.headings;
		if (!cached || cached.length === 0) return null;

		const startLevel = this.settings.startLevel;
		const hits: HeadingHit[] = [];
		for (const h of cached) {
			const level = h.level as HeadingLevel;
			if (level < startLevel || level > 6) continue;
			hits.push({
				line: h.position.start.line,
				level,
				hashFrom: 0,
				textFrom: 0,
				title: stripBakedPrefix(h.heading),
				lineText: "",
			});
		}
		if (hits.length === 0) return [];
		return numberHeadings(hits, formats, this.settings.trailing);
	}

	/**
	 * Map DOM headings in this post-processor section to global labels.
	 */
	private pairSectionHeadings(
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		sectionHeadings: HTMLElement[],
		numbered: NumberedHeading[],
	): { el: HTMLElement; label: string }[] {
		const section = ctx.getSectionInfo(el);
		if (section) {
			const inRange = numbered.filter(
				(n) =>
					n.line >= section.lineStart && n.line <= section.lineEnd,
			);
			if (inRange.length > 0) {
				const count = Math.min(sectionHeadings.length, inRange.length);
				const out: { el: HTMLElement; label: string }[] = [];
				for (let i = 0; i < count; i++) {
					out.push({
						el: sectionHeadings[i]!,
						label: inRange[i]!.label,
					});
				}
				return out;
			}
		}

		// Section info missing or no line overlap: assign by DOM order in preview root.
		return this.pairFromPreviewRoot(el, sectionHeadings, numbered);
	}

	private pairFromPreviewRoot(
		el: HTMLElement,
		sectionHeadings: HTMLElement[],
		numbered: NumberedHeading[],
	): { el: HTMLElement; label: string }[] {
		const root = resolvePreviewRoot(el);
		if (!root) return [];

		const all = queryContentHeadings(root, this.settings.startLevel);
		const out: { el: HTMLElement; label: string }[] = [];
		for (const h of sectionHeadings) {
			const idx = all.indexOf(h);
			out.push({
				el: h,
				label: idx >= 0 ? (numbered[idx]?.label ?? "") : "",
			});
		}
		return out;
	}

	/**
	 * When metadata cache is empty, number all headings in the preview root
	 * from their DOM order (still document-scoped, not per-section).
	 * Skips if the preview root cannot be found — never numbers a lone section.
	 */
	private applyFromPreviewRoot(
		el: HTMLElement,
		formats: LevelFormats,
	): void {
		const root = resolvePreviewRoot(el);
		if (!root) return;

		const all = queryContentHeadings(root, this.settings.startLevel);
		if (all.length === 0) return;

		const fake = all
			.map((h) => {
				const level = Number(h.tagName.slice(1)) || 1;
				const text = this.headingTextWithoutBadge(h);
				return `${"#".repeat(level)} ${stripBakedPrefix(text)}`;
			})
			.join("\n");

		const numbered = computeNumberedHeadings(
			fake,
			formats,
			this.settings.startLevel,
			this.settings.trailing,
		);

		// Only update headings in the current section element; other sections
		// will refresh on their own post-processor passes.
		const sectionHeadings = queryContentHeadings(
			el,
			this.settings.startLevel,
		);
		for (const h of sectionHeadings) {
			const idx = all.indexOf(h);
			this.applyLabelWithBakeCheck(h, numbered[idx]?.label ?? "");
		}
	}

	private headingTextWithoutBadge(el: HTMLElement): string {
		const existing = (el.textContent ?? "").trimStart();
		const badge = el.querySelector(":scope > .ordinal-headings-label");
		const t = badge?.textContent;
		if (!t) return existing;
		return existing.startsWith(t)
			? existing.slice(t.length).trimStart()
			: existing;
	}

	private applyLabelWithBakeCheck(el: HTMLElement, label: string): void {
		const withoutBadge = this.headingTextWithoutBadge(el);
		// Skip visual label if numbers were baked into the note
		if (label && withoutBadge.startsWith(label.trim())) {
			this.applyLabel(el, "");
			return;
		}
		const stripped = stripBakedPrefix(withoutBadge);
		if (stripped !== withoutBadge) {
			this.applyLabel(el, "");
			return;
		}
		this.applyLabel(el, label);
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
