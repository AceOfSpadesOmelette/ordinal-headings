import type { LevelFormats, OrdinalPreset } from "./types";

export const EMPTY_FORMATS: LevelFormats = ["", "", "", "", "", ""];

export const PRESETS: OrdinalPreset[] = [
	{
		id: "none",
		name: "None",
		preview: ["None"],
		formats: EMPTY_FORMATS,
	},
	{
		id: "decimal",
		name: "Decimal outline",
		preview: ["1 Heading", "1.1 Heading", "1.1.1 Heading"],
		formats: [
			"{dotted}",
			"{dotted}",
			"{dotted}",
			"{dotted}",
			"{dotted}",
			"{dotted}",
		],
	},
	{
		id: "paren",
		name: "Parenthetical",
		preview: ["1) Heading", "a) Heading", "i) Heading"],
		formats: ["{n})", "{alpha})", "{roman})", "{n})", "{alpha})", "{roman})"],
	},
	{
		id: "classic",
		name: "Classic outline",
		preview: ["I. Heading", "A. Heading", "1. Heading"],
		formats: [
			"{Roman}.",
			"{Alpha}.",
			"{n}.",
			"{alpha}.",
			"{roman}.",
			"{n}.",
		],
	},
	{
		id: "chapter",
		name: "Chapter",
		preview: ["Chapter 1", "1.1 Heading", "1.1.1 Heading"],
		formats: [
			"Chapter {n}",
			"{dotted}",
			"{dotted}",
			"{dotted}",
			"{dotted}",
			"{dotted}",
		],
	},
	{
		id: "legal",
		name: "Article / Section",
		preview: ["Article I.", "Section 1.01", "(a) Heading"],
		formats: [
			"Article {Roman}.",
			"Section {1}.{n-pad2}",
			"({alpha})",
			"({roman})",
			"({n})",
			"({alpha})",
		],
	},
	{
		id: "zh-chapter",
		name: "Chinese chapter",
		preview: ["第1章", "第1节", "1.1.1"],
		formats: [
			"第{n}章",
			"第{n}节",
			"{dotted}",
			"{dotted}",
			"{dotted}",
			"{dotted}",
		],
	},
	{
		id: "decimal-dot",
		name: "Numbered with periods",
		preview: ["1. Heading", "1.1. Heading", "1.1.1. Heading"],
		formats: [
			"{dotted}.",
			"{dotted}.",
			"{dotted}.",
			"{dotted}.",
			"{dotted}.",
			"{dotted}.",
		],
	},
];

export function presetById(id: string): OrdinalPreset | undefined {
	return PRESETS.find((p) => p.id === id);
}

export function formatsForPreset(
	presetId: string,
	custom: LevelFormats,
): LevelFormats {
	if (presetId === "custom") return custom;
	const preset = presetById(presetId);
	if (!preset || preset.id === "none") return EMPTY_FORMATS;
	return preset.formats;
}
