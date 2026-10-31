import {
	bakeNumbersIntoText,
	stripNumbersFromText,
} from "../src/bake";
import {
	computeNumberedHeadings,
	formatLabel,
	parseHeadings,
	stripBakedPrefix,
	toAlpha,
	toRoman,
	toZh,
} from "../src/numbering";
import { formatsForPreset, presetById } from "../src/presets";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";
describe("numeral helpers", () => {
	it("converts roman and alpha", () => {
		expect(toRoman(1, true)).toBe("I");
		expect(toRoman(14, false)).toBe("xiv");
		expect(toAlpha(1, true)).toBe("A");
		expect(toAlpha(27, false)).toBe("aa");
	});

	it("converts simple Chinese numerals", () => {
		expect(toZh(1)).toBe("一");
		expect(toZh(10)).toBe("十");
		expect(toZh(21)).toBe("二十一");
	});

	it("strips baked prefixes", () => {
		expect(stripBakedPrefix("1.2 Title")).toBe("Title");
		expect(stripBakedPrefix("Chapter 3 Hello")).toBe("Hello");
		expect(stripBakedPrefix("Plain")).toBe("Plain");
	});
});

describe("parse and number headings", () => {
	const doc = `# One
## Two
### Three
# Four
`;

	it("parses heading lines", () => {
		const hits = parseHeadings(doc);
		expect(hits.map((h) => [h.level, h.title])).toEqual([
			[1, "One"],
			[2, "Two"],
			[3, "Three"],
			[1, "Four"],
		]);
	});

	it("computes decimal outline labels", () => {
		const formats = formatsForPreset("decimal", DEFAULT_SETTINGS.customFormats);
		const numbered = computeNumberedHeadings(doc, formats, 1, " ");
		expect(numbered.map((h) => h.label.trim())).toEqual(["1", "1.1", "1.1.1", "2"]);
	});

	it("starts the highest numbered level at a chosen number", () => {
		const formats = formatsForPreset("decimal", DEFAULT_SETTINGS.customFormats);
		const numbered = computeNumberedHeadings(doc, formats, 1, " ", 5);
		expect(numbered.map((h) => h.label.trim())).toEqual(["5", "5.1", "5.1.1", "6"]);
	});

	it("keeps a seen zero in dotted labels", () => {
		const formats = formatsForPreset("decimal", DEFAULT_SETTINGS.customFormats);
		const numbered = computeNumberedHeadings(
			`# A
## B
# C
### D
`,
			formats,
			1,
			" ",
			0,
		);
		expect(numbered.map((h) => h.label.trim())).toEqual(["0", "0.1", "1", "1.1"]);

		const skipped = computeNumberedHeadings(
			`# A
### C
`,
			formats,
			1,
			" ",
			0,
		);
		expect(skipped.map((h) => h.label.trim())).toEqual(["0", "0.1"]);
	});

	it("anchors on the first H2 when the note has no H1", () => {
		const formats = formatsForPreset("decimal", DEFAULT_SETTINGS.customFormats);
		const numbered = computeNumberedHeadings(
			`## A
### B
## C
`,
			formats,
			1,
			" ",
			5,
		);
		expect(numbered.map((h) => h.label.trim())).toEqual(["5", "5.1", "6"]);
	});

	it("ignores headings above the start level and anchors on H2", () => {
		const formats = formatsForPreset("decimal", DEFAULT_SETTINGS.customFormats);
		const numbered = computeNumberedHeadings(
			`# Ignored
## First
### Child
## Second
`,
			formats,
			2,
			" ",
			4,
		);
		expect(numbered.map((h) => h.label.trim())).toEqual(["4", "4.1", "5"]);
	});

	it("formats classic outline tokens", () => {
		expect(formatLabel("{Roman}.", 1, [1, 0, 0, 0, 0, 0])).toBe("I.");
		expect(formatLabel("{Alpha}.", 2, [1, 1, 0, 0, 0, 0])).toBe("A.");
		expect(formatLabel("{n}.", 3, [1, 1, 1, 0, 0, 0])).toBe("1.");
	});

	it("ignores hash lines inside fenced code blocks", () => {
		const fenced = `# Real
\`\`\`python
# comment
## also not a heading
\`\`\`
## Also real
`;
		const hits = parseHeadings(fenced);
		expect(hits.map((h) => [h.level, h.title])).toEqual([
			[1, "Real"],
			[2, "Also real"],
		]);

		const formats = formatsForPreset("decimal", DEFAULT_SETTINGS.customFormats);
		const numbered = computeNumberedHeadings(fenced, formats, 1, " ");
		expect(numbered.map((h) => h.label.trim())).toEqual(["1", "1.1"]);
	});

	it("keeps a longer fence closed through a shorter sample", () => {
		const fenced = `# Real
\`\`\`\`
\`\`\`
# still code
\`\`\`
\`\`\`\`
# After
`;
		const hits = parseHeadings(fenced);
		expect(hits.map((h) => h.title)).toEqual(["Real", "After"]);
	});

	it("ignores hash lines inside tilde fences", () => {
		const fenced = `# Real
~~~
# comment
~~~
# After
`;
		expect(parseHeadings(fenced).map((h) => h.title)).toEqual(["Real", "After"]);
	});
});

describe("presets and settings", () => {
	it("resolves presets by id", () => {
		expect(presetById("decimal")?.name).toMatch(/Decimal/i);
		expect(formatsForPreset("none", DEFAULT_SETTINGS.customFormats).every((f) => !f)).toBe(
			true,
		);
	});

	it("normalizes settings with defaults", () => {
		expect(normalizeSettings(undefined)).toMatchObject({
			enabled: true,
			startLevel: 1,
			startNumber: 1,
			presetId: "decimal",
		});
		expect(normalizeSettings({ startLevel: 9, enabled: false }).startLevel).toBe(1);
		expect(normalizeSettings({ startLevel: 9, enabled: false }).enabled).toBe(false);
		expect(normalizeSettings({ startNumber: 0 }).startNumber).toBe(0);
		expect(normalizeSettings({ startNumber: -1 }).startNumber).toBe(1);
		expect(normalizeSettings({ startNumber: 1.5 }).startNumber).toBe(1);
	});
});

describe("bake / strip text", () => {
	it("bakes and strips decimal numbers", () => {
		const text = `# Alpha
## Beta
`;
		const baked = bakeNumbersIntoText(text, {
			...DEFAULT_SETTINGS,
			presetId: "decimal",
		});
		expect(baked.count).toBe(2);
		expect(baked.text).toContain("# 1 Alpha");
		expect(baked.text).toContain("## 1.1 Beta");

		const stripped = stripNumbersFromText(baked.text);
		expect(stripped.count).toBe(2);
		expect(stripped.text).toContain("# Alpha");
		expect(stripped.text).toContain("## Beta");
	});

	it("bakes from the configured starting number", () => {
		const text = `# Alpha
## Beta
# Gamma
`;
		const baked = bakeNumbersIntoText(text, {
			...DEFAULT_SETTINGS,
			presetId: "decimal",
			startNumber: 5,
		});
		expect(baked.count).toBe(3);
		expect(baked.text).toContain("# 5 Alpha");
		expect(baked.text).toContain("## 5.1 Beta");
		expect(baked.text).toContain("# 6 Gamma");
	});

	it("does not bake or strip hash lines inside fenced code", () => {
		const text = `# Alpha
\`\`\`
# 1 comment
\`\`\`
## Beta
`;
		const baked = bakeNumbersIntoText(text, {
			...DEFAULT_SETTINGS,
			presetId: "decimal",
		});
		expect(baked.count).toBe(2);
		expect(baked.text).toContain("# 1 Alpha");
		expect(baked.text).toContain("## 1.1 Beta");
		expect(baked.text).toContain("# 1 comment");

		const stripped = stripNumbersFromText(baked.text);
		expect(stripped.count).toBe(2);
		expect(stripped.text).toContain("# Alpha");
		expect(stripped.text).toContain("## Beta");
		expect(stripped.text).toContain("# 1 comment");
	});
});
