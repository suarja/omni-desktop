import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from "react";

import { Icon, type IconName } from "./components/Icon";
import { PlanSummary } from "./components/PlanSummary";
import type {
  ApplyResult,
  ArtifactSummary,
  DesktopApi,
  PackageSummary,
  PlanPreview,
  SourceCatalog,
  SourceSummary,
} from "../shared/ipc";

type OmniWindow = Window & { omni?: DesktopApi };
type View = "plugins" | "skills";
type SourceScope = "official" | "personal";
type Category = "all" | "static" | "user-only" | "provider";

type CatalogArtifact = ArtifactSummary & {
  package: PackageSummary;
  source: SourceSummary;
};

const navItems: ReadonlyArray<{ label: string; icon: IconName }> = [
  { label: "Overview", icon: "home" },
  { label: "Marketplaces", icon: "marketplace" },
  { label: "Projects", icon: "folder" },
  { label: "Design systems", icon: "spark" },
  { label: "Plugins & Skills", icon: "package" },
];

const categoryItems: ReadonlyArray<{ label: string; value: Category }> = [
  { label: "All", value: "all" },
  { label: "Static skills", value: "static" },
  { label: "User-invoked", value: "user-only" },
  { label: "Provider actions", value: "provider" },
];

function getDesktopApi(): DesktopApi {
  const api = (window as OmniWindow).omni;
  if (!api) {
    throw new Error("Omni preload API is unavailable.");
  }

  return api;
}

function flattenArtifacts(catalog: SourceCatalog | null): CatalogArtifact[] {
  if (!catalog) {
    return [];
  }

  return catalog.sources.flatMap((source) =>
    source.packages.flatMap((packageRecord) =>
      packageRecord.artifacts.map((artifact) => ({
        ...artifact,
        package: packageRecord,
        source,
      })),
    ),
  );
}

function sourceName(source: SourceSummary | undefined): string {
  if (!source) {
    return "No source loaded";
  }

  return source.id === "cursor-official" ? "Cursor Official" : source.id;
}

function sourceLabel(source: SourceSummary | undefined): string {
  return source?.id === "cursor-official" ? "Official" : "Personal";
}

function artifactCopy(artifact: CatalogArtifact): string {
  if (artifact.description) {
    return artifact.description;
  }
  if (artifact.kind === "hook") {
    return "Provider-managed executable hook. Omni will not run it automatically.";
  }

  return `${artifact.kind} discovered in ${artifact.package.externalId}.`;
}

function artifactIcon(artifact: CatalogArtifact): IconName {
  return artifact.kind === "hook" ? "hook" : artifact.kind === "skill" ? "spark" : "package";
}

function artifactStatus(artifact: CatalogArtifact): string {
  if (artifact.executionClass === "executable") {
    return "Provider action";
  }
  if (artifact.invocationPolicy === "user-only") {
    return "User-invoked";
  }

  return "Static file";
}

function matchesCategory(artifact: CatalogArtifact, category: Category): boolean {
  if (category === "all") {
    return true;
  }
  if (category === "provider") {
    return artifact.executionClass === "executable";
  }
  if (category === "user-only") {
    return artifact.invocationPolicy === "user-only";
  }

  return artifact.executionClass === "static" && artifact.kind === "skill";
}

function handleCardKey(event: KeyboardEvent<HTMLElement>, select: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    select();
  }
}

export function App(): ReactElement {
  const [api] = useState<DesktopApi | null>(() => {
    try {
      return getDesktopApi();
    } catch {
      return null;
    }
  });
  const [catalog, setCatalog] = useState<SourceCatalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>("plugins");
  const [sourceScope, setSourceScope] = useState<SourceScope>("official");
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanPreview | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!api) {
      setLoadError("The preload bridge is unavailable. Open Omni through Electron to load the local catalogue.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      setCatalog(await api.listSources());
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "The local catalogue could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const allArtifacts = useMemo(() => flattenArtifacts(catalog), [catalog]);
  const scopedArtifacts = sourceScope === "official" ? allArtifacts : [];
  const selectedArtifact = scopedArtifacts.find((artifact) => artifact.id === selectedArtifactId);
  const source = catalog?.sources[0];
  const visibleArtifacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return scopedArtifacts.filter((artifact) => {
      const searchable = [artifact.id, artifact.name, artifact.description, artifact.package.externalId];
      const matchesSearch = !normalizedQuery || searchable.some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesSearch && matchesCategory(artifact, category);
    });
  }, [category, query, scopedArtifacts]);
  const visiblePackages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sourceScope === "official"
      ? source?.packages.filter((packageRecord) => {
          return [packageRecord.id, packageRecord.externalId].some((value) => value.toLowerCase().includes(normalizedQuery));
        }) ?? []
      : [];
  }, [query, source, sourceScope]);
  const skillCount = scopedArtifacts.filter((artifact) => artifact.kind === "skill").length;
  const hookCount = scopedArtifacts.filter((artifact) => artifact.kind === "hook").length;

  useEffect(() => {
    const firstVisible = visibleArtifacts[0];
    if (!selectedArtifactId || !scopedArtifacts.some((artifact) => artifact.id === selectedArtifactId)) {
      setSelectedArtifactId(firstVisible?.id ?? null);
    }
  }, [scopedArtifacts, selectedArtifactId, visibleArtifacts]);

  const selectArtifact = (artifact: CatalogArtifact) => {
    setSelectedArtifactId(artifact.id);
    setPlan(null);
    setApplyResult(null);
  };

  const previewArtifact = async (artifact: CatalogArtifact) => {
    if (!api || !source || !catalog) {
      return;
    }

    selectArtifact(artifact);
    setIsWorking(true);
    setApplyResult(null);
    try {
      setPlan(await api.createPlan({
        sourceId: source.id,
        packageId: artifact.package.id,
        artifactId: artifact.id,
        projectRoot: catalog.projectRoot,
      }));
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "The plan could not be created.");
    } finally {
      setIsWorking(false);
    }
  };

  const applyCurrentPlan = async () => {
    if (!api || !plan) {
      return;
    }

    setIsWorking(true);
    try {
      setApplyResult(await api.applyPlan({ projectRoot: plan.projectRoot, plan, approved: true }));
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "The plan could not be applied.");
    } finally {
      setIsWorking(false);
    }
  };

  const closePlan = () => {
    setPlan(null);
    setApplyResult(null);
  };

  const handleSourceScope = (nextScope: SourceScope) => {
    setSourceScope(nextScope);
    setSelectedArtifactId(null);
    setPlan(null);
    setApplyResult(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="workspace-switcher">
          <div className="workspace-avatar">M</div>
          <div className="workspace-copy"><strong>Personal workspace</strong><span>Local-first</span></div>
          <Icon name="chevron-down" size={14} />
        </div>

        <label className="sidebar-search">
          <Icon name="search" size={14} />
          <input placeholder="Search" aria-label="Search workspace" />
          <kbd>⌘K</kbd>
        </label>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = item.label === "Plugins & Skills";
            return (
              <button className={`nav-item${isActive ? " active" : ""}`} type="button" key={item.label}>
                <Icon name={item.icon} size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="source-status">
          <span className="source-status-dot" />
          <div><strong>{sourceName(source)}</strong><span title={source?.locator}>{source?.locator ?? "Waiting for local source"}</span></div>
          <button type="button" onClick={() => void loadCatalog()} aria-label="Refresh source"><Icon name="refresh" size={14} /></button>
        </div>
        <button className="settings-link" type="button"><Icon name="settings" size={16} /><span>Settings</span></button>
      </aside>

      <main className="content-area">
        <section className="page-content">
          <header className="page-heading">
            <h1>Plugins</h1>
            <div className="heading-actions">
              <button className="button primary" type="button" onClick={() => void loadCatalog()}><Icon name="plus" size={14} /> Add</button>
            </div>
          </header>

          {loadError ? (
            <div className="callout error" role="alert"><strong>Could not read the local source</strong><span>{loadError}</span><button className="button secondary compact" type="button" onClick={() => void loadCatalog()}>Retry</button></div>
          ) : null}

          <div className="type-toolbar">
            <div className="segmented-control" role="tablist" aria-label="Catalog type">
              <button className={view === "plugins" ? "selected" : ""} type="button" role="tab" aria-selected={view === "plugins"} onClick={() => setView("plugins")}>Plugins</button>
              <button className={view === "skills" ? "selected" : ""} type="button" role="tab" aria-selected={view === "skills"} onClick={() => setView("skills")}>Skills</button>
            </div>
          </div>
          <div className="source-toolbar">
            <div className="scope-tabs" role="tablist" aria-label="Marketplace scope">
              <button className={sourceScope === "official" ? "selected" : ""} type="button" role="tab" aria-selected={sourceScope === "official"} onClick={() => handleSourceScope("official")}>Official</button>
              <button className={sourceScope === "personal" ? "selected" : ""} type="button" role="tab" aria-selected={sourceScope === "personal"} onClick={() => handleSourceScope("personal")}>Personal</button>
            </div>
            <label className="search-field">
              <Icon name="search" size={14} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "plugins" ? "Search plugins" : "Search skills"} aria-label={view === "plugins" ? "Search plugins" : "Search skills"} />
            </label>
          </div>

          <div className="category-row" aria-label="Artifact categories">
            {categoryItems.map((item) => <button className={category === item.value ? "selected" : ""} type="button" key={item.value} onClick={() => setCategory(item.value)}>{item.label}</button>)}
            <span className="catalog-count">{isLoading ? "Reading source…" : `${view === "plugins" ? visiblePackages.length : visibleArtifacts.length} available`}</span>
          </div>

          {view === "plugins" ? (
            <div className="plugin-grid">
              {visiblePackages.map((packageRecord) => {
                const packageArtifacts = scopedArtifacts.filter((artifact) => artifact.package.id === packageRecord.id);
                const firstSkill = packageArtifacts.find((artifact) => artifact.kind === "skill") ?? packageArtifacts[0];
                return (
                  <article className="plugin-card" key={packageRecord.id}>
                    <div className="artifact-icon plugin"><Icon name="package" size={18} /></div>
                    <div className="artifact-copy"><div className="card-meta"><span className="source-badge">{sourceLabel(source)}</span><span>v{packageRecord.version}</span></div><h2>{packageRecord.externalId}</h2><p>Package with {packageArtifacts.length} discovered artifacts.</p></div>
                    <button className="button outline" type="button" onClick={() => { setView("skills"); if (firstSkill) selectArtifact(firstSkill); }}>Inspect <Icon name="arrow-right" size={13} /></button>
                  </article>
                );
              })}
              {!isLoading && visiblePackages.length === 0 ? <EmptyState scope={sourceScope} kind="plugins" /> : null}
            </div>
          ) : (
            <div className="artifact-grid">
              {visibleArtifacts.map((artifact) => {
                const isSelected = artifact.id === selectedArtifactId;
                return (
                  <article className={`artifact-card${isSelected ? " selected" : ""}`} key={`${artifact.package.id}-${artifact.id}`} onClick={() => selectArtifact(artifact)} onKeyDown={(event) => handleCardKey(event, () => selectArtifact(artifact))} role="button" tabIndex={0}>
                    <div className={`artifact-icon ${artifact.kind}`}><Icon name={artifactIcon(artifact)} size={17} /></div>
                    <div className="artifact-copy"><div className="card-meta"><span className={artifact.executionClass === "executable" ? "warning-badge" : "source-badge"}>{artifactStatus(artifact)}</span><span>{artifact.package.externalId}</span></div><h2>{artifact.name ?? artifact.id}</h2><p>{artifactCopy(artifact)}</p></div>
                    <button className="button outline" type="button" disabled={isWorking} onClick={(event) => { event.stopPropagation(); void previewArtifact(artifact); }}>Preview <Icon name="arrow-right" size={13} /></button>
                  </article>
                );
              })}
              {!isLoading && visibleArtifacts.length === 0 ? <EmptyState scope={sourceScope} kind="skills" /> : null}
            </div>
          )}

          <footer className="catalog-footer"><span><span className="source-status-dot" /> Source revision: {source?.revision ?? "—"}</span><span>{skillCount} skills · {hookCount} provider hooks</span></footer>
        </section>
      </main>

      {plan ? <PlanSummary plan={plan} result={applyResult} busy={isWorking} onApply={() => void applyCurrentPlan()} onClose={closePlan} /> : null}
    </div>
  );
}

function EmptyState({ scope, kind }: Readonly<{ scope: SourceScope; kind: View }>): ReactElement {
  const label = kind === "plugins" ? "plugins" : "skills";
  return (
    <div className="empty-state">
      <Icon name={scope === "personal" ? "package" : "search"} size={24} />
      <strong>{scope === "personal" ? `No personal ${label} yet` : `No ${label} match this search`}</strong>
      <p>{scope === "personal" ? "Add a local or external source to make it available here." : "Try another name or clear the search."}</p>
    </div>
  );
}

export { getDesktopApi };
