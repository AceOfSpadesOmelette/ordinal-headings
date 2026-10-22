import { parseSettingsJson, settingsToJson } from "../src/settings-io";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("ordinal-headings settings import", () => {
	it("round-trips preset and fills defaults", () => {
		const settings = { ...DEFAULT_SETTINGS, presetId: "zh-chapter", enabled: false };
		const parsed = parseSettingsJson(settingsToJson(settings), normalizeSettings);
		expect(parsed.presetId).toBe("zh-chapter");
		expect(parsed.enabled).toBe(false);
		expect(parsed.customFormats).toHaveLength(6);
	});

	it("rejects non-objects", () => {
		expect(() => parseSettingsJson("[]", normalizeSettings)).toThrow(/JSON object/);
	});
});
