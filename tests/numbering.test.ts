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

	it("formats classic outline tokens", () => {
		expect(formatLabel("{Roman}.", 1, [1, 0, 0, 0, 0, 0])).toBe("I.");
		expect(formatLabel("{Alpha}.", 2, [1, 1, 0, 0, 0, 0])).toBe("A.");
		expect(formatLabel("{n}.", 3, [1, 1, 1, 0, 0, 0])).toBe("1.");
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
			presetId: "decimal",
		});
		expect(normalizeSettings({ startLevel: 9, enabled: false }).startLevel).toBe(1);
		expect(normalizeSettings({ startLevel: 9, enabled: false }).enabled).toBe(false);
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
});
