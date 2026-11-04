import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Activity, AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  HOSP_STATS, ALERT_SUMMARY, CASE_TREND_DATA, RECENT_CASES,
  MAP_MARKERS, RISK_COLOR, RISK_BG, SEV_COLOR, SEV_BG, SEV_EMOJI,
  type RiskLevel,
} from "../hospitalData";

// ─── SVG Map ──────────────────────────────────────────────────────────────────
const MAP_BOUNDS = { minLat: 26.0, maxLat: 27.8, minLng: 91.5, maxLng: 95.2 };
function toXY(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * w;
  const y = h - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * h;
  return { x, y };
}

function RiskMap() {
  const [active, setActive] = useState<string | null>(null);
  const W = 560, H = 300;
  return (
    <div style={{ background: "linear-gradient(180deg,#EBF5F0,#D6EEE5)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
        {Array.from({ length: 7 }).map((_, i) => <line key={`v${i}`} x1={i * (W / 6)} y1={0} x2={i * (W / 6)} y2={H} stroke="#C8E6D4" strokeWidth="0.5" />)}
        {Array.from({ length: 5 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * (H / 4)} x2={W} y2={i * (H / 4)} stroke="#C8E6D4" strokeWidth="0.5" />)}
        {MAP_MARKERS.map((m) => {
          const { x, y } = toXY(m.lat, m.lng, W, H);
          const isActive = active === m.pincode;
          const isHospital = "isHospital" in m && m.isHospital;
          const color = isHospital ? "#1565C0" : RISK_COLOR[m.risk];
          return (
            <g key={m.pincode} onClick={() => setActive(isActive ? null : m.pincode)} style={{ cursor: "pointer" }}>
              {m.risk === "HIGH" && !isHospital && (
                <circle cx={x} cy={y} r={m.radius * 1.5} fill={color} opacity={0.07}>
                  <animate attributeName="r" values={`${m.radius};${m.radius * 1.9};${m.radius}`} dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.12;0;0.12" dur="2.5s" repeatCount="indefinite" />
                </circle>
              )}
              {isHospital && (
                <circle cx={x} cy={y} r={m.radius * 1.6} fill="#1565C0" opacity={0.08}>
                  <animate attributeName="r" values={`${m.radius * 1.2};${m.radius * 1.8};${m.radius * 1.2}`} dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={x} cy={y} r={isActive ? m.radius + 4 : m.radius}
                fill={isHospital ? "#1565C0" : color} opacity={0.75}
                stroke="white" strokeWidth={isHospital ? 3 : 2} style={{ transition: "all 0.2s" }} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="white" fontFamily="DM Sans,sans-serif">
                {isHospital ? "🏥" : ""}
              </text>
              <text x={x} y={y - m.radius - 5} textAnchor="middle" fontSize="8" fontFamily="DM Sans,sans-serif" fontWeight="700" fill={isHospital ? "#1565C0" : color}>
                {m.name}
              </text>
              {isActive && (
                <foreignObject x={Math.min(x - 75, W - 165)} y={Math.max(y - m.radius - 110, 4)} width="160" height="100">
                  <div style={{ background: "white", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: "10px 12px", fontSize: 10, border: `2px solid ${color}` }}>
                    <p style={{ fontFamily: "Fraunces,serif", fontWeight: 700, color: "#0D1F1A", marginBottom: 3 }}>{m.name} — {m.pincode}</p>
                    <p style={{ color, fontWeight: 700, marginBottom: 2 }}>Risk: {m.risk}</p>
                    <p style={{ color: "#6B7B74", fontFamily: "monospace", fontSize: 9 }}>TDS: {m.tds} ppm | pH: {m.ph}</p>
                    <p style={{ color: "#6B7B74" }}>Cases: {m.cases}</p>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
        {/* Legend */}
        <g transform={`translate(10, ${H - 68})`}>
          <rect x="-4" y="-4" width="140" height="64" rx="6" fill="white" opacity="0.9" />
          {[{ color: "#1565C0", label: "🏥 This Hospital" }, { color: "#E53935", label: "High Risk" }, { color: "#FB8C00", label: "Medium Risk" }, { color: "#43A047", label: "Low Risk" }].map((l, i) => (
            <g key={i} transform={`translate(4, ${i * 14})`}>
              <circle cx="5" cy="5" r="4" fill={l.color} opacity="0.8" />
              <text x="14" y="9" fontSize="8" fontFamily="DM Sans,sans-serif" fill="#374151">{l.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; name?: string | number; value?: string | number; color?: string }>;
  label?: string | number;
};

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-xs">
      <p className="font-bold text-[#0D1F1A] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-mono font-bold">{p.value}</span></p>
      ))}
    </div>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────
export default function HospDashSection() {
  const [chartTab, setChartTab] = useState<"week" | "month" | "quarter">("month");

  return (
    <div className="space-y-6">
      {/* 1 — Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Patients */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#EFF6FF" }}>
              <Users className="w-6 h-6" style={{ color: "#1565C0" }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Registered Patients</p>
              <div className="flex items-end gap-2 mt-0.5">
                <span className="font-display text-5xl font-bold leading-none" style={{ color: "#1565C0" }}>1,284</span>
              </div>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#EFF6FF", color: "#1565C0" }}>↑ +23 this month</span>
        </motion.div>

        {/* Card 2: Cases 30 Days */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#FFF3E0" }}>
              <Activity className="w-6 h-6" style={{ color: "#FB8C00" }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Water-Borne Cases Reported</p>
              <span className="font-display text-5xl font-bold leading-none" style={{ color: "#FB8C00" }}>67</span>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#FFF3E0", color: "#FB8C00" }}>↑ +12 vs last month</span>
        </motion.div>

        {/* Card 3: Active Alerts */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative" style={{ background: "#FFEBEE" }}>
              <AlertTriangle className="w-6 h-6" style={{ color: "#E53935" }} />
              <span className="absolute inset-0 rounded-2xl border-2 border-red-400 animate-ping opacity-30" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Active Risk Alerts in Vicinity</p>
              <span className="font-display text-5xl font-bold leading-none" style={{ color: "#E53935" }}>5</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-[#E53935]">🔴 2 High</span>
            <span className="text-[#FB8C00]">🟠 2 Med</span>
            <span className="text-[#43A047]">🟢 1 Low</span>
          </div>
        </motion.div>
      </div>

      {/* 2 — Map + Alert Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-5">
        {/* Map */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">City Health Risk Map</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-semibold">Live</span>
            </div>
          </div>
          <RiskMap />
        </motion.div>

        {/* Alert Summary */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Active Alerts</h3>
            <span className="w-7 h-7 rounded-full bg-red-100 text-[#E53935] text-xs font-bold flex items-center justify-center">5</span>
          </div>
          <div className="space-y-2.5">
            {ALERT_SUMMARY.map((a) => (
              <div key={a.pincode} className="flex items-center gap-3 p-3 rounded-xl border-l-4 transition-colors hover:bg-gray-50"
                style={{ borderLeftColor: RISK_COLOR[a.risk], background: RISK_BG[a.risk] + "80" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0D1F1A]">{a.pincode}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: RISK_BG[a.risk], color: RISK_COLOR[a.risk] }}>{a.risk}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{a.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold text-[#0D1F1A]">{a.cases}</p>
                  <p className="text-[10px] text-gray-400">cases</p>
                </div>
                <p className="text-[10px] text-gray-400 shrink-0">{a.ago}</p>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full text-center text-xs font-semibold text-[#2ED8A3] hover:text-[#0D7A4A] transition-colors">View All Alerts →</button>
        </motion.div>
      </div>

      {/* 3 — Case Trend Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Case Reports — Last 30 Days</h3>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(["week", "month", "quarter"] as const).map(t => (
              <button key={t} onClick={() => setChartTab(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${chartTab === t ? "bg-white text-[#0D1F1A] shadow-sm" : "text-gray-500"}`}>{t}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={CASE_TREND_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "DM Sans" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fontFamily: "monospace" }} tickLine={false} axisLine={false} width={28} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, fontFamily: "DM Sans" }} />
            <Line type="monotone" dataKey="total" name="Total Cases" stroke="#1565C0" strokeWidth={2.5} dot={{ r: 4, fill: "#1565C0" }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="severe" name="Severe Cases" stroke="#E53935" strokeWidth={2.5} dot={{ r: 4, fill: "#E53935" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-[#FFF8E7] rounded-xl px-4 py-2.5 border border-yellow-100">
          <span>⚠️</span>
          <span>Peak: <strong>Mar 7 (18 cases)</strong> · Disease: Suspected Cholera outbreak</span>
        </div>
      </motion.div>

      {/* 4 — Recent Cases */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Recently Reported Cases</h3>
          <button className="px-4 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "#E53935" }}>+ Report New Case</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RECENT_CASES.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: SEV_BG[c.severity] }}>
                <span className="font-mono text-xs font-bold text-[#0D1F1A]">{c.id}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: SEV_COLOR[c.severity], background: "white" }}>
                  {SEV_EMOJI[c.severity]} {c.severity}
                </span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-gray-500 font-medium">{c.gender}, {c.age} · {c.disease}</p>
                <div className="flex flex-wrap gap-1">
                  {c.symptoms.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFEBEE] text-[#E53935]">{s}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: SEV_BG[c.severity], color: SEV_COLOR[c.severity] }}>{c.status}</span>
                  <span className="text-[10px] text-gray-400">{c.date}, 2026</span>
                </div>
                <button className="text-xs font-semibold text-[#2ED8A3] hover:text-[#0D7A4A] transition-colors">View Full Case →</button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
