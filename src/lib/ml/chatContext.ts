import { TASK_META, TIER_META, formatScore, formatWeek, neighborIds, observedSignals, rankUnits, signalRows, tierCounts, unitName, unitScore, unitTier } from "./risk";
import type { Board, ModelMeta, TaskId, UnitProfile } from "./types";

// The assistant chats can only talk about what the saved synthetic run actually contains.
// These helpers turn the board into short plain-text facts used for quick replies and as grounding for the LLM.

export interface ChatContext {
  unitId: string;
  unitLabel: string;
  week: string;
  scenario: string;
  runId: string;
  m1Line: string;
  m2Line: string;
  signalLines: string[];
  signalValues: string[];
  neighbours: string[];
  topUnits: Record<TaskId, string[]>;
  counts: Record<TaskId, string>;
  models: Record<TaskId, ModelMeta>;
}

function taskLine(board: Board, unitId: string, task: TaskId): string {
  const unit = board.units.find((u) => u.unit_id === unitId);
  const tier = unitTier(unit, task);
  if (!tier) {
    return task === "m1"
      ? "Early warning (M1): not scored this week because a simulated event is already active in this unit."
      : "Detection (M2): not scored this week.";
  }
  const label = TIER_META[tier].label;
  return `${TASK_META[task].name} (${TASK_META[task].short}): ${label}, model score ${formatScore(unitScore(unit, task))}.`;
}

export function buildChatContext(board: Board | undefined, units: UnitProfile[], unitId: string): ChatContext | null {
  if (!board) return null;
  const unit = board.units.find((u) => u.unit_id === unitId);
  const name = (id: string) => `${unitName(units, id)} (${id})`;
  const top = (task: TaskId) =>
    rankUnits(board, task)
      .filter((u) => unitTier(u, task) === "review")
      .slice(0, 5)
      .map((u) => `${name(u.unit_id)} ${formatScore(unitScore(u, task))}`);
  const countText = (task: TaskId) => {
    const c = tierCounts(board, task);
    return `${c.review} review, ${c.watch} watch, ${c.routine} routine, ${c.unscored} not scored`;
  };
  return {
    unitId,
    unitLabel: name(unitId),
    week: formatWeek(board.date),
    scenario: board.scenario,
    runId: board.run_id,
    m1Line: taskLine(board, unitId, "m1"),
    m2Line: taskLine(board, unitId, "m2"),
    signalLines: unit ? observedSignals(unit.signals) : [],
    signalValues: unit ? signalRows(unit.signals).map((r) => `${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`) : [],
    neighbours: neighborIds(units, unitId).map((id) => {
      const n = board.units.find((u) => u.unit_id === id);
      const tier = unitTier(n, "m1") ?? unitTier(n, "m2");
      return `${name(id)}: ${tier ? TIER_META[tier].label : "not scored"}`;
    }),
    topUnits: { m1: top("m1"), m2: top("m2") },
    counts: { m1: countText("m1"), m2: countText("m2") },
    models: board.models,
  };
}

const RULES =
  "Rules: every number comes from a saved SIMULATED run of a research model, not from real surveillance. " +
  "Never present a score as a diagnosis, an official alert or a probability for a real place. " +
  "The model only looks 7 days ahead (early warning) or at the current week (detection) and covers cholera and acute diarrheal disease only. " +
  "If asked about typhoid, hepatitis A, pH or anything not listed below, say the model does not cover it. " +
  "Give general prevention advice (boiled or treated water, ORS, hand washing, early care-seeking) and keep answers short.";

export function contextAsPrompt(role: string, ctx: ChatContext | null): string {
  if (!ctx) {
    return `You are the Sanjeevani assistant for a ${role}. No model run is loaded, so say you cannot see any risk data. ${RULES}`;
  }
  return [
    `You are the Sanjeevani assistant for a ${role}. Home area: ${ctx.unitLabel}. Week of ${ctx.week}. Surveillance scenario: ${ctx.scenario}. Run: ${ctx.runId}.`,
    ctx.m1Line,
    ctx.m2Line,
    `Signals seen: ${ctx.signalLines.join("; ") || "nothing unusual"}.`,
    `Inputs: ${ctx.signalValues.join("; ")}.`,
    `Neighbouring units: ${ctx.neighbours.join("; ") || "none listed"}.`,
    `All units, early warning: ${ctx.counts.m1}. Detection: ${ctx.counts.m2}.`,
    `Highest early-warning scores: ${ctx.topUnits.m1.join("; ") || "none in review"}.`,
    RULES,
  ].join("\n");
}

export const SYNTHETIC_NOTE = "ℹ️ Simulated data: these scores rank synthetic units for review and are not an official alert.";

export function waterReply(ctx: ChatContext | null): string {
  if (!ctx) return "I can't see any model data right now. Please start the local ML service or load the saved run, then ask again.";
  return [
    `💧 Water and weather inputs for ${ctx.unitLabel}, week of ${ctx.week}:`,
    ...ctx.signalValues.map((line) => `• ${line}`),
    "",
    "The model uses turbidity, free chlorine, E. coli lab results, TDS and weather. It has no pH sensor input.",
    "✅ When in doubt, boil drinking water for at least 10 minutes or use a certified purifier.",
    "",
    SYNTHETIC_NOTE,
  ].join("\n");
}

export function areaReply(ctx: ChatContext | null): string {
  if (!ctx) return "I can't see any model data right now. Please start the local ML service or load the saved run, then ask again.";
  return [
    `📊 ${ctx.unitLabel}, week of ${ctx.week} (${ctx.scenario} surveillance):`,
    `• ${ctx.m1Line}`,
    `• ${ctx.m2Line}`,
    ctx.signalLines.length ? `\nSignals seen:\n${ctx.signalLines.map((s) => `• ${s}`).join("\n")}` : "\nNothing unusual in the observed signals.",
    ctx.neighbours.length ? `\nNeighbours:\n${ctx.neighbours.map((s) => `• ${s}`).join("\n")}` : "",
    "",
    SYNTHETIC_NOTE,
  ].join("\n");
}

export function hotspotReply(ctx: ChatContext | null, task: TaskId): string {
  if (!ctx) return "I can't see any model data right now. Please start the local ML service or load the saved run, then ask again.";
  const list = ctx.topUnits[task];
  return [
    `🗺️ ${TASK_META[task].name} (${TASK_META[task].short}), week of ${ctx.week}`,
    `Across all units: ${ctx.counts[task]}.`,
    list.length ? `Highest scores in the review tier:\n${list.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "No unit is in the review tier this week.",
    "",
    SYNTHETIC_NOTE,
  ].join("\n");
}
