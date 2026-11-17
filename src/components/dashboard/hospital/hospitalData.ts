// ─── Hospital Dashboard: sample content ──────────────────────────────────────
// Only the persona, patient records and case entries are sample content. Area risk, weekly OPD / ASHA counts
// and water / weather signals come from the saved synthetic ML run (src/lib/ml). The model scores whole units
// (areas), never individual patients, and covers cholera and acute diarrheal disease (ADD) only.

export const HOSPITAL = {
  name: "Chengalpattu District Hospital",
  initials: "CD",
  email: "hospital@demo.example",
  phone: "+91 044-XXXX-XXXX",
  address: "District HQ, Chengalpattu Urban",
  /** The synthetic unit this hospital sits in (see ml/config/tamil_nadu_districts.yaml). */
  unitId: "TN_03",
  district: "Chengalpattu",
  state: "Tamil Nadu (synthetic unit)",
  headDoctor: "Dr. R. Sharma",
  activeSince: "January 2025",
};

// ─── Severity ─────────────────────────────────────────────────────────────────
export type Severity = "SEVERE" | "MODERATE" | "MILD" | "RECOVERED";

export const SEV_COLOR: Record<Severity, string> = {
  SEVERE: "#E53935",
  MODERATE: "#FB8C00",
  MILD: "#F59E0B",
  RECOVERED: "#43A047",
};
export const SEV_BG: Record<Severity, string> = {
  SEVERE: "#FFEBEE",
  MODERATE: "#FFF3E0",
  MILD: "#FFFDE7",
  RECOVERED: "#E8F5E9",
};
export const SEV_EMOJI: Record<Severity, string> = {
  SEVERE: "🔴",
  MODERATE: "🟠",
  MILD: "🟡",
  RECOVERED: "✅",
};

// ─── Case entries ─────────────────────────────────────────────────────────────
// The model only covers cholera and acute diarrheal disease; everything else is "Other (not modeled)".
export type CaseDisease = "Cholera (suspected)" | "Acute diarrheal disease" | "Other (not modeled)";
export const CASE_DISEASES: CaseDisease[] = ["Cholera (suspected)", "Acute diarrheal disease", "Other (not modeled)"];
export const MODELED_DISEASES: CaseDisease[] = ["Cholera (suspected)", "Acute diarrheal disease"];

export interface HospitalCase {
  id: string;
  patient: string;
  age: number;
  gender: string;
  disease: CaseDisease;
  symptoms: string[];
  severity: Severity;
  status: string;
  reported: string;
  unitId: string;
  notes: string;
}

export const ALL_CASES: HospitalCase[] = [
  { id: "CASE-067", patient: "Arun K.", age: 45, gender: "M", disease: "Cholera (suspected)", symptoms: ["Diarrhea", "Fever"], severity: "MODERATE", status: "Under Treatment", reported: "Mar 8", unitId: "TN_04", notes: "Responding to ORS. Watch for progression." },
  { id: "CASE-066", patient: "Sunita B.", age: 32, gender: "F", disease: "Cholera (suspected)", symptoms: ["Vomiting", "Dehydration"], severity: "SEVERE", status: "Hospitalized", reported: "Mar 7", unitId: "TN_03", notes: "IV fluids. Stool culture pending." },
  { id: "CASE-065", patient: "Manish G.", age: 67, gender: "M", disease: "Other (not modeled)", symptoms: ["Jaundice", "Fever"], severity: "SEVERE", status: "Hospitalized", reported: "Mar 7", unitId: "TN_02", notes: "Fever with jaundice. Outside the model's scope (not cholera or ADD)." },
  { id: "CASE-064", patient: "Walk-in", age: 8, gender: "F", disease: "Acute diarrheal disease", symptoms: ["Diarrhea"], severity: "MILD", status: "Recovered", reported: "Mar 6", unitId: "TN_03", notes: "ORS sufficient. Discharged." },
  { id: "CASE-063", patient: "Rajan N.", age: 52, gender: "M", disease: "Other (not modeled)", symptoms: ["Abdominal pain"], severity: "MODERATE", status: "Under Treatment", reported: "Mar 6", unitId: "TN_01", notes: "Blood culture ordered. Not a cholera or ADD presentation." },
  { id: "CASE-062", patient: "Anita S.", age: 29, gender: "F", disease: "Acute diarrheal disease", symptoms: ["Weakness", "Vomiting"], severity: "MILD", status: "Recovered", reported: "Mar 5", unitId: "TN_03", notes: "Recovered. Dietary advice given." },
  { id: "CASE-061", patient: "Biren D.", age: 41, gender: "M", disease: "Acute diarrheal disease", symptoms: ["Diarrhea", "Fever", "Weakness"], severity: "MODERATE", status: "Under Treatment", reported: "Mar 5", unitId: "TN_04", notes: "Stable. ORS and supportive care." },
  { id: "CASE-060", patient: "Rekha B.", age: 55, gender: "F", disease: "Cholera (suspected)", symptoms: ["Vomiting", "Dehydration", "Weakness"], severity: "SEVERE", status: "Hospitalized", reported: "Mar 4", unitId: "TN_03", notes: "Critical watch. Isolation precautions in place." },
  { id: "CASE-059", patient: "Walk-in", age: 22, gender: "M", disease: "Other (not modeled)", symptoms: ["Fever", "Headache"], severity: "MILD", status: "Under Treatment", reported: "Mar 4", unitId: "TN_08", notes: "Outpatient. Fever with headache; outside the model's scope." },
  { id: "CASE-058", patient: "Walk-in", age: 63, gender: "M", disease: "Other (not modeled)", symptoms: ["Jaundice", "Abdominal pain", "Fever"], severity: "SEVERE", status: "Hospitalized", reported: "Mar 3", unitId: "TN_02", notes: "Liver function tests elevated. Supportive care. Outside the model's scope." },
];

export const RECENT_CASES = ALL_CASES.slice(0, 6);

// ─── Patients ─────────────────────────────────────────────────────────────────
// The model works on whole units, not on individuals, so patients carry no personal risk score.
export const PATIENTS_DATA = [
  { id: "P-001", name: "Arun Kumar", age: 45, gender: "M", phone: "98540-11111", address: "Tambaram East", unitId: "TN_04", lastVisit: "Mar 8, 2026", history: "Hypertension. No known allergies.", email: "" },
  { id: "P-002", name: "Sunita Balan", age: 32, gender: "F", phone: "94351-22222", address: "Ward 12, Chengalpattu Urban", unitId: "TN_03", lastVisit: "Mar 7, 2026", history: "No significant history.", email: "" },
  { id: "P-003", name: "Manish Gopal", age: 67, gender: "M", phone: "70001-33333", address: "Guduvancheri Main Road", unitId: "TN_02", lastVisit: "Mar 7, 2026", history: "Diabetes Type 2. BP medication.", email: "" },
  { id: "P-004", name: "Dipika Das", age: 8, gender: "F", phone: "86001-44444", address: "Ward 4, Chengalpattu Urban", unitId: "TN_03", lastVisit: "Mar 6, 2026", history: "No significant history.", email: "" },
  { id: "P-005", name: "Rajan Nathan", age: 52, gender: "M", phone: "94010-55555", address: "Potheri", unitId: "TN_01", lastVisit: "Mar 5, 2026", history: "Seasonal allergies.", email: "" },
  { id: "P-006", name: "Anita Sharma", age: 29, gender: "F", phone: "98540-66666", address: "Ward 9, Chengalpattu Urban", unitId: "TN_03", lastVisit: "Mar 5, 2026", history: "No significant history.", email: "" },
  { id: "P-007", name: "Biren Dutta", age: 41, gender: "M", phone: "70099-77777", address: "Tambaram West", unitId: "TN_04", lastVisit: "Mar 4, 2026", history: "Asthma. Inhaler prescribed.", email: "" },
  { id: "P-008", name: "Rekha Baskaran", age: 55, gender: "F", phone: "86010-88888", address: "Ward 7, Chengalpattu Urban", unitId: "TN_03", lastVisit: "Mar 3, 2026", history: "Post-cardiac surgery (2022). On blood thinners.", email: "" },
  { id: "P-009", name: "Kamal Chandran", age: 38, gender: "M", phone: "98010-99999", address: "Kanchipuram Town", unitId: "TN_08", lastVisit: "Mar 2, 2026", history: "No significant history.", email: "" },
  { id: "P-010", name: "Priti Hari", age: 26, gender: "F", phone: "94020-11122", address: "Potheri", unitId: "TN_01", lastVisit: "Mar 1, 2026", history: "Iron deficiency anemia.", email: "" },
  { id: "P-011", name: "Dulal Sekar", age: 72, gender: "M", phone: "70020-33344", address: "Guduvancheri", unitId: "TN_02", lastVisit: "Feb 28, 2026", history: "COPD. Diabetes. Multiple medications.", email: "" },
  { id: "P-012", name: "Binita Devi", age: 21, gender: "F", phone: "86020-55566", address: "Ward 2, Chengalpattu Urban", unitId: "TN_03", lastVisit: "Feb 27, 2026", history: "No significant history.", email: "" },
];

// ─── Helpers for the sample-record breakdowns ────────────────────────────────
export const AGE_GROUPS = [
  { group: "0–18", min: 0, max: 18 },
  { group: "19–30", min: 19, max: 30 },
  { group: "31–45", min: 31, max: 45 },
  { group: "46–60", min: 46, max: 60 },
  { group: "60+", min: 61, max: 200 },
];

export function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}
