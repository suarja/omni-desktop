# Canonical UI reference

Status: active visual contract for Omni Desktop

## Authority and scope

The reference board export is authoritative for Omni Desktop's visual direction:

`docs/design/assets/form-boards/Omni Desktop - Planches.dc.html`

The export's co-located support files are part of the renderable reference set:

- `docs/design/assets/form-boards/support.js`
- `docs/design/assets/form-boards/macos-window.jsx`
- `docs/design/assets/form-boards/.thumbnail`

Open the `.dc.html` file through its supported renderer when inspecting the board. Do
not replace it with a paraphrase, a new screenshot, or a component implementation.
The board guides visual direction, not a licence to copy another product's branding,
text, code, assets, or product flows. Product behavior and accessibility requirements
remain defined by the current product and architecture contracts.

## Required comparison

Before and after every UI change, compare each affected surface with the reference board.
The exported boards are 1285x907 pixels and use the light macOS desktop state; use that
viewport, theme, and relevant state where possible. Compare the rendered implementation,
not only source code. A change report must identify the surface(s), viewport/theme,
reference state, and result. The Plugins surface is the default baseline for the first UI
slice; its three-level rhythm is type tabs, source scope/search, then category filters.

## Latest baseline check

On 2026-09-08, the rendered Plugins surface and centered change-review modal were
checked at 1285x907 in the light macOS state against the board exports. Shell geometry,
spacing rhythm, segmented controls, card proportions, empty-state treatment, and modal
placement are the current baseline. Fixture content intentionally has fewer records and
different product labels than the reference product; compare layout, hierarchy, and
visual roles rather than copying that product's content or identity.

## Compact visual checklist

- **Shell and sidebar:** window frame, traffic-light area, sidebar width, navigation
  hierarchy, selected item, search, footer, and shell/main boundary.
- **Main surfaces:** page title and description, cards, tables/lists, drawers, empty
  regions, content density, and primary action placement.
- **Spacing:** outer margins, section rhythm, card padding, row height, gaps, alignment,
  and truncation behavior.
- **Typography:** system sans hierarchy, weight, size, line height, letter spacing,
  monospace metadata, and readable contrast.
- **Palette:** light/dark surface roles, field and panel contrast, borders, muted text,
  primary ink, success, warning, and error treatment.
- **Controls:** buttons, segmented controls, search, badges, disabled states, focus,
  hover/pressed feedback, and affordance clarity.
- **States:** empty, partial, healthy, warning, error, stale, drifted, blocked, and
  pending states must be visually distinguishable without relying on color alone.
- **Icons:** consistent optical size, stroke/weight, alignment, semantic meaning, and
  no decorative icon that implies an unsupported action.
- **Responsive behavior:** resize or narrow-window behavior, overflow, wrapping,
  minimum readable widths, and preserved action priority.

## Reporting results

Use exactly one status for each relevant visual check:

- **PASS** — the comparison was run and the affected surface follows the contract, or
  a documented, approved product constraint explains the intentional difference.
- **FAIL** — the comparison was run and a material visual contract difference remains;
  name the surface and mismatch. Do not present the change as visually complete.
- **NOT RUN** — the comparison could not be performed; state the missing renderer,
  viewport, device, fixture, or other concrete reason. Do not infer visual success from
  typecheck, tests, or a build.

For a UI change, report the status beside the other validation results and include the
exact reference path. Keep visual proof separate from behavioral, build, and test proof.
