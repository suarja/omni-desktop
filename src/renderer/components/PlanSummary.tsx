import type { ReactElement } from "react";

import { Icon } from "./Icon";
import type { ApplyResult, PlanPreview } from "../../shared/ipc";

type PlanSummaryProps = Readonly<{
  plan: PlanPreview;
  result: ApplyResult | null;
  busy: boolean;
  onApply: () => void;
  onClose: () => void;
}>;

function statusLabel(status: PlanPreview["plan"]["status"]): string {
  return {
    ready: "Ready to apply",
    noop: "Already in sync",
    drifted: "Local drift detected",
    blocked: "Provider action required",
  }[status];
}

function formatAction(plan: PlanPreview): string {
  const action = plan.plan.actions[0];
  if (!action) {
    return plan.plan.status === "noop" ? "No file changes" : "No file action";
  }

  return `${action.kind === "create" ? "Create" : "Update"} one file`;
}

function filePreview(plan: PlanPreview): ReactElement | null {
  const action = plan.plan.actions[0];
  if (!action) {
    return null;
  }

  const lines = action.content.split(/\r?\n/).slice(0, 6);
  return (
    <div className="diff-preview" aria-label="Preview of the first lines">
      {lines.map((line, index) => (
        <div className="diff-line" key={`${index}-${line}`}>
          <span className="diff-marker">+</span>
          <span>{line || " "}</span>
        </div>
      ))}
      {action.content.split(/\r?\n/).length > lines.length ? (
        <div className="diff-more">… more lines in the skill file</div>
      ) : null}
    </div>
  );
}

function resultMessage(result: ApplyResult): string {
  if (result.status === "applied") {
    return result.completed[0]?.changed
      ? "The local skill was written successfully."
      : "The target was already identical.";
  }
  if (result.status === "noop") {
    return "Nothing changed: the project already matches the source.";
  }
  if (result.status === "blocked") {
    return result.reason ?? "The plan was blocked before any write.";
  }

  return result.failed[0]?.reason ?? "The file action failed before completion.";
}

export function PlanSummary({
  plan,
  result,
  busy,
  onApply,
  onClose,
}: PlanSummaryProps): ReactElement {
  const canApply = plan.plan.status === "ready" && result === null;
  const tone = result
    ? result.status === "applied" || result.status === "noop"
      ? "success"
      : "danger"
    : plan.plan.status === "ready" || plan.plan.status === "noop"
      ? "success"
      : "danger";

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="plan-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Change review</p>
            <h2 id="plan-title">{plan.artifactName ?? plan.artifactId}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close change review">
            <Icon name="x" size={15} />
          </button>
        </header>

        <div className={`plan-status ${tone}`}>
          <span className="status-dot" />
          <span>{result ? resultMessage(result) : statusLabel(plan.plan.status)}</span>
        </div>

        <section className="review-section">
          <div className="review-heading">
            <span>Source</span>
            <span className="review-value">{plan.packageExternalId} · v{plan.packageVersion}</span>
          </div>
          <dl className="review-list">
            <div>
              <dt>Provider</dt>
              <dd>Cursor marketplace</dd>
            </div>
            <div>
              <dt>Revision</dt>
              <dd>{plan.sourceRevision}</dd>
            </div>
            <div>
              <dt>Compatibility</dt>
              <dd>{plan.compatibility === "compatible" ? "Static skill · compatible" : "Provider action required"}</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd><span className={`risk risk-${plan.risk}`}>{plan.risk}</span></dd>
            </div>
          </dl>
        </section>

        <section className="review-section">
          <div className="review-heading">
            <span>Materialization</span>
            <span className="review-value">{formatAction(plan)}</span>
          </div>
          <div className="target-box">
            <span className="target-label">Target path</span>
            <code>{plan.plan.targetPath ?? "No target: this artifact is not materializable in P0."}</code>
          </div>
          {filePreview(plan)}
        </section>

        {plan.compatibility === "provider-action" ? (
          <div className="callout warning">
            <strong>Provider action</strong>
            <span>Omni records this executable artifact but will not run or materialize it automatically.</span>
          </div>
        ) : null}

        {plan.plan.reason ? (
          <div className="callout warning">
            <strong>Why Omni stopped</strong>
            <span>{plan.plan.reason}</span>
          </div>
        ) : null}

        {result?.completed[0]?.backupPath ? (
          <div className="callout success">
            <strong>Recovery copy created</strong>
            <span>{result.completed[0].backupPath}</span>
          </div>
        ) : null}

        <div className="drawer-footer">
          <p className="muted-note">Omni never writes in the background. This action stays explicit.</p>
          <div className="drawer-actions">
            <button className="button secondary" type="button" onClick={onClose}>
              Close
            </button>
            <button className="button primary" type="button" disabled={!canApply || busy} onClick={onApply}>
              {busy ? "Applying…" : plan.plan.status === "noop" ? "Already applied" : "Apply change"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
