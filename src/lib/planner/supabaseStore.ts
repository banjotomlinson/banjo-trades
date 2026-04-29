"use client";

import { createClient } from "@/lib/supabase/client";
import type { Plan, Step } from "./types";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface DbPlan {
  id: string;
  user_id: string;
  title: string;
  steps: Step[] | null;
  risk: Step[] | null;
  created_at: string;
  updated_at: string;
}

function rowToPlan(row: DbPlan): Plan {
  return {
    id: row.id,
    title: row.title,
    steps:
      Array.isArray(row.steps) && row.steps.length > 0
        ? row.steps
        : [{ id: uid(), text: "" }],
    risk:
      Array.isArray(row.risk) && row.risk.length > 0
        ? row.risk
        : [{ id: uid(), text: "" }],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabaseStore = {
  async list(): Promise<Plan[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as DbPlan[]).map(rowToPlan);
  },

  async create(title = "New trade plan"): Promise<Plan> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const initial = {
      user_id: user.id,
      title,
      steps: [{ id: uid(), text: "" }],
      risk: [{ id: uid(), text: "" }],
    };
    const { data, error } = await supabase
      .from("plans")
      .insert(initial)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToPlan(data as DbPlan);
  },

  async update(
    id: string,
    patch: Partial<Pick<Plan, "title" | "steps" | "risk">>
  ): Promise<Plan | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plans")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToPlan(data as DbPlan) : null;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  newStepId(): string {
    return uid();
  },
};
