// ─── ASHA Worker Dashboard: sample content ───────────────────────────────────
// Only the persona, member list, case-entry demos, surveys and articles are sample content.
// Area risk, weekly case counts and water/weather signals come from the saved synthetic ML run (src/lib/ml).

export const ASHA_WORKER = {
  name: "Priya Sharma",
  initials: "PS",
  email: "priya.sharma@asha.gov.in",
  phone: "+91 94351-XXXXX",
  address: "PHC Compound, Potheri, Chengalpattu",
  /** The synthetic unit this ASHA worker covers (see ml/config/tamil_nadu_districts.yaml). */
  unitId: "TN_01",
  district: "Chengalpattu",
  state: "Tamil Nadu (synthetic unit)",
  servingSince: "March 2024",
};

// ─── Activity Feed ────────────────────────────────────────────────────────────
export const ACTIVITY_FEED = [
  { id: 1, icon: "📋", text: "Water Quality Survey received 5 new responses", time: "6h ago", color: "#1565C0" },
  { id: 2, icon: "🦠", text: "PAT-002 case severity updated to Severe", time: "4h ago", color: "#E53935" },
  { id: 3, icon: "📰", text: "Your article published: Cholera Prevention Tips", time: "1d ago", color: "#0D7A4A" },
  { id: 4, icon: "✅", text: "PAT-003 marked as Recovered", time: "1d ago", color: "#43A047" },
  { id: 5, icon: "👥", text: "3 new citizens registered in your coverage area", time: "2d ago", color: "#1565C0" },
];

// ─── Community Members ────────────────────────────────────────────────────────
// The model works on whole units, not on individuals, so members have no personal risk score.
export const COMMUNITY_MEMBERS = [
  { id: 1, name: "Karthik Raja", age: 34, gender: "M", phone: "98540-11111", address: "Potheri, Chengalpattu", reports: 2, surveys: 1, lastActive: "Mar 8, 2026" },
  { id: 2, name: "Meenakshi Sundaram", age: 28, gender: "F", phone: "94351-22222", address: "SRM Nagar, Potheri", reports: 3, surveys: 2, lastActive: "Mar 9, 2026" },
  { id: 3, name: "Bala Murugan", age: 45, gender: "M", phone: "70001-33333", address: "Kattankulathur", reports: 0, surveys: 1, lastActive: "Mar 7, 2026" },
  { id: 4, name: "Anitha Selvam", age: 19, gender: "F", phone: "86001-44444", address: "Potheri Main Road", reports: 1, surveys: 0, lastActive: "Mar 6, 2026" },
  { id: 5, name: "Dinesh Kumar", age: 52, gender: "M", phone: "98540-55555", address: "Nandivaram", reports: 4, surveys: 2, lastActive: "Mar 9, 2026" },
  { id: 6, name: "Revathi Nair", age: 31, gender: "F", phone: "94010-66666", address: "Guduvancheri Road", reports: 1, surveys: 1, lastActive: "Mar 8, 2026" },
  { id: 7, name: "Sanjay Nathan", age: 67, gender: "M", phone: "70099-77777", address: "Potheri, Chengalpattu", reports: 5, surveys: 0, lastActive: "Mar 7, 2026" },
  { id: 8, name: "Poornima Devi", age: 23, gender: "F", phone: "86010-88888", address: "Kattankulathur", reports: 0, surveys: 2, lastActive: "Mar 5, 2026" },
  { id: 9, name: "Hari Prasad", age: 41, gender: "M", phone: "98010-99999", address: "SRM Nagar, Potheri", reports: 2, surveys: 1, lastActive: "Mar 8, 2026" },
  { id: 10, name: "Lakshmi Priya", age: 55, gender: "F", phone: "70020-11122", address: "Nandivaram", reports: 3, surveys: 0, lastActive: "Mar 9, 2026" },
  { id: 11, name: "Pradeep Varma", age: 38, gender: "M", phone: "94020-33344", address: "Guduvancheri Road", reports: 1, surveys: 2, lastActive: "Mar 4, 2026" },
  { id: 12, name: "Rima Chandran", age: 26, gender: "F", phone: "86020-55566", address: "Potheri Main Road", reports: 0, surveys: 1, lastActive: "Mar 3, 2026" },
];

// ─── Cases ────────────────────────────────────────────────────────────────────
// Individual case entries are an operational demo. The model only covers cholera and acute diarrheal
// disease (ADD); other conditions are kept as "Other (not modeled)".
export type Severity = "SEVERE" | "MODERATE" | "MILD" | "RECOVERED";
export type CaseDisease = "Cholera (suspected)" | "Acute diarrheal disease" | "Other (not modeled)";

export const CASES_DATA: {
  id: string; patient: string; age: number; gender: string; symptoms: string[]; severity: Severity;
  status: string; reported: string; disease: CaseDisease; unitId: string; notes: string;
}[] = [
  { id: "PAT-001", patient: "Karthik R.", age: 34, gender: "M", symptoms: ["Diarrhea", "Fever"], severity: "MODERATE", status: "Under Treatment", reported: "Mar 8", disease: "Acute diarrheal disease", unitId: "TN_01", notes: "Patient responding to ORS therapy." },
  { id: "PAT-002", patient: "Anonymous", age: 12, gender: "M", symptoms: ["Vomiting", "Weakness", "Dehydration"], severity: "SEVERE", status: "Hospitalized", reported: "Mar 7", disease: "Cholera (suspected)", unitId: "TN_01", notes: "Admitted to the district hospital. IV fluids administered." },
  { id: "PAT-003", patient: "Meenakshi S.", age: 28, gender: "F", symptoms: ["Diarrhea"], severity: "RECOVERED", status: "Recovered", reported: "Mar 6", disease: "Acute diarrheal disease", unitId: "TN_01", notes: "Recovered after 2 days of ORS." },
  { id: "PAT-004", patient: "Anonymous", age: 67, gender: "M", symptoms: ["Fever", "Jaundice"], severity: "SEVERE", status: "Under Treatment", reported: "Mar 6", disease: "Other (not modeled)", unitId: "TN_02", notes: "Referred to district hospital. Not a cholera or ADD presentation, so outside the model's scope." },
  { id: "PAT-005", patient: "Sanjay N.", age: 52, gender: "M", symptoms: ["Vomiting"], severity: "RECOVERED", status: "Recovered", reported: "Mar 5", disease: "Acute diarrheal disease", unitId: "TN_01", notes: "ORS sufficient. Recovered in 1 day." },
  { id: "PAT-006", patient: "Anonymous", age: 8, gender: "F", symptoms: ["Diarrhea", "Fever"], severity: "MODERATE", status: "Under Treatment", reported: "Mar 5", disease: "Acute diarrheal disease", unitId: "TN_01", notes: "Child patient — monitoring closely." },
  { id: "PAT-007", patient: "Poornima D.", age: 23, gender: "F", symptoms: ["Weakness"], severity: "RECOVERED", status: "Recovered", reported: "Mar 4", disease: "Other (not modeled)", unitId: "TN_08", notes: "Weakness resolved. Fatigue from dehydration." },
  { id: "PAT-008", patient: "Anonymous", age: 45, gender: "M", symptoms: ["Cholera suspected"], severity: "SEVERE", status: "Hospitalized", reported: "Mar 4", disease: "Cholera (suspected)", unitId: "TN_03", notes: "Rapid cholera test positive. Isolated ward." },
  { id: "PAT-009", patient: "Bala M.", age: 41, gender: "M", symptoms: ["Abdominal pain"], severity: "MODERATE", status: "Under Treatment", reported: "Mar 3", disease: "Other (not modeled)", unitId: "TN_01", notes: "Ultrasound booked. On supportive care." },
  { id: "PAT-010", patient: "Anonymous", age: 19, gender: "F", symptoms: ["Diarrhea"], severity: "RECOVERED", status: "Recovered", reported: "Mar 2", disease: "Acute diarrheal disease", unitId: "TN_04", notes: "Recovered fully. Counseled on hygiene." },
];

// ─── Surveys ──────────────────────────────────────────────────────────────────
export const SURVEYS_DATA = [
  {
    id: "SRV-001",
    status: "active" as const,
    title: "Water Quality Feedback Survey",
    desc: "Understanding water issues in your coverage area",
    target: "TN_01",
    responses: 47,
    maxResponses: 100,
    startDate: "Mar 1",
    closeDate: "Mar 15",
    questions: 5,
  },
  {
    id: "SRV-002",
    status: "active" as const,
    title: "Community Health Assessment Q1 2026",
    desc: "Quarterly health assessment for the Chengalpattu units",
    target: "TN_01, TN_02",
    responses: 23,
    maxResponses: 100,
    startDate: "Mar 5",
    closeDate: "Mar 20",
    questions: 8,
  },
  {
    id: "SRV-003",
    status: "closed" as const,
    title: "Monthly Symptom Tracker — February",
    desc: "Monthly household symptom tracking survey",
    target: "TN_01",
    responses: 89,
    maxResponses: 100,
    startDate: "Feb 1",
    closeDate: "Feb 28",
    questions: 6,
  },
  {
    id: "SRV-004",
    status: "closed" as const,
    title: "Water Source Mapping Survey",
    desc: "Mapping water sources across coverage area",
    target: "TN_01, TN_03, TN_04",
    responses: 64,
    maxResponses: 80,
    startDate: "Jan 20",
    closeDate: "Feb 15",
    questions: 4,
  },
];

// Survey results mock
export const SURVEY_RESULTS = {
  "SRV-001": {
    totalResponses: 47,
    completionRate: 88,
    questions: [
      { text: "How would you rate your tap water quality?", type: "rating", data: [2, 5, 10, 18, 12] },
      { text: "Have you experienced any water-borne symptoms this week?", type: "yesno", yes: 34, no: 13 },
      { text: "What is your primary water source?", type: "mcq", options: ["Tap", "River", "Well", "Tanker"], values: [28, 8, 5, 6] },
    ],
  },
};

// ─── Articles ─────────────────────────────────────────────────────────────────
export const ARTICLES_DATA = [
  {
    id: "ART-001",
    status: "published" as const,
    title: "How to Purify Water at Home: A Complete Guide",
    tags: ["Prevention", "Water Safety"],
    excerpt: "Safe drinking water is your first defense against water-borne diseases. Learn these simple steps to purify water at home with or without equipment.",
    author: "Priya Sharma",
    date: "Mar 8, 2026",
    views: 234,
    comments: 12,
  },
  {
    id: "ART-002",
    status: "published" as const,
    title: "5 Early Signs of Cholera You Must Not Ignore",
    tags: ["Cholera", "Emergency"],
    excerpt: "Cholera can escalate within hours. These 5 warning signs can help you act fast and prevent fatalities in your community.",
    author: "Priya Sharma",
    date: "Mar 5, 2026",
    views: 891,
    comments: 34,
  },
  {
    id: "ART-003",
    status: "draft" as const,
    title: "Monsoon Season Water Safety Guidelines",
    tags: ["Prevention", "Hygiene"],
    excerpt: "Monsoons bring risks of flood-contaminated water. Prepare your household with these evidence-based safety guidelines.",
    author: "Priya Sharma",
    date: "Mar 3, 2026",
    views: 0,
    comments: 0,
  },
  {
    id: "ART-004",
    status: "published" as const,
    title: "Reading the Weekly Review List: A Guide for ASHA Workers",
    tags: ["Community"],
    excerpt: "How the Sanjeevani research model ranks units for review each week, what the Review and Watch tiers mean, and why a score is a prompt to look closer, not a diagnosis.",
    author: "Priya Sharma",
    date: "Feb 28, 2026",
    views: 456,
    comments: 19,
  },
];

// ─── Case severity colours ────────────────────────────────────────────────────
export const SEV_COLOR: Record<Severity, string> = {
  SEVERE: "#E53935",
  MODERATE: "#FB8C00",
  MILD: "#FDD835",
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
