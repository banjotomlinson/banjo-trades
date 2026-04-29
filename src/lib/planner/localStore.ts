import type { Plan, Step } from "./types";

// localStorage-backed planner store for the local preview. Same pattern as
// the feedback preview — when this is approved, swap in a Supabase store.

const STORAGE_KEY = "traderm8_planner_v1";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readAll(): Plan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Plan[];
    if (!Array.isArray(parsed)) return [];
    // Back-fill `risk` for plans created before risk-management was added.
    return parsed.map((p) => ({
      ...p,
      risk:
        Array.isArray(p.risk) && p.risk.length > 0
          ? p.risk
          : [{ id: uid(), text: "" }],
    }));
  } catch {
    return [];
  }
}

function writeAll(plans: Plan[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    /* quota — silent */
  }
}

export const plannerStore = {
  list(): Plan[] {
    return [...readAll()].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  create(title = "New trade plan"): Plan {
    const now = new Date().toISOString();
    const plan: Plan = {
      id: uid(),
      title,
      steps: [{ id: uid(), text: "" }],
      risk: [{ id: uid(), text: "" }],
      createdAt: now,
      updatedAt: now,
    };
    writeAll([plan, ...readAll()]);
    return plan;
  },

  update(
    id: string,
    patch: Partial<Pick<Plan, "title" | "steps" | "risk">>
  ): Plan | null {
    const all = readAll();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const next: Plan = {
      ...all[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = next;
    writeAll(all);
    return next;
  },

  delete(id: string) {
    writeAll(readAll().filter((p) => p.id !== id));
  },

  // Helper: append a fresh empty step to a plan.
  addStep(planId: string): Plan | null {
    const plan = readAll().find((p) => p.id === planId);
    if (!plan) return null;
    const newStep: Step = { id: uid(), text: "" };
    return this.update(planId, { steps: [...plan.steps, newStep] });
  },

  newStepId(): string {
    return uid();
  },
};
