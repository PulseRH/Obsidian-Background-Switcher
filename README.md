# Background Switcher

Switch the whole Obsidian background image based on folder location or frontmatter metadata.

## How It Works

The plugin keeps the original rule-table workflow from Colorful Note Background, but the rule result
is now an image instead of a color. When the active note matches the first configured rule, Obsidian's
workspace chrome is made transparent and the selected image is shown behind the whole app.

- **Folder rules**: Match notes by folder name anywhere in the path.
- **Frontmatter rules**: Match notes by metadata key-value pairs, such as `category: private`.
- **Priority**: Rules are evaluated in order, and the first matching rule applies.

## Configuration

Go to Settings -> Background Switcher to manage rules.

| Field | Description |
| ----- | ----------- |
| Type | `Folder` or `Frontmatter` |
| Value | Folder name or `key: value` for frontmatter |
| Image | Image URL or local image path |
| Overlay | Optional dark overlay from `0` to `0.8` |
| Priority | Move rules up or down |

The image defaults and positioning are based on the transparent background snippet this plugin was
created from: cover sizing, `70% 0%` focal point, normal saturation, and normal brightness.

## Development

- `npm run dev` builds in watch mode.
- `npm run build` runs TypeScript checks and creates the production bundle.
- `npm test` runs Jest tests.

## License

MIT License. See [LICENSE](LICENSE) for details.
