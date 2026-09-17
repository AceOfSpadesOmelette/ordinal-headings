# Ordinal Headings

Live Word-style numbering for Heading 1–6 in Obsidian. Numbers are **visual by default** (your Markdown stays clean) and update as you edit.

## Features

- Multilevel presets (decimal, parenthetical, classic outline, chapter, Chinese 第X章, …)
- Custom format tokens: `{n}` `{dotted}` `{1}`–`{6}` `{roman}` `{Roman}` `{alpha}` `{Alpha}` `{zh}`
- Live Preview + Reading view (desktop and Android)
- Per-note frontmatter override
- Optional **bake** / **strip** commands for the **current note only**

## Install

Copy `main.js`, `manifest.json`, and `styles.css` into:

`<vault>/.obsidian/plugins/ordinal-headings/`

Enable **Ordinal Headings** in Community plugins.

## How numbering works

By default, numbers are **visual only**. They appear next to headings while you edit or read, but they are **not** written into the Markdown file. They update automatically when you add, remove, or reorder headings.

If a heading already starts with a number-like prefix (for example `1.` or `2.1`), the visual label is skipped so you do not see doubles like `1. 1. Title`.

## Put numbers into Markdown (bake)

Baking writes the numbers into the file text (useful for PDF, Publish, search, and the outline). It is **manual** and only affects the note you currently have open — it does **not** auto-insert while you type, and it does **not** process the whole vault.

### Steps

1. Open the note you want to number (use **Edit** mode on mobile).
2. In **Settings → Ordinal Headings**, choose your style in the List library (bake uses the active preset).
3. Open the **Command palette**:
   - Desktop: `Ctrl+P` (Windows) or `Cmd+P` (Mac)
   - Android: use Obsidian’s **Commands** / command palette entry
4. Run: **Ordinal Headings: Bake numbers into current note**
5. Headings in that note are rewritten, for example:

```markdown
# Intro
## Background
```

may become (decimal preset):

```markdown
# 1 Intro
## 1.1 Background
```

(Exact text depends on your preset / custom formats.)

### Re-bake after edits

After you add, remove, or reorder headings, baked numbers can go stale. Run **Bake** again to renumber.

Bake strips an old recognizable prefix first, so you should get `# 2.2 Title`, not `# 2.2 2.1 Title`.

### Remove baked numbers

Command palette → **Ordinal Headings: Strip baked numbers from current note**

## Frontmatter (per-note)

```yaml
ordinal-headings: off
ordinal-headings-style: zh-chapter
```

- `ordinal-headings: off` (or `on`) — disable / enable for this note  
- `ordinal-headings-style` — preset for this note (`decimal`, `zh-chapter`, `custom`, …)

You can also run **Toggle numbering for current note** from the command palette.

## Commands summary

| Command | What it does |
|---------|----------------|
| Bake numbers into current note | Write numbers into this note’s Markdown |
| Strip baked numbers from current note | Remove recognizable number prefixes |
| Toggle numbering for current note | Frontmatter on/off for this note |
| Refresh heading numbers | Re-apply visual decorations |

## Develop

```bash
npm install
npm run build
```
