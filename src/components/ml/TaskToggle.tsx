import { TASK_META } from "@/lib/ml/risk";
import type { TaskId } from "@/lib/ml/types";

/** Switch between the two model questions: M1 early warning and M2 current detection. */
export function TaskToggle({ task, onChange }: { task: TaskId; onChange: (task: TaskId) => void }) {
  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1" role="group" aria-label="Model question">
      {(["m1", "m2"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={task === option}
          title={TASK_META[option].question}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            task === option ? "bg-[#0D1F1A] text-white" : "text-gray-600 hover:text-[#0D1F1A]"
          }`}
        >
          {TASK_META[option].short} · {TASK_META[option].name}
        </button>
      ))}
    </div>
  );
}
