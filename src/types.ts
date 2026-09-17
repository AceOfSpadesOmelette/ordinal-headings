/** Heading level 1–6. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Format string for one heading level (tokens like {n}, {dotted}, 第{n}章). */
export type LevelFormats = [
	string,
	string,
	string,
	string,
	string,
	string,
];

export interface OrdinalPreset {
	id: string;
	name: string;
	/** Short preview lines for the settings gallery. */
	preview: string[];
	formats: LevelFormats;
}

export interface OrdinalSettings {
	enabled: boolean;
	/** First heading level that receives a number (1–6). */
	startLevel: HeadingLevel;
	presetId: string;
	/** When presetId is "custom", these formats are used. */
	customFormats: LevelFormats;
	/** Trailing separator after the label (usually a space). */
	trailing: string;
}

export interface HeadingHit {
	/** 0-based line number in the document. */
	line: number;
	level: HeadingLevel;
	/** Document position of the first `#`. */
	hashFrom: number;
	/** Document position where heading title text begins. */
	textFrom: number;
	/** Raw title without leading hashes / existing ordinal prefix. */
	title: string;
	/** Full line text. */
	lineText: string;
}

export interface NumberedHeading extends HeadingHit {
	label: string;
	/** Counters [c1..c6] after this heading was counted. */
	counters: number[];
}

export const FRONTMATTER_KEY = "ordinal-headings";
