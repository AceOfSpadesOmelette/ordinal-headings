import { Extension, Facet, RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { computeNumberedHeadings, stripBakedPrefix } from "./numbering";
import { formatsForPreset } from "./presets";
import type { HeadingLevel, LevelFormats } from "./types";

export interface EditorOrdinalOptions {
	enabled: boolean;
	startLevel: HeadingLevel;
	presetId: string;
	customFormats: LevelFormats;
	trailing: string;
}

const editorOrdinalOptions = Facet.define<
	EditorOrdinalOptions,
	EditorOrdinalOptions
>({
	combine(values) {
		return values.length > 0
			? values[values.length - 1]!
			: {
					enabled: false,
					startLevel: 1,
					presetId: "decimal",
					customFormats: ["", "", "", "", "", ""],
					trailing: " ",
				};
	},
});

class OrdinalWidget extends WidgetType {
	constructor(readonly label: string) {
		super();
	}

	eq(other: OrdinalWidget): boolean {
		return other.label === this.label;
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "ordinal-headings-label";
		span.textContent = this.label;
		span.setAttribute("aria-hidden", "true");
		return span;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

function isNestedCodeMirror(view: EditorView): boolean {
	return Boolean(view.dom.parentElement?.closest(".cm-editor"));
}

function lineAlreadyBaked(lineText: string): boolean {
	const m = /^(#{1,6})([ \t]+)(.*)$/.exec(lineText);
	if (!m) return false;
	const raw = m[3] ?? "";
	return stripBakedPrefix(raw) !== raw;
}

function buildDecorations(
	view: EditorView,
	opts: EditorOrdinalOptions,
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	if (!opts.enabled || isNestedCodeMirror(view)) {
		return builder.finish();
	}

	const formats = formatsForPreset(opts.presetId, opts.customFormats);
	if (formats.every((f) => !f.trim())) {
		return builder.finish();
	}

	const numbered = computeNumberedHeadings(
		view.state.doc.toString(),
		formats,
		opts.startLevel,
		opts.trailing,
	);

	for (const h of numbered) {
		if (!h.label) continue;
		if (lineAlreadyBaked(h.lineText)) continue;
		builder.add(
			h.textFrom,
			h.textFrom,
			Decoration.widget({
				widget: new OrdinalWidget(h.label),
				side: -1,
			}),
		);
	}
	return builder.finish();
}

function createOrdinalPlugin(): Extension {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = buildDecorations(
					view,
					view.state.facet(editorOrdinalOptions),
				);
			}

			update(update: ViewUpdate): void {
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.startState.facet(editorOrdinalOptions) !==
						update.state.facet(editorOrdinalOptions)
				) {
					this.decorations = buildDecorations(
						update.view,
						update.state.facet(editorOrdinalOptions),
					);
				}
			}
		},
		{ decorations: (v) => v.decorations },
	);
}

export function buildEditorOrdinalExtension(
	opts: EditorOrdinalOptions,
): Extension[] {
	return [editorOrdinalOptions.of(opts), createOrdinalPlugin()];
}
