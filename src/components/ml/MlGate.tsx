import type { ReactNode } from "react";
import { useMl } from "@/lib/ml/MlContext";

/** Renders its children once the weekly model board is loaded; otherwise a clear loading or error state. */
export function MlGate({ children }: { children: ReactNode }) {
  const { board, boardLoading, boardError, refresh } = useMl();

  if (boardLoading && !board) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500" aria-live="polite">
        Loading the saved synthetic model run…
      </div>
    );
  }
  if (!board) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950" role="alert">
        <p className="font-semibold">The model board could not be loaded.</p>
        <p className="mt-1">{boardError ?? "No saved synthetic run is available."}</p>
        <p className="mt-2 text-xs">
          Start the local service (<code className="font-mono">ml\.venv\Scripts\python.exe ml\service.py</code>) or run
          <code className="font-mono"> ml\run.ps1 -Mode Smoke</code> first.
        </p>
        <button type="button" onClick={refresh} className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold">
          Try again
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
