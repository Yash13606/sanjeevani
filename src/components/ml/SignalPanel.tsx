import { STATUS_COLOR, STATUS_LABEL, signalRows } from "@/lib/ml/risk";
import type { Signals } from "@/lib/ml/types";

/** The water, lab and weather inputs the model saw for one unit-week. */
export function SignalPanel({ signals, compact = false }: { signals: Signals; compact?: boolean }) {
  const rows = signalRows(signals);
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-500">{row.label}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#0D1F1A]">{row.value}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: STATUS_COLOR[row.status], background: `${STATUS_COLOR[row.status]}20` }}
              >
                {STATUS_LABEL[row.status]}
              </span>
            </span>
          </div>
          {row.note && !compact && <p className="mt-0.5 text-[10px] text-gray-400">{row.note}</p>}
        </div>
      ))}
    </div>
  );
}
