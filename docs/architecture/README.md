# Omni Desktop architecture

Status: validated architecture baseline

## Current direction

Omni should use a local-first ports-and-adapters architecture with a small domain core.
The domain vocabulary follows Domain-Driven Design, but the first implementation should
use only the tactical patterns that improve clarity: explicit records, value-like IDs,
ports, and deterministic services. It should not introduce a large framework or a full
aggregate hierarchy before the first vertical slice proves the boundaries.

```text
Desktop UI → local application API → application services
                                  → domain core
                                  → ports → filesystem, Git, provider adapters
```

The renderer never receives arbitrary filesystem access. Adapters own network, process,
filesystem, and provider-specific behavior.

## Canonical pages

- [Domain and state](domain-and-state.md)
- [Adapters and projections](adapters-and-projections.md)
- [Git and reconciliation](git-and-reconciliation.md)
- [Provider-managed state](provider-managed-state.md)

## Candidate comparison

| Option | Use | Risk |
| --- | --- | --- |
| Ports and adapters | Strong provider boundaries and testable core | Requires disciplined ports |
| Full hexagonal template | Same boundary idea with more ceremony | Too much structure for P0 |
| Tactical DDD | Useful language for source, plugin, binding, and drift | Over-modeling if adopted wholesale |
| Provider-specific services | Fast first adapter | Duplicates rules and creates drift |

The validated choice is ports and adapters plus lightweight DDD vocabulary. The first
vertical slice should prove it with one source adapter, one harness adapter, one
deterministic plan, and one safe apply.

## Open architecture questions

- Which local process boundary is needed for Electron filesystem and Git operations?
- Which provider actions must go through a CLI or API rather than file writes?
- Which state belongs in a local database versus versioned files?
- What is the smallest test fixture that proves cross-harness portability?
