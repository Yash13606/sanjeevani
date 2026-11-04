import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FlaskConical, RefreshCw } from "lucide-react";

type Task = "m1" | "m2";

type Status = {
  available: boolean;
  synthetic: boolean;
  run_id: string | null;
  reason: string | null;
};

type Metric = {
  task: string;
  model: string;
  scenario: string;
  split: string;
  rows: number | null;
  positives: number | null;
  prevalence: number | null;
  average_precision: number | null;
  selected: boolean;
};

type Summary = {
  synthetic: boolean;
  run_id: string;
  metrics: Metric[];
  event_metrics: EventMetric[];
};

type EventMetric = {
  task: string;
  scenario: string;
  eligible_events: number | null;
  detected_events: number | null;
  event_recall: number | null;
  median_lead_days: number | null;
  median_detection_delay_days: number | null;
  eligible_unreported_events: number | null;
  detected_while_unreported: number | null;
  unreported_detection_recall: number | null;
  median_days_before_report: number | null;
};

type Prediction = {
  world_id: string;
  scenario: string;
  unit_id: string;
  date: string;
  label: number | null;
  score: number | null;
  alert_f1: boolean;
  alert_target_recall: boolean;
};

type PredictionResponse = {
  synthetic: boolean;
  rows: Prediction[];
};

type InferenceResponse = {
  synthetic: boolean;
  source: "saved_model_on_generated_test_features";
  task: Task;
  world_id: string;
  scenario: string;
  unit_id: string;
  date: string;
  observation_time: string;
  model_name: string;
  run_id: string;
  score: number | null;
  validation_f1_threshold: number | null;
  alert_f1: boolean;
};

const API_BASE = (import.meta.env.VITE_ML_API_URL || "http://localhost:8000").replace(/\/$/, "");

function percent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(1)}%`;
}

function days(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "N/A" : `${value.toFixed(1)} days`;
}

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`The local ML API returned ${response.status}.`);
  return (await response.json()) as T;
}

export default function SimulationLab() {
  const [task, setTask] = useState<Task>("m1");
  const [refreshCount, setRefreshCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [inference, setInference] = useState<InferenceResponse | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [inferenceKey, setInferenceKey] = useState<string | null>(null);
  const inferenceController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    inferenceController.current?.abort();
    setInference(null);
    setInferenceError(null);
    setInferenceLoading(false);
    setInferenceKey(null);
    const load = async () => {
      setLoading(true);
      setError(null);
      setPredictionError(null);
      setPredictions([]);
      try {
        const nextStatus = await getJson<Status>("/api/ml/status", controller.signal);
        if (!nextStatus.synthetic) throw new Error("The API did not identify a synthetic run.");
        setStatus(nextStatus);
        if (!nextStatus.available) {
          setSummary(null);
          return;
        }

        const nextSummary = await getJson<Summary>("/api/ml/summary", controller.signal);
        if (!nextSummary.synthetic) throw new Error("The summary did not identify a synthetic run.");
        setSummary(nextSummary);
        try {
          const saved = await getJson<PredictionResponse>(
            `/api/ml/predictions?task=${task}&limit=20`,
            controller.signal,
          );
          if (!saved.synthetic) throw new Error("The predictions did not identify a synthetic run.");
          setPredictions(saved.rows);
        } catch (cause) {
          if (!controller.signal.aborted) {
            setPredictionError(cause instanceof Error ? cause.message : "Saved prediction rows could not be loaded.");
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setStatus(null);
          setSummary(null);
          setError(cause instanceof Error ? cause.message : "The local ML API is unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [task, refreshCount]);

  const testMetrics = (summary?.metrics ?? []).filter((metric) => metric.split.toLowerCase() === "test");
  const selectedMetrics = testMetrics.filter((metric) => metric.selected);
  const visibleMetrics = selectedMetrics.length > 0 ? selectedMetrics : testMetrics;

  const runSavedModel = async (row: Prediction) => {
    inferenceController.current?.abort();
    const controller = new AbortController();
    inferenceController.current = controller;
    const key = `${task}-${row.world_id}-${row.scenario}-${row.unit_id}-${row.date}`;
    setInferenceKey(key);
    setInference(null);
    setInferenceError(null);
    setInferenceLoading(true);
    const query = new URLSearchParams({
      task,
      world_id: row.world_id,
      scenario: row.scenario,
      unit_id: row.unit_id,
      date: row.date,
    });
    try {
      const result = await getJson<InferenceResponse>(`/api/ml/infer?${query.toString()}`, controller.signal);
      if (!result.synthetic || result.source !== "saved_model_on_generated_test_features") {
        throw new Error("The model response did not identify a synthetic test row.");
      }
      if (!controller.signal.aborted) setInference(result);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setInferenceError(cause instanceof Error ? cause.message : "The saved model could not recalculate this row.");
      }
    } finally {
      if (!controller.signal.aborted) setInferenceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F5] text-[#0D1F1A]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#0D7A4A] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Sanjeevani
          </Link>
          <button
            type="button"
            onClick={() => setRefreshCount((count) => count + 1)}
            className="inline-flex items-center gap-2 rounded-full border border-[#C7DDD3] bg-white px-4 py-2 text-sm font-semibold text-[#0D1F1A] hover:bg-[#EAF6EF]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh run
          </button>
        </div>

        <header className="rounded-3xl bg-[#0D1F1A] px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2ED8A3]/40 bg-[#2ED8A3]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A7F3D0]">
            <FlaskConical className="h-4 w-4" /> College ML experiment
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Simulation Lab</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75 sm:text-base">
            View saved results from the synthetic outbreak early warning and detection experiments.
            These scores come from simulated test worlds and do not describe a current district or a real health alert.
          </p>
          <p className="mt-5 text-xs text-white/60">Local run: {status?.run_id ?? "none available"}</p>
        </header>

        <section className="mt-6 rounded-2xl border border-[#DCE7E0] bg-white p-6" aria-live="polite">
          <h2 className="font-display text-xl font-bold">Run status</h2>
          {loading ? (
            <p className="mt-3 text-sm text-gray-600">Checking the local ML service…</p>
          ) : error ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">The local ML service is unavailable.</p>
              <p className="mt-1">{error}</p>
              <p className="mt-2">Start the Python service on this laptop and refresh this page.</p>
            </div>
          ) : !status?.available ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">No completed synthetic run was found.</p>
              <p className="mt-1">{status?.reason ?? "Generate and evaluate a run, then refresh this page."}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#0D7A4A]">Saved synthetic evaluation results are available for run <strong>{status.run_id}</strong>.</p>
          )}
        </section>

        {summary && (
          <>
            <section className="mt-6 rounded-2xl border border-[#DCE7E0] bg-white p-6">
              <h2 className="font-display text-xl font-bold">Held-out test metrics</h2>
              <p className="mt-1 text-sm text-gray-600">Average precision summarizes the precision-recall curve for each saved test scenario.</p>
              {visibleMetrics.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No test metrics were saved in this run.</p>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleMetrics.map((metric, index) => (
                    <div key={`${metric.task}-${metric.model}-${metric.scenario}-${index}`} className="rounded-xl border border-[#DCE7E0] bg-[#F9FBF9] p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#0D7A4A]">{metric.task} · {metric.scenario}</p>
                      <p className="mt-2 text-sm font-semibold">{metric.model}</p>
                      <p className="mt-4 font-display text-3xl font-bold">{percent(metric.average_precision)}</p>
                      <p className="mt-1 text-xs text-gray-600">Average precision · {metric.rows ?? "—"} rows · {metric.positives ?? "—"} positives</p>
                      <p className="mt-1 text-xs text-gray-500">Prevalence: {percent(metric.prevalence)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-6 rounded-2xl border border-[#DCE7E0] bg-white p-6">
              <h2 className="font-display text-xl font-bold">Event detection timing</h2>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Two clocks are shown: time relative to the simulated onset, and time relative to the simulated report.
                Detection before a report can still happen after onset.
              </p>
              {(summary.event_metrics ?? []).length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No event timing metrics were saved in this run.</p>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {summary.event_metrics.map((event, index) => {
                    const isEarlyWarning = event.task.toLowerCase() === "m1";
                    return (
                      <div key={`${event.task}-${event.scenario}-${index}`} className="rounded-xl border border-[#DCE7E0] bg-[#F9FBF9] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#0D7A4A]">
                          {event.task} · {event.scenario}
                        </p>
                        <p className="mt-2 text-xs text-gray-600">
                          {event.detected_events ?? "N/A"} of {event.eligible_events ?? "N/A"} eligible simulated events found
                        </p>
                        <p className="mt-3 font-display text-2xl font-bold">{percent(event.event_recall)}</p>
                        <p className="text-xs text-gray-600">Event recall</p>
                        <div className="mt-4 border-t border-[#DCE7E0] pt-3 text-sm">
                          <p className="font-semibold text-[#0D1F1A]">Onset clock</p>
                          <p className="mt-1 text-gray-600">
                            {isEarlyWarning ? "Median lead before onset" : "Median detection delay after onset"}: {days(isEarlyWarning ? event.median_lead_days : event.median_detection_delay_days)}
                          </p>
                        </div>
                        {!isEarlyWarning && (
                          <div className="mt-3 border-t border-[#DCE7E0] pt-3 text-sm">
                            <p className="font-semibold text-[#0D1F1A]">Reporting clock</p>
                            <p className="mt-1 text-gray-600">Unreported event recall: {percent(event.unreported_detection_recall)}</p>
                            <p className="mt-1 text-gray-600">Median lead before report: {days(event.median_days_before_report)}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {event.detected_while_unreported ?? "N/A"} of {event.eligible_unreported_events ?? "N/A"} eligible events detected while unreported
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-6 rounded-2xl border border-[#DCE7E0] bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold">Saved test prediction rows</h2>
                  <p className="mt-1 text-sm text-gray-600">The first 20 saved rows from simulated test worlds. These are evaluation records.</p>
                </div>
                <div className="flex rounded-full border border-[#C7DDD3] bg-[#F4F6F5] p-1" aria-label="Prediction task">
                  {(["m1", "m2"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTask(option)}
                      aria-pressed={task === option}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold ${task === option ? "bg-[#0D7A4A] text-white" : "text-[#0D1F1A]"}`}
                    >
                      {option === "m1" ? "M1 · early warning" : "M2 · detection"}
                    </button>
                  ))}
                </div>
              </div>
              {predictionError ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{predictionError}</p>
              ) : predictions.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">{loading ? "Loading saved rows…" : "No saved rows are available for this task."}</p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#DCE7E0] text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-3 font-semibold">Simulated unit</th>
                        <th className="px-3 py-3 font-semibold">Date</th>
                        <th className="px-3 py-3 font-semibold">Scenario</th>
                        <th className="px-3 py-3 font-semibold">Score</th>
                        <th className="px-3 py-3 font-semibold">Simulated outcome</th>
                        <th className="px-3 py-3 font-semibold">Saved model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((row, index) => (
                        <tr key={`${row.world_id}-${row.unit_id}-${row.date}-${index}`} className="border-b border-[#EEF2EF]">
                          <td className="px-3 py-3 font-medium">{row.unit_id}</td>
                          <td className="px-3 py-3">{row.date}</td>
                          <td className="px-3 py-3">{row.scenario}</td>
                          <td className="px-3 py-3 font-semibold tabular-nums">{percent(row.score)}</td>
                          <td className="px-3 py-3">{row.label === 1 ? "Yes" : row.label === 0 ? "No" : "Unknown"}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => void runSavedModel(row)}
                              disabled={inferenceLoading}
                              className="whitespace-nowrap rounded-full border border-[#0D7A4A] px-3 py-1.5 text-xs font-semibold text-[#0D7A4A] hover:bg-[#EAF6EF] disabled:cursor-wait disabled:opacity-50"
                            >
                              {inferenceLoading && inferenceKey === `${task}-${row.world_id}-${row.scenario}-${row.unit_id}-${row.date}` ? "Running…" : "Run saved model"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {inferenceError && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  Saved model inference is unavailable for this generated test row: {inferenceError}
                </p>
              )}
              {inference && (
                <div className="mt-4 rounded-xl border border-[#B8DCC8] bg-[#F1F8F4] p-4 text-sm">
                  <p className="font-semibold text-[#0D1F1A]">Recalculated with the saved {inference.model_name} model</p>
                  <p className="mt-1 text-gray-600">
                    Synthetic test row {inference.unit_id} · {inference.date} · {inference.scenario} · {inference.world_id}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-semibold text-[#0D1F1A]">
                    <span>Model score: {percent(inference.score)}</span>
                    <span>Validation F1 threshold: {percent(inference.validation_f1_threshold)}</span>
                    <span>Threshold flag: {inference.alert_f1 ? "Yes" : "No"}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Computed from saved generated test features at {inference.observation_time.replace(/_/g, " ")}; this is an experiment result.</p>
                </div>
              )}
            </section>
          </>
        )}

        <p className="mt-6 text-xs leading-5 text-gray-600">
          This page reads saved files from a local Python service and can recalculate a score for an existing generated test row.
          It does not use live surveillance, forecast a real district, collect patient information, or send alerts.
        </p>
      </div>
    </div>
  );
}
