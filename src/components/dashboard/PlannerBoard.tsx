"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseStore as plannerStore } from "@/lib/planner/supabaseStore";
import type { Plan, Step } from "@/lib/planner/types";

type ListKind = "trade" | "risk";

const LIST_THEME: Record<
  ListKind,
  {
    label: string;
    accent: string;
    placeholder: (i: number) => string;
  }
> = {
  trade: {
    label: "Trade Plan",
    accent: "#3b82f6",
    placeholder: (i) =>
      i === 0 ? "Write your first rule..." : "Add another step...",
  },
  risk: {
    label: "Risk Management",
    accent: "#f59e0b",
    placeholder: (i) =>
      i === 0 ? "Max risk per trade, daily loss cap, etc..." : "Add another rule...",
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = 60_000, h = 60 * m, d = 24 * h;
  if (diff < m) return "just now";
  if (diff < h) return `${Math.floor(diff / m)}m ago`;
  if (diff < d) return `${Math.floor(diff / h)}h ago`;
  return `${Math.floor(diff / d)}d ago`;
}

export default function PlannerBoard() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load. After that, local state is authoritative and we persist
  // to Supabase in the background. This keeps typing instant and prevents
  // races where two rapid edits overwrite each other.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await plannerStore.list();
        if (!cancelled) setPlans(list);
      } catch (err) {
        console.error("Failed to load plans", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate() {
    try {
      const plan = await plannerStore.create();
      setPlans((prev) => [plan, ...prev]);
      requestAnimationFrame(() => {
        document.getElementById(`plan-${plan.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (err) {
      console.error("Failed to create plan", err);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this plan? This can't be undone.")) return;
    setPlans((prev) => prev.filter((p) => p.id !== id));
    try {
      await plannerStore.delete(id);
    } catch (err) {
      console.error("Failed to delete plan", err);
    }
  }

  function onPlanPatch(
    id: string,
    patch: Partial<Pick<Plan, "title" | "steps" | "risk">>
  ) {
    // Update local state immediately so typing feels instant.
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p
      )
    );
    // Fire-and-forget persistence. Errors get logged but the UI keeps working.
    plannerStore.update(id, patch).catch((err) => {
      console.error("Failed to persist plan update", err);
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#f1f5f9]">Trade Planner</h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Your daily playbook. Trade plan on the left, risk management on the right.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm px-4 py-2 rounded-md transition-colors inline-flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New plan
        </button>
      </div>

      {/* Plans */}
      {loading ? (
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-10 text-center text-[#64748b] text-sm">
          Loading...
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-12 text-center">
          <div className="text-5xl mb-3">🗒️</div>
          <div className="text-base font-semibold text-white mb-1">No plans yet</div>
          <div className="text-sm text-[#64748b] mb-5">
            Click <strong className="text-white">New plan</strong> to write down your trading rules.
          </div>
          <button
            onClick={onCreate}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm px-5 py-2 rounded-md"
          >
            Create your first plan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onPatch={(patch) => onPlanPatch(p.id, patch)}
              onDelete={() => onDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single plan ───────────────────────────────────────────────────
function PlanCard({
  plan,
  onPatch,
  onDelete,
}: {
  plan: Plan;
  onPatch: (patch: Partial<Pick<Plan, "title" | "steps" | "risk">>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(plan.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [focusStepId, setFocusStepId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(plan.title);
  }, [plan.title]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.select();
  }, [editingTitle]);

  function commitTitle() {
    const next = title.trim() || "Untitled plan";
    setEditingTitle(false);
    if (next !== plan.title) onPatch({ title: next });
    setTitle(next);
  }

  function setList(kind: ListKind, nextSteps: Step[]) {
    if (kind === "trade") onPatch({ steps: nextSteps });
    else onPatch({ risk: nextSteps });
  }

  const totalTrade = plan.steps.filter((s) => s.text.trim()).length;
  const totalRisk = plan.risk.filter((s) => s.text.trim()).length;

  return (
    <div
      id={`plan-${plan.id}`}
      className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[#1e293b] flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitle(plan.title);
                  setEditingTitle(false);
                }
              }}
              className="w-full bg-transparent border-b border-[#3b82f6] text-base font-semibold text-white focus:outline-none pb-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-base font-semibold text-white hover:text-blue-400 transition-colors text-left w-full truncate"
              title="Click to rename"
            >
              {plan.title}
            </button>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-[#64748b] tabular-nums">
              {totalTrade} {totalTrade === 1 ? "step" : "steps"}
            </span>
            <span className="text-[11px] text-[#475569]">·</span>
            <span className="text-[11px] text-[#64748b] tabular-nums">
              {totalRisk} {totalRisk === 1 ? "rule" : "rules"}
            </span>
            <span className="text-[11px] text-[#475569]">·</span>
            <span className="text-[11px] text-[#475569]">
              Updated {timeAgo(plan.updatedAt)}
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-[#64748b] hover:text-red-400 text-xs font-semibold px-2 py-1 transition-colors"
          title="Delete plan"
        >
          Delete
        </button>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-[#1e293b]">
        <StepList
          kind="trade"
          steps={plan.steps}
          onSteps={(next) => setList("trade", next)}
          focusStepId={focusStepId}
          setFocusStepId={setFocusStepId}
        />
        <StepList
          kind="risk"
          steps={plan.risk}
          onSteps={(next) => setList("risk", next)}
          focusStepId={focusStepId}
          setFocusStepId={setFocusStepId}
        />
      </div>
    </div>
  );
}

// ── Reusable step list ────────────────────────────────────────────
function StepList({
  kind,
  steps,
  onSteps,
  focusStepId,
  setFocusStepId,
}: {
  kind: ListKind;
  steps: Step[];
  onSteps: (next: Step[]) => void;
  focusStepId: string | null;
  setFocusStepId: (id: string | null) => void;
}) {
  const theme = LIST_THEME[kind];

  function update(id: string, patch: Partial<Step>) {
    onSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function remove(id: string) {
    const next = steps.filter((s) => s.id !== id);
    if (next.length === 0) {
      onSteps([{ id: plannerStore.newStepId(), text: "" }]);
    } else {
      onSteps(next);
    }
  }

  function addAfter(afterId?: string) {
    const newStep: Step = { id: plannerStore.newStepId(), text: "" };
    let next: Step[];
    if (afterId) {
      const idx = steps.findIndex((s) => s.id === afterId);
      next = [...steps.slice(0, idx + 1), newStep, ...steps.slice(idx + 1)];
    } else {
      next = [...steps, newStep];
    }
    onSteps(next);
    setFocusStepId(newStep.id);
  }

  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 px-2 mb-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: theme.accent }}
        />
        <span
          className="text-[10px] uppercase tracking-wider font-bold"
          style={{ color: theme.accent }}
        >
          {theme.label}
        </span>
      </div>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            index={i}
            kind={kind}
            autoFocus={focusStepId === step.id}
            onChange={(patch) => update(step.id, patch)}
            onDelete={() => remove(step.id)}
            onCommitAndAdd={(currentText) => {
              // Commit pending text and insert a new step in a single
              // state update to avoid the second update overwriting the
              // first when both are queued from the same Enter keypress.
              const updated = steps.map((s) =>
                s.id === step.id ? { ...s, text: currentText } : s
              );
              const idx = updated.findIndex((s) => s.id === step.id);
              const newStep: Step = {
                id: plannerStore.newStepId(),
                text: "",
              };
              const next = [
                ...updated.slice(0, idx + 1),
                newStep,
                ...updated.slice(idx + 1),
              ];
              onSteps(next);
              setFocusStepId(newStep.id);
            }}
          />
        ))}
        <button
          onClick={() => addAfter()}
          className="ml-9 mt-1 inline-flex items-center gap-1.5 text-xs text-[#64748b] hover:text-white font-semibold transition-colors"
          style={
            { ["--hover" as never]: theme.accent } as React.CSSProperties
          }
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add {kind === "trade" ? "step" : "rule"}
        </button>
      </div>
    </div>
  );
}

// ── Single step row ──────────────────────────────────────────────
function StepRow({
  step,
  index,
  kind,
  autoFocus,
  onChange,
  onDelete,
  onCommitAndAdd,
}: {
  step: Step;
  index: number;
  kind: ListKind;
  autoFocus: boolean;
  onChange: (patch: Partial<Step>) => void;
  onDelete: () => void;
  onCommitAndAdd: (currentText: string) => void;
}) {
  const [text, setText] = useState(step.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const theme = LIST_THEME[kind];

  useEffect(() => {
    setText(step.text);
  }, [step.text]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Auto-grow the textarea so long step text is readable.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  }, [text]);

  function commit() {
    if (text !== step.text) onChange({ text });
  }

  return (
    <div className="group flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-white/[0.02] transition-colors">
      <span
        className="text-[13px] font-bold w-6 text-right tabular-nums select-none pt-0.5 leading-snug shrink-0"
        style={{ color: theme.accent + "cc" }}
      >
        {index + 1}.
      </span>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onCommitAndAdd(text);
          }
          if (e.key === "Backspace" && text === "") {
            e.preventDefault();
            onDelete();
          }
        }}
        rows={1}
        placeholder={theme.placeholder(index)}
        className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder:text-[#475569] focus:outline-none resize-none leading-snug pt-0.5"
      />
      <button
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[#64748b] hover:text-red-400 transition-all text-base leading-none w-5 h-5 flex items-center justify-center mt-0.5"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}
