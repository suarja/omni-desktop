# Omni Desktop design direction

Status: initial visual baseline implemented in the desktop prototype

Read [the canonical UI reference contract](canonical-ui-reference.md) before making a
visual change.

The accepted reference board export is
`docs/design/assets/form-boards/Omni Desktop - Planches.dc.html`. The current prototype
uses its light macOS shell,
compact sidebar, segmented catalogue controls, source badges, and explicit change-review
drawer as a starting language; it does not copy the reference product's branding or flows.

The desktop interface should help a solo developer understand and control state before
offering automation. The primary unit is a visible change plan, not a chat window.

## Core screens

1. **Overview** — current projects, source health, updates, drift, conflicts, and pending
   actions.
2. **Marketplaces** — connected sources, refresh state, provenance, licences, and source
   errors.
3. **Plugins and skills** — package contents, compatibility, capabilities, versions, and
   bindings.
4. **Projects** — detected harnesses, project scope, installed artifacts, and drift.
5. **Changes** — file changes and provider actions grouped by project and harness, with
   explicit approval.
6. **Settings** — trust, keys, local paths, Git behavior, and provider integrations.

## Design rules

- Show catalogue, desired, and materialized state separately.
- Put source, revision, license, scope, and risk beside every action.
- Make destructive scope visible: one project, selected projects, or all bindings.
- Treat provider actions as different from ordinary file changes.
- Keep dense technical detail available without forcing it into the primary view.
- Avoid implying that an external marketplace or hook is safe merely because it was
  discovered.

## Design validation

Validate the Overview, Marketplace detail, Plugin detail, Project state, and Change plan
boards first. The design must make a drifted file, an outdated cache, an inactive hook,
and a safe static skill visibly different.
