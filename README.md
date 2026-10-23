# Ordinal Headings

Word-style numbers for Heading 1–6. By default the numbers are visual only, so the Markdown stays clean, and they update as you edit. Live Preview and Reading view are both supported, on desktop and on Android.

## How numbering works

Numbers appear next to headings while you edit or read. They are not written into the file until you bake them. They update when you add, remove, or reorder headings.

If a heading already starts with a number-like prefix, such as `1.` or `2.1`, the visual label is skipped so you do not see `1. 1. Title`.

These titles are also skipped, so they do not take a number:

- Obsidian’s inline note title
- A filename title injected by Better Export PDF or Pagina
- A Conspectus table-of-contents title

## Styles

Choose a preset in **Settings → Ordinal Headings**, or build a custom format. Tokens you can use:

`{n}` `{dotted}` `{1}`–`{6}` `{roman}` `{Roman}` `{alpha}` `{Alpha}` `{zh}`

Presets include decimal, parenthetical, classic outline, chapter, and Chinese 第X章.

Under **Backup**, **Export settings** and **Import settings** save or restore the configuration as `ordinal-headings-settings.json`.

## Put numbers into the note

Baking writes the numbers into the current note only. It does not number the rest of the vault, and it does not insert numbers while you type. Baking is useful when you want the numbers in a PDF, in Obsidian Publish, in search, or in the outline.

1. Open the note.
2. In **Settings → Ordinal Headings**, choose the style. Bake uses the active preset.
3. Open the command palette (`Ctrl+P` on Windows, `Cmd+P` on Mac, or the Commands entry on Android).
4. Run **Bake numbers into current note**.

For the decimal preset, this:

```markdown
# Intro
## Background
```

becomes:

```markdown
# 1 Intro
## 1.1 Background
```

The exact text follows your preset or custom format.

After you add, remove, or reorder headings, run **Bake numbers into current note** again. Bake removes an old recognizable prefix first, so a heading becomes `# 2.2 Title` rather than `# 2.2 2.1 Title`.

To take the numbers back out, run **Strip baked numbers from current note**.

## One note at a time

```yaml
ordinal-headings: off
ordinal-headings-style: zh-chapter
```

- `ordinal-headings: off` or `on` turns numbering off or on for this note.
- `ordinal-headings-style` picks a preset for this note, such as `decimal`, `zh-chapter`, or `custom`.

**Toggle numbering for current note** writes that on/off flag for the open note.

## Commands

| Command | What it does |
| --- | --- |
| Bake numbers into current note | Write numbers into this note’s Markdown |
| Strip baked numbers from current note | Remove recognizable number prefixes |
| Toggle numbering for current note | Turn numbering on or off for this note |
| Refresh heading numbers | Redraw the visual numbers |

## Support

[![Buy Me a Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/aceofspadesomelette)

## Star history

[![Star History Chart](https://api.star-history.com/svg?repos=AceOfSpadesOmelette/ordinal-headings&type=Date)](https://www.star-history.com/#AceOfSpadesOmelette/ordinal-headings&Date)
