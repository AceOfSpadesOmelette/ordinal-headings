import type { Editor } from "obsidian";
import {
	computeNumberedHeadings,
	stripBakedPrefix,
} from "./numbering";
import { formatsForPreset } from "./presets";
import type { OrdinalSettings } from "./types";

export interface TextRewriteResult {
	text: string;
	count: number;
}

/**
 * Write ordinal prefixes into heading lines of a note's Markdown text.
 */
export function bakeNumbersIntoText(
	text: string,
	settings: OrdinalSettings,
): TextRewriteResult {
	const formats = formatsForPreset(settings.presetId, settings.customFormats);
	if (settings.presetId === "none" || formats.every((f) => !f.trim())) {
		return { text, count: 0 };
	}

	const numbered = computeNumberedHeadings(
		text,
		formats,
		settings.startLevel,
		settings.trailing,
	);
	if (numbered.length === 0) return { text, count: 0 };

	const lines = text.split("\n");
	let count = 0;
	for (const h of numbered) {
		if (!h.label) continue;
		const line = lines[h.line] ?? "";
		const next = bakeHeadingLine(line, h.label);
		if (next === null) continue;
		lines[h.line] = next;
		count += 1;
	}
	return { text: lines.join("\n"), count };
}

/**
 * Remove recognizable baked ordinal prefixes from heading lines.
 */
export function stripNumbersFromText(text: string): TextRewriteResult {
	const lines = text.split("\n");
	let count = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const next = stripHeadingLine(line);
		if (next === null) continue;
		lines[i] = next;
		count += 1;
	}
	return { text: lines.join("\n"), count };
}

/**
 * Write ordinal prefixes into the current note's heading lines (editor undo).
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
	let count = 0;
	for (const h of ordered) {
		if (!h.label) continue;
		const line = editor.getLine(h.line);
		const next = bakeHeadingLine(line, h.label);
		if (next === null) continue;
		editor.setLine(h.line, next);
		count += 1;
	}
	return count;
}

/**
 * Remove recognizable baked ordinal prefixes from heading lines (editor undo).
 */
export function stripNumbersFromEditor(editor: Editor): number {
	const text = editor.getValue();
	const lines = text.split("\n");
	let count = 0;

	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i] ?? "";
		const next = stripHeadingLine(line);
		if (next === null) continue;
		editor.setLine(i, next);
		count += 1;
	}
	return count;
}

function bakeHeadingLine(line: string, label: string): string | null {
	const m = /^(#{1,6})([ \t]+)(.*)$/.exec(line);
	if (!m) return null;
	const hashes = m[1]!;
	const spaces = m[2]!;
	const rawTitle = m[3] ?? "";
	const clean = stripBakedPrefix(rawTitle);
	return `${hashes}${spaces}${label}${clean}`;
}

function stripHeadingLine(line: string): string | null {
	const m = /^(#{1,6})([ \t]+)(.*)$/.exec(line);
	if (!m) return null;
	const hashes = m[1]!;
	const spaces = m[2]!;
	const rawTitle = m[3] ?? "";
	const clean = stripBakedPrefix(rawTitle);
	if (clean === rawTitle) return null;
	return `${hashes}${spaces}${clean}`;
}
