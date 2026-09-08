# Git and reconciliation

Status: validated P0 boundary

## Reconciliation flow

```text
refresh source
  → resolve requested revision
    → normalize package
      → load desired bindings
        → inspect project, files, and provider state
          → produce a deterministic plan
            → approve
              → apply bounded actions
                → verify hashes and final state
```

The plan is the unit the user reviews. Re-running the same plan against the same state
must produce no additional changes.

## Git read contract

P0 may inspect repository identity, current branch, HEAD, refs, status, diffs, and
requested source revisions. Git is a transport and revision layer, not a hidden write
channel.

P0 does not automatically commit, push, merge, rebase, create branches, or resolve
conflicts. Any future Git write must be an explicit operation with a preview, scope,
approval, and result record.

## File ownership

Omni can remove or update only a file it owns through an installation record or a user
approved explicit target. A locally modified owned file is `drifted`; an unmanaged target
is a conflict or requires explicit adoption. No write silently overwrites local work.

## Idempotency and recovery

- Plans use resolved revisions and content hashes.
- File writes are bounded to approved roots.
- Destructive changes create a backup or recovery reference.
- Partial failure records completed and failed actions separately.
- A second run observes the result before deciding whether work remains.

## Provider actions

Provider caches, plugin indexes, and hook activation are provider-owned. Omni may inspect
them and emit `install`, `update`, `uninstall`, `activate`, or `deactivate` actions. The
provider adapter performs those actions only after explicit approval. Omni never deletes
a provider cache directly when an official provider operation exists.
