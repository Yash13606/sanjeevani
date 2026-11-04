import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  DISEASE_PIE, WEEKLY_BAR, AGE_BAR, PINCODE_TABLE, RISK_COLOR, RISK_BG,
} from "../hospitalData";

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

const ANALYTICS = [
  { label: "Cases Reported", value: 67, delta: "+12%", deltaUp: true, color: "#E53935" },
  { label: "Patients Added", value: 23, delta: "+8%", deltaUp: true, color: "#1565C0" },
  { label: "Severe Cases", value: 8, delta: "+2 vs prev", deltaUp: false, color: "#FB8C00" },
  { label: "Recovery Rate", value: "76%", delta: "+4%", deltaUp: true, color: "#43A047" },
];

export default function HospReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Analytics & Reports</h2>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          📄 Download Report
        </button>
      </div>

      {/* Date range */}
      <div className="flex gap-1.5">
        {["This Week", "This Month", "Last 3 Months", "Custom"].map((tab, i) => (
          <button key={tab} className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${i === 1 ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>{tab}</button>
        ))}
      </div>

      {/* Analytics mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ANALYTICS.map(a => (
          <motion.div key={a.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="font-display text-3xl font-bold" style={{ color: a.color }}>{a.value}</p>
            <p className="text-xs text-gray-500 mt-1">{a.label}</p>
            <span className={`text-[10px] font-bold mt-2 inline-block px-2 py-0.5 rounded-full ${a.deltaUp ? "text-[#43A047] bg-[#E8F5E9]" : "text-[#E53935] bg-[#FFEBEE]"}`}>
              {a.deltaUp ? "↑" : "→"} {a.delta}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Chart row: Pie + Weekly Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Disease Pie */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-display text-base font-bold text-[#0D1F1A] mb-4">Disease Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={DISEASE_PIE} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {DISEASE_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, fontFamily: "DM Sans" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Weekly Bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-display text-base font-bold text-[#0D1F1A] mb-4">Weekly Case Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={WEEKLY_BAR} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: "monospace" }} tickLine={false} axisLine={false} width={24} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="severe" name="Severe" fill="#E53935" radius={[3, 3, 0, 0]} />
              <Bar dataKey="moderate" name="Moderate" fill="#FB8C00" radius={[3, 3, 0, 0]} />
              <Bar dataKey="mild" name="Mild" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Age distribution — horizontal bar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-display text-base font-bold text-[#0D1F1A] mb-5">Cases by Age Group</h3>
        <div className="space-y-3">
          {AGE_BAR.map(ab => {
            const max = Math.max(...AGE_BAR.map(a => a.cases));
            return (
              <div key={ab.group} className="flex items-center gap-4">
                <span className="text-xs font-mono font-bold text-gray-500 w-12 text-right">{ab.group}</span>
                <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(ab.cases / max) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full rounded-full flex items-center px-3" style={{ background: "linear-gradient(90deg,#1565C0,#42A5F5)" }}>
                    <span className="text-white text-[10px] font-bold">{ab.cases}</span>
                  </motion.div>
                </div>
                <span className="text-xs text-gray-400 font-mono w-10">{ab.cases} cases</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Pincode risk table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-display text-base font-bold text-[#0D1F1A]">Cases by Location</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider">
                {["Pincode", "Area", "Total Cases", "Severe", "Moderate", "Mild", "Risk Level"].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PINCODE_TABLE.map(r => (
                <tr key={r.pincode} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs font-bold text-[#0D1F1A]">{r.pincode}</td>
                  <td className="px-5 py-3 font-medium text-[#0D1F1A]">{r.area}</td>
                  <td className="px-5 py-3 font-mono font-bold text-[#0D1F1A]">{r.cases}</td>
                  <td className="px-5 py-3 font-mono text-[#E53935] font-semibold">{r.severe}</td>
                  <td className="px-5 py-3 font-mono text-[#FB8C00] font-semibold">{r.moderate}</td>
                  <td className="px-5 py-3 font-mono text-[#F59E0B] font-semibold">{r.mild}</td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: RISK_COLOR[r.risk], background: RISK_BG[r.risk] }}>
                      {r.risk === "HIGH" ? "🔴" : r.risk === "MEDIUM" ? "🟠" : "🟢"} {r.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
