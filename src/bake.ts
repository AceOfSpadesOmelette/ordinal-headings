import type { Editor } from "obsidian";
import {
	computeNumberedHeadings,
	stripBakedPrefix,
} from "./numbering";
import { formatsForPreset } from "./presets";
import type { OrdinalSettings } from "./types";

/**
 * Write ordinal prefixes into the current note's heading lines.
 */
export function bakeNumbersIntoEditor(
	editor: Editor,
	settings: OrdinalSettings,
): number {
	const formats = formatsForPreset(settings.presetId, settings.customFormats);
	if (settings.presetId === "none" || formats.every((f) => !f.trim())) {
		return 0;
	}

	const text = editor.getValue();
	const numbered = computeNumberedHeadings(
		text,
		formats,
		settings.startLevel,
		settings.trailing,
	);
	if (numbered.length === 0) return 0;

	// Apply from bottom to top so offsets stay valid
	const ordered = [...numbered].sort((a, b) => b.line - a.line);
	for (const h of ordered) {
		if (!h.label) continue;
		const line = editor.getLine(h.line);
		const m = /^(#{1,6})([ \t]+)(.*)$/.exec(line);
		if (!m) continue;
		const hashes = m[1]!;
		const spaces = m[2]!;
		const rawTitle = m[3] ?? "";
		const clean = stripBakedPrefix(rawTitle);
		const next = `${hashes}${spaces}${h.label}${clean}`;
		editor.setLine(h.line, next);
	}
	return ordered.length;
}

/**
 * Remove recognizable baked ordinal prefixes from heading lines.
 */
export function stripNumbersFromEditor(editor: Editor): number {
	const text = editor.getValue();
	const lines = text.split("\n");
	let count = 0;

	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i] ?? "";
		const m = /^(#{1,6})([ \t]+)(.*)$/.exec(line);
		if (!m) continue;
		const hashes = m[1]!;
		const spaces = m[2]!;
		const rawTitle = m[3] ?? "";
		const clean = stripBakedPrefix(rawTitle);
		if (clean === rawTitle) continue;
		editor.setLine(i, `${hashes}${spaces}${clean}`);
		count += 1;
	}
	return count;
}
