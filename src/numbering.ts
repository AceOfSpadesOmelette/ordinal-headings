import type {
	HeadingHit,
	HeadingLevel,
	LevelFormats,
	NumberedHeading,
} from "./types";

const HEADING_RE = /^(#{1,6})([ \t]+)(.*)$/;

const ZH_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function toRoman(n: number, upper: boolean): string {
	if (n <= 0) return String(n);
	const map: [number, string][] = [
		[1000, "M"],
		[900, "CM"],
		[500, "D"],
		[400, "CD"],
		[100, "C"],
		[90, "XC"],
		[50, "L"],
		[40, "XL"],
		[10, "X"],
		[9, "IX"],
		[5, "V"],
		[4, "IV"],
		[1, "I"],
	];
	let rest = n;
	let out = "";
	for (const [val, sym] of map) {
		while (rest >= val) {
			out += sym;
			rest -= val;
		}
	}
	return upper ? out : out.toLowerCase();
}

export function toAlpha(n: number, upper: boolean): string {
	if (n <= 0) return String(n);
	let rest = n;
	let out = "";
	while (rest > 0) {
		rest -= 1;
		out = String.fromCharCode((upper ? 65 : 97) + (rest % 26)) + out;
		rest = Math.floor(rest / 26);
	}
	return out;
}

/** Simple Chinese numerals for 1–99; falls back to Arabic beyond. */
export function toZh(n: number): string {
	if (n <= 0) return String(n);
	if (n < 10) return ZH_DIGITS[n] ?? String(n);
	if (n === 10) return "十";
	if (n < 20) return `十${ZH_DIGITS[n - 10]}`;
	if (n < 100) {
		const tens = Math.floor(n / 10);
		const ones = n % 10;
		return `${ZH_DIGITS[tens]}十${ones ? ZH_DIGITS[ones] : ""}`;
	}
	return String(n);
}

/**
 * Strip a previously baked ordinal prefix from a heading title, if recognizable.
 */
export function stripBakedPrefix(title: string): string {
	const patterns = [
		/^(第\d+章)\s+/,
		/^(第\d+节)\s+/,
		/^(Chapter\s+\d+)\s+/i,
		/^(Article\s+[IVXLCDM]+(?:\.)?)\s+/i,
		/^(Section\s+\d+(?:\.\d+)?)\s+/i,
		/^(\d+(?:\.\d+)*\.?)\s+/,
		/^([IVXLCDM]+\.)\s+/i,
		/^([A-Za-z]\.)\s+/,
		/^(\d+\)|[a-z]\)|[ivxlcdm]+\))\s+/i,
		/^(\([a-z0-9ivxlcdm]+\))\s+/i,
	];
	let t = title;
	for (const re of patterns) {
		const next = t.replace(re, "");
		if (next !== t) return next.trimStart();
	}
	return t;
}

export function frontmatterLineCount(text: string): number {
	if (!text.startsWith("---")) return 0;
	const end = text.indexOf("\n---", 3);
	if (end < 0) return 0;
	const block = text.slice(0, end + 4);
	return block.split("\n").length;
}

export function parseHeadings(
	docText: string,
	startLevel: HeadingLevel = 1,
): HeadingHit[] {
	const lines = docText.split("\n");
	const skip = frontmatterLineCount(docText);
	const hits: HeadingHit[] = [];
	let offset = 0;

	for (let i = 0; i < lines.length; i++) {
		const lineText = lines[i] ?? "";
		const lineLen = lineText.length + (i < lines.length - 1 ? 1 : 0);

		if (i >= skip) {
			const m = HEADING_RE.exec(lineText);
			if (m) {
				const hashes = m[1]!;
				const spaces = m[2]!;
				const rawTitle = m[3] ?? "";
				const level = hashes.length as HeadingLevel;
				if (level >= startLevel && level <= 6) {
					hits.push({
						line: i,
						level,
						hashFrom: offset,
						textFrom: offset + hashes.length + spaces.length,
						title: stripBakedPrefix(rawTitle),
						lineText,
					});
				}
			}
		}
		offset += lineLen;
	}
	return hits;
}

function dottedPath(counters: number[], level: HeadingLevel): string {
	return counters
		.slice(0, level)
		.filter((c) => c > 0)
		.join(".");
}

export function formatLabel(
	template: string,
	level: HeadingLevel,
	counters: number[],
): string {
	if (!template.trim()) return "";

	const n = counters[level - 1] ?? 0;
	const dotted = dottedPath(counters, level);

	let out = template;
	out = out.replaceAll("{dotted}", dotted);
	out = out.replaceAll("{n-pad2}", String(n).padStart(2, "0"));
	out = out.replaceAll("{Roman}", toRoman(n, true));
	out = out.replaceAll("{roman}", toRoman(n, false));
	out = out.replaceAll("{Alpha}", toAlpha(n, true));
	out = out.replaceAll("{alpha}", toAlpha(n, false));
	out = out.replaceAll("{zh}", toZh(n));
	out = out.replaceAll("{n}", String(n));

	for (let i = 1; i <= 6; i++) {
		const c = counters[i - 1] ?? 0;
		out = out.replaceAll(`{${i}}`, String(c));
	}

	return out;
}

export function numberHeadings(
	hits: HeadingHit[],
	formats: LevelFormats,
	trailing = " ",
): NumberedHeading[] {
	const counters = [0, 0, 0, 0, 0, 0];
	const out: NumberedHeading[] = [];

	for (const hit of hits) {
		const idx = hit.level - 1;
		counters[idx] = (counters[idx] ?? 0) + 1;
		for (let i = hit.level; i < 6; i++) counters[i] = 0;

		const snap = [...counters];
		const template = formats[idx] ?? "";
		const core = formatLabel(template, hit.level, snap);
		const label = core ? `${core}${trailing}` : "";

		out.push({
			...hit,
			label,
			counters: snap,
		});
	}
	return out;
}

export function computeNumberedHeadings(
	docText: string,
	formats: LevelFormats,
	startLevel: HeadingLevel,
	trailing = " ",
): NumberedHeading[] {
	const hits = parseHeadings(docText, startLevel);
	return numberHeadings(hits, formats, trailing);
}
