import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import {
  Activity, AlertTriangle, Award, Calendar, CheckCircle2, ChevronRight,
  Clock, DollarSign, Flame, Gauge, Layers, Lock, Plus, RefreshCw, Search,
  Shield, Star, Target, TrendingUp, Trophy, Zap, XCircle, Trash2, Save,
} from "lucide-react";

/* ============================================================================
   FHD PRODUCTION COMMAND CENTER
   Personal production tracker — Globe Life Family Heritage Division
   Single file. window.storage only. Tailwind core utilities only.
   ========================================================================== */

/* ---------------------------------------------------------------- constants */

const NAP_PER_APP = 243; // agent's trailing average — converts $ goals into app counts
const MS_DAY = 86400000;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const K = {
  weeks: "fhd:weeks",
  profile: "fhd:profile",
  eagles: "fhd:eagles",
  conservation: "fhd:conservation",
  activity: "fhd:activity",
};

/* ------------------------------------------------------------ date helpers */

const D = (y, m, day) => new Date(y, m - 1, day);
const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
const addDays = (dt, n) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / MS_DAY);
const fmtShort = (dt) => `${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}`;
const fmtLong = (dt) => `${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
const isoDate = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const parseISO = (s) => {
  if (!s) return null;
  const p = String(s).split("-").map(Number);
  if (p.length < 3 || p.some(isNaN)) return null;
  return new Date(p[0], p[1] - 1, p[2]);
};

/* ------------------------------------------------------- FHD sales calendar */
/* Week label = the Monday the week begins; the week ends the following Sunday.
   Anchor: sales week 17 of 2026 begins Monday April 20, 2026.               */

const WEEK_ANCHOR_NUM = 17;
const WEEK_ANCHOR_DATE = D(2026, 4, 20);

const weekStart = (w) => addDays(WEEK_ANCHOR_DATE, (w - WEEK_ANCHOR_NUM) * 7);
const weekEnd = (w) => addDays(weekStart(w), 6);
const weekRange = (w) => `${fmtShort(weekStart(w))} – ${fmtShort(weekEnd(w))}`;
const weekForDate = (dt) => WEEK_ANCHOR_NUM + Math.floor(daysBetween(WEEK_ANCHOR_DATE, dt) / 7);

const seq = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };

// Aug–Dec 2026 are the published FHD sales months. Apr–Jul are derived from the
// same Monday-anchored pattern so historical months roll up correctly.
const SALES_MONTHS = [
  { key: "2026-04", label: "April 2026", weeks: seq(14, 17), quarter: "Q2", derived: true },
  { key: "2026-05", label: "May 2026", weeks: seq(18, 21), quarter: "Q2", derived: true },
  { key: "2026-06", label: "June 2026", weeks: seq(22, 26), quarter: "Q2", derived: true },
  { key: "2026-07", label: "July 2026", weeks: seq(27, 30), quarter: "Q3", derived: true },
  { key: "2026-08", label: "August 2026", weeks: seq(31, 34), quarter: "Q3" },
  { key: "2026-09", label: "September 2026", weeks: seq(35, 39), quarter: "Q3" },
  { key: "2026-10", label: "October 2026", weeks: seq(40, 43), quarter: "Q4" },
  { key: "2026-11", label: "November 2026", weeks: seq(44, 48), quarter: "Q4" },
  { key: "2026-12", label: "December 2026", weeks: seq(49, 52), quarter: "Q4" },
];

const monthStart = (m) => weekStart(m.weeks[0]);
const monthEnd = (m) => weekEnd(m.weeks[m.weeks.length - 1]);
const monthRange = (m) => `${fmtShort(monthStart(m))} – ${fmtShort(monthEnd(m))}`;
const minWeeksRequired = (m) => (m.weeks.length >= 5 ? 4 : 3);
const monthForWeek = (w) => SALES_MONTHS.find((m) => m.weeks.includes(w)) || null;
const monthForDate = (dt) => monthForWeek(weekForDate(dt));

const QUARTERS = [
  { key: "Q3", label: "Q3 2026", months: ["2026-07", "2026-08", "2026-09"] },
  { key: "Q4", label: "Q4 2026", months: ["2026-10", "2026-11", "2026-12"] },
];

/* -------------------------------------------------------------- rule tables */

const BONUS_TIERS = [
  { nap: 100000, bonus: 6000 },
  { nap: 90000, bonus: 5000 },
  { nap: 80000, bonus: 4500 },
  { nap: 70000, bonus: 4000 },
  { nap: 60000, bonus: 3500 },
  { nap: 50000, bonus: 3000 },
  { nap: 40000, bonus: 2000 },
  { nap: 30000, bonus: 1500 },
  { nap: 20000, bonus: 750 },
  { nap: 15000, bonus: 375 },
];
const NEW_AGENT_TIER = { nap: 10000, bonus: 250 };

const STRING_CLUB = [
  { name: "Green Out", nap: 5000 },
  { name: "Globe Week", nap: 7500 },
  { name: "Flight of the Eagle", nap: 10000 },
  { name: "Leaders Eagle", nap: 15000 },
  { name: "Heritage Eagle", nap: 20000 },
  { name: "Soaring Eagle", nap: 25000 },
];

const GLU_SESSIONS = [
  {
    id: "glu-aug-2026",
    label: "GLU 101 — Aug 19–21, 2026",
    session: [D(2026, 8, 19), D(2026, 8, 21)],
    qual: [D(2026, 4, 6), D(2026, 7, 19)],
    reg: null,
    regClosed: true,
  },
  {
    id: "glu-nov-2026",
    label: "GLU 101 — Nov 4–6, 2026",
    session: [D(2026, 11, 4), D(2026, 11, 6)],
    qual: [D(2026, 7, 22), D(2026, 10, 4)],
    reg: [D(2026, 9, 14), D(2026, 10, 16)],
    regClosed: false,
  },
];

const GLU_GREENOUT_TARGET = 3;
const GLU_NAP_TARGET = 30000;
const GREEN_OUT = 5000;
const QUARTERLY_STOCK_NAP = 20000;
const LICENSE_REIMB_NAP = 50000;
const AT_FLOOR = 85;
const AT_CEILING = 120;
const EAGLE_WINDOW_DAYS = 14;
const EAGLE_BONUS = 100;

const AWARD_CLUBS = [
  { name: "Chairman's Club", range: "Top 10", from: 1, to: 10, pace: 300000 },
  { name: "President's Club", range: "11–30", from: 11, to: 30, pace: 240000 },
  { name: "Achiever's Club", range: "31–60", from: 31, to: 60, pace: 170000 },
  { name: "Leader's Club", range: "61–150", from: 61, to: 150, pace: 110000 },
];

const MIDYEAR_LEVELS = [
  { level: "L1", nap: 50000 },
  { level: "L2", nap: 80000 },
  { level: "L3", nap: 100000 },
  { level: "L4", nap: 130000 },
];

/* --------------------------------------------------------- rule engine math */

const bonusTierFor = (nap, newAgent) => {
  for (const t of BONUS_TIERS) if (nap >= t.nap) return t;
  if (newAgent && nap >= NEW_AGENT_TIER.nap) return NEW_AGENT_TIER;
  return { nap: 0, bonus: 0 };
};

const nextBonusTier = (nap, newAgent) => {
  const ladder = newAgent ? [NEW_AGENT_TIER, ...BONUS_TIERS].sort((a, b) => a.nap - b.nap) : [...BONUS_TIERS].sort((a, b) => a.nap - b.nap);
  return ladder.find((t) => nap < t.nap) || null;
};

// 120%+ -> 120. 85–119.99 -> the ratio itself. Below 85 -> 0 (everything zeroes).
const rawMultiplier = (ratio) => {
  if (ratio >= AT_CEILING) return AT_CEILING;
  if (ratio >= AT_FLOOR) return ratio;
  return 0;
};

const stringLevelFor = (nap) => {
  let cur = null;
  for (const l of STRING_CLUB) if (nap >= l.nap) cur = l;
  return cur;
};
const nextStringLevel = (nap) => STRING_CLUB.find((l) => nap < l.nap) || null;

const money = (n, dec = 0) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return `${v < 0 ? "-" : ""}$${s}`;
};
const pct = (n, dec = 0) => `${(Number(n) || 0).toFixed(dec)}%`;
const clampPct = (n) => Math.max(0, Math.min(100, Number(n) || 0));
const appsFor = (dollars) => Math.max(0, Math.ceil((Number(dollars) || 0) / NAP_PER_APP));

/* -------------------------------------------------------------- seed data */

const SEED_WEEKS = [
  { week: 17, nap: 1146, gross: null, netApps: 4, grossApps: null, notes: "First full week of new business.", unconfirmed: false },
  { week: 18, nap: 5584, gross: null, netApps: 25, grossApps: null, notes: "PR week. Green Out. 25 apps — proven ceiling.", unconfirmed: false },
  { week: 19, nap: 2506, gross: null, netApps: 11, grossApps: null, notes: "", unconfirmed: false },
  { week: 20, nap: 1751, gross: null, netApps: 7, grossApps: null, notes: "", unconfirmed: false },
  { week: 21, nap: -625, gross: null, netApps: -3, grossApps: null, notes: "Chargeback week.", unconfirmed: false },
  { week: 22, nap: -526, gross: null, netApps: -4, grossApps: null, notes: "Chargeback week.", unconfirmed: false },
  { week: 23, nap: 211, gross: null, netApps: 1, grossApps: null, notes: "", unconfirmed: false },
  { week: 24, nap: 147, gross: null, netApps: 1, grossApps: null, notes: "", unconfirmed: false },
  { week: 25, nap: 0, gross: null, netApps: 0, grossApps: null, notes: "", unconfirmed: false },
  { week: 26, nap: 0, gross: null, netApps: 0, grossApps: null, notes: "", unconfirmed: false },
  { week: 27, nap: 0, gross: null, netApps: 0, grossApps: null, notes: "", unconfirmed: false },
  { week: 28, nap: 0, gross: null, netApps: 0, grossApps: null, notes: "", unconfirmed: false },
  { week: 29, nap: 0, gross: null, netApps: 0, grossApps: null, notes: "", unconfirmed: false },
  { week: 30, nap: 0, gross: null, netApps: 0, grossApps: null, notes: "July sales month closed at $0.00.", unconfirmed: false },
  { week: 31, nap: 0, gross: null, netApps: 0, grossApps: null, notes: "Unconfirmed — awaiting Agent Register.", unconfirmed: true },
];

const SEED_PROFILE = {
  name: "Jesus Guerra Cardozo",
  agentNumber: "80710",
  director: "Cynthia Villard",
  directorNumber: "71114",
  firstBusinessDate: "2026-04-21",
  newAgentProtectionEnds: "2026-10-21",
  productMix: "Spanish InjurCare Plus Series 6 · mode 12 · ~$16–48/mo premiums",
  atRatio: 99.6,
  atHistory: [
    { month: "2026-04", label: "Apr 26", ratio: 111.8 },
    { month: "2026-05", label: "May 26", ratio: 97.3 },
    { month: "2026-06", label: "Current", ratio: 99.6 },
  ],
  cai12mo: 27.7,
  cai12moGross: 12427,
  cai12moNet: 8981,
  ytdGross: 13640,
  rank: 1230,
  prWeek: { nap: 5584, week: 18 },
  prMonth: { nap: 9216, monthKey: "2026-05" },
};

const SEED_CONSERVATION = [
  {
    id: "cons-2585687",
    policy: "2585687-1",
    name: "Marrufo Rodriguez, Janio",
    reason: "TERMINATED · BRI-NSF",
    monthly: 23.9,
    status: "Open",
    logged: "2026-07-27",
  },
  {
    id: "cons-2584071",
    policy: "2584071-1",
    name: "Fernandez Vivas, Daniel",
    reason: "Bank return · insufficient funds",
    monthly: 16.7,
    status: "Open",
    logged: "2026-07-27",
  },
];

const SEED_EAGLES = [];
const SEED_ACTIVITY = [];

/* --------------------------------------------------------------- storage */
/* The dashboard runs in two different places, so it saves to whichever store
   that place actually gives it, in priority order:
     1. window.storage — inside a Claude conversation artifact
     2. localStorage   — a published page or any plain browser
     3. memory         — neither is reachable; the session still works
   Every call is wrapped in try/catch, and the active driver is shown in the
   header so it is never a mystery whether the log is being kept.            */

const hasStorage = () => typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

const memoryStore = {};

const localOk = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem("fhd:__probe", "1");
    window.localStorage.removeItem("fhd:__probe");
    return true;
  } catch (e) {
    return false;
  }
};

let DRIVER = null;
const storageDriver = () => {
  if (DRIVER) return DRIVER;
  DRIVER = hasStorage() ? "claude" : localOk() ? "local" : "memory";
  return DRIVER;
};

const DRIVER_LABEL = {
  claude: { text: "Saved to Claude storage", tone: "blue" },
  local: { text: "Saved on this device", tone: "green" },
  memory: { text: "Session only — export a backup", tone: "amber" },
};

async function storeGet(key, fallback) {
  try {
    const d = storageDriver();
    if (d === "claude") {
      const v = await window.storage.get(key, false);
      return v === undefined || v === null ? fallback : v;
    }
    if (d === "local") {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    }
    return key in memoryStore ? memoryStore[key] : fallback;
  } catch (e) {
    return fallback;
  }
}

async function storeSet(key, value) {
  try {
    const d = storageDriver();
    if (d === "claude") { await window.storage.set(key, value, false); return true; }
    if (d === "local") { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
    memoryStore[key] = value;
    return false; // stored, but only for this session
  } catch (e) {
    memoryStore[key] = value;
    return false;
  }
}

/* ------------------------------------------------------- backup / restore */
/* Browser storage is not a filing cabinet — it can be cleared by the browser,
   and it does not follow you to another device. A JSON backup is the copy that
   actually survives.                                                        */

const BACKUP_VERSION = 1;

const buildBackup = (weeks, profile, eagles, conservation, activity) => JSON.stringify({
  app: "FHD Production Command Center",
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  weeks, profile, eagles, conservation, activity,
}, null, 2);

function readBackup(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") throw new Error("That file is not a backup.");
  if (!Array.isArray(parsed.weeks)) throw new Error("That backup has no weekly log in it.");
  return {
    weeks: parsed.weeks,
    profile: { ...SEED_PROFILE, ...(parsed.profile || {}) },
    eagles: Array.isArray(parsed.eagles) ? parsed.eagles : [],
    conservation: Array.isArray(parsed.conservation) ? parsed.conservation : [],
    activity: Array.isArray(parsed.activity) ? parsed.activity : [],
  };
}

// Published pages save through window.claude.downloads (the viewer confirms);
// everywhere else, a plain blob download.
async function saveFile(filename, data) {
  try {
    if (typeof window !== "undefined" && window.claude && window.claude.downloads) {
      await window.claude.downloads.save({ filename, data });
      return { ok: true };
    }
  } catch (err) {
    const code = err && err.code;
    if (code === "declined") return { ok: false, msg: "Backup cancelled." };
    if (code === "rate_limited") return { ok: false, msg: "A save prompt is already open — finish that one first." };
    if (code === "too_large") return { ok: false, msg: "Backup is too large to save here." };
    // anything else: fall through to the blob path
  }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: "This browser blocked the download." };
  }
}

/* ------------------------------------------------------------ UI primitives */

const TONE = {
  red:    { text: "text-red-400",     bar: "bg-red-500",     ring: "border-red-500",     soft: "bg-red-950",     chip: "bg-red-950 text-red-300 border-red-800" },
  amber:  { text: "text-amber-400",   bar: "bg-amber-500",   ring: "border-amber-500",   soft: "bg-amber-950",   chip: "bg-amber-950 text-amber-300 border-amber-800" },
  green:  { text: "text-emerald-400", bar: "bg-emerald-500", ring: "border-emerald-500", soft: "bg-emerald-950", chip: "bg-emerald-950 text-emerald-300 border-emerald-800" },
  blue:   { text: "text-sky-400",     bar: "bg-sky-500",     ring: "border-sky-500",     soft: "bg-sky-950",     chip: "bg-sky-950 text-sky-300 border-sky-800" },
  gray:   { text: "text-slate-400",   bar: "bg-slate-600",   ring: "border-slate-700",   soft: "bg-slate-900",   chip: "bg-slate-800 text-slate-300 border-slate-700" },
};

// Urgency by days remaining: inside 14 = red + pulse, 15–30 = amber, 30+ = neutral.
const urgencyTone = (days) => {
  if (days === null || days === undefined) return "gray";
  if (days < 0) return "red";
  if (days <= 14) return "red";
  if (days <= 30) return "amber";
  return "gray";
};
const urgencyPulse = (days) => days !== null && days !== undefined && days >= 0 && days <= 14;

function Panel({ children, className = "", tone = "gray", pulse = false }) {
  const t = TONE[tone] || TONE.gray;
  return (
    <div className={`rounded-xl border ${t.ring} bg-slate-900 p-4 ${pulse ? "animate-pulse" : ""} ${className}`}>
      {children}
    </div>
  );
}

function Chip({ children, tone = "gray", className = "" }) {
  const t = TONE[tone] || TONE.gray;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${t.chip} ${className}`}>
      {children}
    </span>
  );
}

function ProgressBar({ current, target, tone, label, unit = "$", showGap = true, height = "h-3" }) {
  const cur = Number(current) || 0;
  const tgt = Number(target) || 0;
  const p = tgt > 0 ? clampPct((cur / tgt) * 100) : 0;
  const gap = Math.max(0, tgt - cur);
  const auto = p >= 100 ? "blue" : p >= 66 ? "green" : p > 0 ? "amber" : cur < 0 ? "red" : "gray";
  const t = TONE[tone || auto] || TONE.gray;
  const f = (n) => (unit === "$" ? money(n) : `${Math.round(n).toLocaleString()}${unit === "" ? "" : " " + unit}`);
  return (
    <div className="w-full">
      {label ? <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div> : null}
      <div className={`w-full overflow-hidden rounded-full bg-slate-800 ${height}`}>
        <div className={`${t.bar} ${height} rounded-full`} style={{ width: `${p}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
        <span className={`font-bold ${t.text}`}>{f(cur)}<span className="text-slate-500"> / {f(tgt)}</span></span>
        <span className="text-slate-400">
          {showGap ? (gap > 0 ? <>gap <span className="font-bold text-slate-200">{f(gap)}</span> · </> : <span className="font-bold text-sky-400">CLEARED · </span>) : null}
          <span className="font-semibold text-slate-300">{p.toFixed(0)}%</span>
        </span>
      </div>
    </div>
  );
}

function Countdown({ date, label, compact = false }) {
  const dt = typeof date === "string" ? parseISO(date) : date;
  if (!dt) return null;
  const days = daysBetween(new Date(), dt);
  const tone = urgencyTone(days);
  const t = TONE[tone];
  const pulse = urgencyPulse(days);
  const txt = days < 0 ? `${Math.abs(days)}d PAST` : days === 0 ? "TODAY" : `${days}d`;
  if (compact) return <span className={`font-bold ${t.text}`}>{txt}</span>;
  return (
    <div className={`rounded-lg border ${t.ring} ${t.soft} px-3 py-2 ${pulse ? "animate-pulse" : ""}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-black ${t.text}`}>{txt}</span>
        <span className="text-xs text-slate-400">{fmtLong(dt)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone = "gray", size = "text-2xl" }) {
  const t = TONE[tone] || TONE.gray;
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`${size} font-black ${t.text}`}>{value}</div>
      {sub ? <div className="text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

function RuleBox({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        <Shield size={14} /> {title || "Official rule"}
      </div>
      <div className="space-y-1 text-sm leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children, sub }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="rounded-lg bg-slate-800 p-2 text-sky-400">{Icon ? <Icon size={20} /> : null}</div>
      <div>
        <h2 className="text-xl font-black uppercase tracking-wide text-slate-100">{children}</h2>
        {sub ? <p className="text-xs text-slate-400">{sub}</p> : null}
      </div>
    </div>
  );
}

// Every gap gets expressed in three units: dollars, apps, days-at-current-pace.
function GapTriad({ dollars, dailyNap, className = "" }) {
  const d = Math.max(0, Number(dollars) || 0);
  const days = dailyNap > 0 ? Math.ceil(d / dailyNap) : null;
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
      <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 font-bold text-slate-100">{money(d)}</span>
      <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300">≈ {appsFor(d)} apps</span>
      <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300">
        {days === null ? "pace 0 — never at current rate" : `${days}d at current pace`}
      </span>
    </div>
  );
}

function Table({ headers, rows, empty = "No records yet." }) {
  if (!rows || rows.length === 0) return <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full min-w-full text-left text-sm">
        <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
          <tr>{headers.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-900">
              {r.map((c, j) => <td key={j} className="whitespace-nowrap px-3 py-2 text-slate-300">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500";
const btnCls = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wide";

/* ============================================================================
   DERIVED MODEL — every FHD rule computed live off the weekly log
   ========================================================================== */

function buildModel(weeks, profile, eagles, activity, conservation, today) {
  const byWeek = {};
  weeks.forEach((w) => { byWeek[w.week] = w; });

  const currentWeek = weekForDate(today);
  const currentMonth = monthForDate(today) || SALES_MONTHS[SALES_MONTHS.length - 1];
  const curWeekEntry = byWeek[currentWeek] || null;
  const curWeekNap = curWeekEntry && !curWeekEntry.unconfirmed ? Number(curWeekEntry.nap) || 0 : Number(curWeekEntry?.nap) || 0;
  const daysLeftInWeek = daysBetween(today, weekEnd(currentWeek)) + 1; // inclusive of today

  // ---- new-agent A/T protection
  const protectionEnd = parseISO(profile.newAgentProtectionEnds);
  const protectionDays = protectionEnd ? daysBetween(today, protectionEnd) : null;
  const protectedNow = protectionDays !== null && protectionDays >= 0;
  const firstBiz = parseISO(profile.firstBusinessDate);
  const newAgent = firstBiz ? daysBetween(firstBiz, today) <= 365 : false;

  const atRatio = Number(profile.atRatio) || 0;
  const rawMult = rawMultiplier(atRatio);
  const multiplier = protectedNow ? Math.max(rawMult, 100) : rawMult;
  const atFails = multiplier === 0;

  // ---- month rollups
  const monthAgg = (m) => {
    const entries = m.weeks.map((w) => byWeek[w]).filter(Boolean);
    const nap = entries.reduce((s, e) => s + (Number(e.nap) || 0), 0);
    const netApps = entries.reduce((s, e) => s + (Number(e.netApps) || 0), 0);
    const gross = entries.reduce((s, e) => s + (Number(e.gross) || 0), 0);
    const produced = m.weeks.filter((w) => byWeek[w] && !byWeek[w].unconfirmed && Number(byWeek[w].nap) > 0);
    const stillAvailable = m.weeks.filter((w) => daysBetween(today, weekEnd(w)) >= 0 && !(byWeek[w] && Number(byWeek[w].nap) > 0));
    const required = minWeeksRequired(m);
    const maxPossible = produced.length + stillAvailable.length;
    const failed = maxPossible < required;
    const mustRunTheTable = !failed && stillAvailable.length > 0 && required - produced.length === stillAvailable.length;
    const met = produced.length >= required;
    const tier = bonusTierFor(nap, newAgent);
    const next = nextBonusTier(nap, newAgent);
    const payout = failed || atFails ? 0 : Math.round(tier.bonus * (multiplier / 100));
    const closed = daysBetween(today, monthEnd(m)) < 0;
    return {
      month: m, entries, nap, netApps, gross, required, met, failed, mustRunTheTable, closed,
      producedWeeks: produced, weeksProduced: produced.length,
      weeksRemaining: stillAvailable.length, remainingWeekNums: stillAvailable,
      weeksUsed: m.weeks.filter((w) => byWeek[w] && !byWeek[w].unconfirmed).length,
      tier, next, payout,
      gapToNext: next ? Math.max(0, next.nap - nap) : 0,
      paceNeeded: next && stillAvailable.length > 0 ? Math.max(0, next.nap - nap) / stillAvailable.length : null,
    };
  };
  const months = SALES_MONTHS.map(monthAgg);
  const monthByKey = {};
  months.forEach((a) => { monthByKey[a.month.key] = a; });
  const thisMonth = monthByKey[currentMonth.key];

  // ---- annual + records
  const ytdNap = weeks.reduce((s, e) => s + (Number(e.nap) || 0), 0);
  const ytdApps = weeks.reduce((s, e) => s + (Number(e.netApps) || 0), 0);

  const confirmed = weeks.filter((w) => !w.unconfirmed);
  const bestWeekEntry = confirmed.reduce((b, e) => (!b || Number(e.nap) > Number(b.nap) ? e : b), null);
  const bestWeek = bestWeekEntry ? { nap: Number(bestWeekEntry.nap) || 0, week: bestWeekEntry.week } : { nap: 0, week: null };
  const bestMonth = months.filter((a) => a.closed || a.month.key === currentMonth.key)
    .reduce((b, a) => (!b || a.nap > b.nap ? a : b), null);

  const greenOutWeeks = confirmed.filter((w) => Number(w.nap) >= GREEN_OUT);

  // ---- streaks (completed weeks only, newest first)
  const completed = confirmed
    .filter((w) => daysBetween(today, weekEnd(w.week)) < 0)
    .sort((a, b) => b.week - a.week);
  let zeroStreak = 0, prodStreak = 0;
  for (const w of completed) { if ((Number(w.nap) || 0) <= 0) zeroStreak++; else break; }
  for (const w of completed) { if ((Number(w.nap) || 0) > 0) prodStreak++; else break; }
  const unconfirmedZeroAhead = weeks.some(
    (w) => w.unconfirmed && (Number(w.nap) || 0) <= 0 && daysBetween(today, weekEnd(w.week)) < 0
  );

  // ---- pace
  const lastFour = completed.slice(0, 4);
  const trailingNap = lastFour.reduce((s, e) => s + (Number(e.nap) || 0), 0);
  const dailyNap = lastFour.length ? Math.max(0, trailingNap / (lastFour.length * 7)) : 0;
  const weeklyPace = lastFour.length ? trailingNap / lastFour.length : 0;
  const careerDaily = firstBiz && daysBetween(firstBiz, today) > 0 ? ytdNap / daysBetween(firstBiz, today) : 0;
  const week18Pace = 5584;

  // ---- String Club
  const stringBest = stringLevelFor(bestWeek.nap);
  const stringNextOverall = nextStringLevel(bestWeek.nap);
  const stringNextThisWeek = nextStringLevel(curWeekNap);

  // ---- GLU 101
  const gluSessions = GLU_SESSIONS.map((s) => {
    const inWindow = confirmed.filter((w) => {
      const ws = weekStart(w.week);
      return ws >= startOfDay(s.qual[0]) && ws <= startOfDay(s.qual[1]);
    });
    const napInWindow = inWindow.reduce((sum, w) => sum + (Number(w.nap) || 0), 0);
    const gos = inWindow.filter((w) => Number(w.nap) >= GREEN_OUT).length;
    const qualDaysLeft = daysBetween(today, s.qual[1]);
    const regOpenIn = s.reg ? daysBetween(today, s.reg[0]) : null;
    const regDaysLeft = s.reg ? daysBetween(today, s.reg[1]) : null;
    const goPct = clampPct((gos / GLU_GREENOUT_TARGET) * 100);
    const napPct = clampPct((napInWindow / GLU_NAP_TARGET) * 100);
    return {
      ...s, napInWindow, greenOuts: gos, qualDaysLeft, regOpenIn, regDaysLeft, goPct, napPct,
      livePath: goPct >= napPct ? "greenouts" : "nap",
      qualified: gos >= GLU_GREENOUT_TARGET || napInWindow >= GLU_NAP_TARGET,
      expired: qualDaysLeft < 0,
      napGap: Math.max(0, GLU_NAP_TARGET - napInWindow),
      goGap: Math.max(0, GLU_GREENOUT_TARGET - gos),
    };
  });
  const liveGlu = gluSessions.find((s) => !s.expired) || gluSessions[gluSessions.length - 1];

  // ---- Quarterly stock bonus
  const quarters = QUARTERS.map((q) => {
    const slots = q.months.map((mk) => {
      const a = monthByKey[mk];
      return { key: mk, label: a.month.label, nap: a.nap, cleared: a.nap >= QUARTERLY_STOCK_NAP && !a.failed, closed: a.closed, agg: a };
    });
    const cleared = slots.filter((s) => s.cleared).length;
    const stillOpen = slots.filter((s) => !s.closed && !s.cleared).length;
    return { ...q, slots, cleared, stillOpen, achieved: cleared >= 3, possible: cleared + stillOpen >= 3, atOk: multiplier >= AT_FLOOR };
  });

  // ---- Eagles
  const eagleRows = (eagles || []).map((e) => {
    const wd = parseISO(e.writeUpDate);
    const due = wd ? addDays(wd, EAGLE_WINDOW_DAYS) : null;
    const daysLeft = due ? daysBetween(today, due) : null;
    const submitted = !!e.submittedDate;
    const subd = parseISO(e.submittedDate);
    const onTime = submitted && wd && subd ? daysBetween(wd, subd) <= EAGLE_WINDOW_DAYS : false;
    const expired = !submitted && daysLeft !== null && daysLeft < 0;
    return { ...e, due, daysLeft, submitted, onTime, expired, earned: submitted && onTime ? EAGLE_BONUS : 0 };
  });
  const eagleEarned = eagleRows.reduce((s, e) => s + e.earned, 0);
  const eagleForfeited = eagleRows.filter((e) => e.expired || (e.submitted && !e.onTime)).length * EAGLE_BONUS;

  // ---- Conservation
  const consRows = (conservation || []).map((c) => ({ ...c, annual: (Number(c.monthly) || 0) * 12 }));
  const napSaved = consRows.filter((c) => c.status === "Saved").reduce((s, c) => s + c.annual, 0);
  const napLost = consRows.filter((c) => c.status === "Lost").reduce((s, c) => s + c.annual, 0);
  const napAtRisk = consRows.filter((c) => c.status === "Open" || c.status === "Contacted").reduce((s, c) => s + c.annual, 0);

  // ---- Activity (leading indicators)
  const actInWeek = (w) => (activity || []).filter((a) => {
    const d = parseISO(a.date);
    return d && weekForDate(d) === w;
  });
  const curWeekActivity = actInWeek(currentWeek);
  const sumAct = (rows, f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);
  const actTotals = {
    doors: sumAct(curWeekActivity, "doors"),
    presentations: sumAct(curWeekActivity, "presentations"),
    apps: sumAct(curWeekActivity, "apps"),
    referrals: sumAct(curWeekActivity, "referrals"),
    daysWorked: new Set(curWeekActivity.map((a) => a.date)).size,
  };
  const appsPerDay = actTotals.daysWorked > 0 ? actTotals.apps / actTotals.daysWorked : 0;

  // ---- deadlines
  const deadlines = [];
  deadlines.push({ id: "week", label: `Sales week ${currentWeek} closes`, date: weekEnd(currentWeek), tab: "weekly" });
  deadlines.push({ id: "month", label: `${currentMonth.label} sales month closes`, date: monthEnd(currentMonth), tab: "monthly" });
  if (protectionEnd && protectionDays >= 0)
    deadlines.push({ id: "protection", label: "New-agent 100% A/T protection expires", date: protectionEnd, tab: "quality" });
  gluSessions.forEach((s) => {
    if (s.qualDaysLeft >= 0) deadlines.push({ id: s.id + "-q", label: `${s.label} — qualification window closes`, date: s.qual[1], tab: "glu" });
    if (s.reg && s.regDaysLeft >= 0) deadlines.push({ id: s.id + "-r", label: `${s.label} — registration closes`, date: s.reg[1], tab: "glu" });
  });
  QUARTERS.forEach((q) => {
    const last = monthByKey[q.months[q.months.length - 1]];
    if (daysBetween(today, monthEnd(last.month)) >= 0)
      deadlines.push({ id: q.key, label: `${q.label} stock bonus window closes`, date: monthEnd(last.month), tab: "annual" });
  });
  eagleRows.filter((e) => !e.submitted && e.daysLeft !== null && e.daysLeft >= 0)
    .forEach((e) => deadlines.push({ id: "eagle-" + e.id, label: `Eagle write-up — ${e.client || "unnamed"} submission deadline`, date: e.due, tab: "eagles" }));
  const annualClose = monthEnd(SALES_MONTHS[SALES_MONTHS.length - 1]);
  if (daysBetween(today, annualClose) >= 0)
    deadlines.push({ id: "annual", label: "Annual NAP year closes (Top 150 ranking)", date: annualClose, tab: "annual" });
  deadlines.sort((a, b) => a.date - b.date);

  return {
    today, byWeek, currentWeek, currentMonth, curWeekEntry, curWeekNap, daysLeftInWeek,
    protectionEnd, protectionDays, protectedNow, newAgent, atRatio, rawMult, multiplier, atFails,
    months, monthByKey, thisMonth, ytdNap, ytdApps,
    bestWeek, bestMonth, greenOutWeeks, zeroStreak, prodStreak, unconfirmedZeroAhead, completed,
    dailyNap, weeklyPace, careerDaily, week18Pace, trailingNap,
    stringBest, stringNextOverall, stringNextThisWeek,
    gluSessions, liveGlu, quarters, eagleRows, eagleEarned, eagleForfeited,
    consRows, napSaved, napLost, napAtRisk,
    curWeekActivity, actTotals, appsPerDay, deadlines,
    licenseGap: Math.max(0, LICENSE_REIMB_NAP - ytdNap),
  };
}

/* -------------------------------------------------- NEXT TARGET calculation */
/* The smallest dollar gap that unlocks the next qualification, plus everything
   else that same dollar amount clears.                                       */

function computeNextTarget(m) {
  const c = [];
  const push = (label, gap, scope) => { if (gap > 0) c.push({ label, gap: Math.round(gap), scope }); };

  push("Green Out", GREEN_OUT - m.curWeekNap, "week");
  if (m.stringNextThisWeek) push(m.stringNextThisWeek.name, m.stringNextThisWeek.nap - m.curWeekNap, "week");
  if (m.bestWeek.nap > m.curWeekNap) push(`PR tie — best week ${money(m.bestWeek.nap)}`, m.bestWeek.nap - m.curWeekNap, "week");
  if (m.thisMonth.next) push(`${money(m.thisMonth.next.nap)} bonus tier (${money(m.thisMonth.next.bonus)})`, m.thisMonth.gapToNext, "month");
  if (m.bestMonth && m.bestMonth.nap > m.thisMonth.nap && m.bestMonth.month.key !== m.thisMonth.month.key)
    push(`PR tie — best month ${money(m.bestMonth.nap)}`, m.bestMonth.nap - m.thisMonth.nap, "month");
  if (m.liveGlu && !m.liveGlu.expired && !m.liveGlu.qualified) {
    push("GLU 101 via $30k path", m.liveGlu.napGap, "window");
    if (m.liveGlu.goGap > 0) push(`GLU 101 Green-Out ${GLU_GREENOUT_TARGET - m.liveGlu.goGap + 1}/3`, GREEN_OUT - m.curWeekNap, "week");
  }
  push("Quarterly stock month slot ($20k)", QUARTERLY_STOCK_NAP - m.thisMonth.nap, "month");
  push("License reimbursement ($50k cumulative)", m.licenseGap, "annual");

  if (c.length === 0) return null;
  const smallest = c.reduce((a, b) => (b.gap < a.gap ? b : a));
  const unlocks = c.filter((x) => x.gap <= smallest.gap).map((x) => x.label);
  const weekUnlocks = c.filter((x) => x.scope === "week" && x.gap <= smallest.gap).length;
  return {
    amount: smallest.gap,
    apps: appsFor(smallest.gap),
    unlocks: Array.from(new Set(unlocks)),
    scope: smallest.scope,
    daysLeft: smallest.scope === "week" ? m.daysLeftInWeek : daysBetween(m.today, monthEnd(m.currentMonth)) + 1,
    weekUnlocks,
  };
}

/* ============================================================================
   APP SHELL
   ========================================================================== */

const TABS = [
  { id: "dash", label: "Dashboard", icon: Gauge },
  { id: "weekly", label: "Weekly Log", icon: Calendar },
  { id: "monthly", label: "Monthly Bonus", icon: DollarSign },
  { id: "string", label: "String Club", icon: Trophy },
  { id: "glu", label: "GLU 101", icon: Award },
  { id: "quality", label: "Quality (A/T)", icon: Shield },
  { id: "eagles", label: "Eagles & Extras", icon: Star },
  { id: "annual", label: "Annual & Quarterly", icon: TrendingUp },
  { id: "activity", label: "Activity Drivers", icon: Activity },
  { id: "pace", label: "Pace & Projection", icon: Zap },
  { id: "rules", label: "Rules Reference", icon: Layers },
];

export default function FHDProductionCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [persistOk, setPersistOk] = useState(true);
  const [tab, setTab] = useState("dash");

  const [weeks, setWeeks] = useState(SEED_WEEKS);
  const [profile, setProfile] = useState(SEED_PROFILE);
  const [eagles, setEagles] = useState(SEED_EAGLES);
  const [conservation, setConservation] = useState(SEED_CONSERVATION);
  const [activity, setActivity] = useState(SEED_ACTIVITY);
  const [celebration, setCelebration] = useState(null);
  const [flash, setFlash] = useState(null);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [w, p, e, c, a] = await Promise.all([
        storeGet(K.weeks, null), storeGet(K.profile, null), storeGet(K.eagles, null),
        storeGet(K.conservation, null), storeGet(K.activity, null),
      ]);
      if (!alive) return;
      if (Array.isArray(w) && w.length) setWeeks(w);
      if (p && typeof p === "object") setProfile({ ...SEED_PROFILE, ...p });
      if (Array.isArray(e)) setEagles(e);
      if (Array.isArray(c) && c.length) setConservation(c);
      if (Array.isArray(a)) setActivity(a);
      setPersistOk(storageDriver() !== "memory");
      setLoading(false);
      // First run with no saved state: seed the store so the log survives reload.
      if (!Array.isArray(w)) {
        await storeSet(K.weeks, SEED_WEEKS);
        await storeSet(K.profile, SEED_PROFILE);
        await storeSet(K.conservation, SEED_CONSERVATION);
      }
    })();
    return () => { alive = false; };
  }, []);

  const model = useMemo(
    () => buildModel(weeks, profile, eagles, activity, conservation, today),
    [weeks, profile, eagles, activity, conservation, today]
  );
  const nextTarget = useMemo(() => computeNextTarget(model), [model]);

  const say = useCallback((msg, tone = "blue") => {
    setFlash({ msg, tone });
    setTimeout(() => setFlash(null), 5000);
  }, []);

  const commit = useCallback(async (key, value, setter) => {
    setter(value);
    const ok = await storeSet(key, value);
    if (!ok && storageDriver() !== "memory") say("Storage write failed — this change is in memory only. Export a backup.", "red");
  }, [say]);

  /* ------------------------------------------------------ backup / restore */

  const exportBackup = useCallback(async () => {
    const data = buildBackup(weeks, profile, eagles, conservation, activity);
    const name = `fhd-backup-${isoDate(today)}.json`;
    const res = await saveFile(name, data);
    say(res.ok ? `Backup saved as ${name}.` : res.msg, res.ok ? "green" : "amber");
  }, [weeks, profile, eagles, conservation, activity, today, say]);

  const importBackup = useCallback(async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const b = readBackup(text);
      if (!window.confirm(`Restore ${b.weeks.length} logged weeks from this backup? Everything currently in the dashboard is replaced.`)) return;
      setWeeks(b.weeks); setProfile(b.profile); setEagles(b.eagles);
      setConservation(b.conservation); setActivity(b.activity);
      await Promise.all([
        storeSet(K.weeks, b.weeks), storeSet(K.profile, b.profile), storeSet(K.eagles, b.eagles),
        storeSet(K.conservation, b.conservation), storeSet(K.activity, b.activity),
      ]);
      say(`Restored ${b.weeks.length} weeks from backup.`, "green");
    } catch (err) {
      say(err && err.message ? err.message : "That file could not be read as a backup.", "red");
    }
  }, [say]);

  /* ------------------------------------------------------------- handlers */

  const saveWeek = useCallback(async (entry) => {
    const existing = weeks.find((w) => w.week === entry.week);
    if (existing && !existing.unconfirmed) {
      const ok = window.confirm(
        `Week ${entry.week} already logged at ${money(existing.nap)} (${existing.netApps} apps).\n` +
        `Overwrite with ${money(entry.nap)} (${entry.netApps} apps)?`
      );
      if (!ok) return false;
    }
    const next = [...weeks.filter((w) => w.week !== entry.week), entry].sort((a, b) => a.week - b.week);
    await commit(K.weeks, next, setWeeks);

    // PR detection + zero-week warning
    const nap = Number(entry.nap) || 0;
    const prevBest = model.bestWeek.nap;
    const monthOf = monthForWeek(entry.week);
    const prevMonthNap = monthOf ? model.monthByKey[monthOf.key].nap : 0;
    const newMonthNap = prevMonthNap - (existing ? Number(existing.nap) || 0 : 0) + nap;
    const hits = [];
    if (nap > prevBest) hits.push(`NEW BEST WEEK — ${money(nap)} (old PR ${money(prevBest)}, week ${model.bestWeek.week})`);
    if (monthOf && model.bestMonth && newMonthNap > model.bestMonth.nap && monthOf.key !== model.bestMonth.month.key)
      hits.push(`NEW BEST MONTH — ${monthOf.label} at ${money(newMonthNap)}`);
    if (nap >= GREEN_OUT) hits.push(`GREEN OUT LOGGED — ${money(nap)} single week`);
    if (hits.length) { setCelebration(hits); setTimeout(() => setCelebration(null), 12000); }
    else if (nap <= 0) say(`Week ${entry.week} logged at ${money(nap)} — zero/negative week. Streak warning active.`, "red");
    else say(`Week ${entry.week} saved — ${money(nap)}.`, "green");
    return true;
  }, [weeks, commit, model, say]);

  const deleteWeek = useCallback(async (num) => {
    if (!window.confirm(`Delete week ${num} from the log?`)) return;
    await commit(K.weeks, weeks.filter((w) => w.week !== num), setWeeks);
    say(`Week ${num} deleted.`, "amber");
  }, [weeks, commit, say]);

  const setAtRatio = useCallback(async (ratio) => {
    const r = Number(ratio);
    if (isNaN(r)) return;
    const label = `${MONTHS_SHORT[today.getMonth()]} ${String(today.getFullYear()).slice(2)}`;
    const history = [...(profile.atHistory || []).filter((h) => h.label !== label), { month: isoDate(today).slice(0, 7), label, ratio: r }];
    await commit(K.profile, { ...profile, atRatio: r, atHistory: history }, setProfile);
    say(`12-month A/T updated to ${pct(r, 1)}.`, r >= AT_FLOOR ? "green" : "red");
  }, [profile, commit, say, today]);

  const addEagle = useCallback(async (e) => {
    await commit(K.eagles, [...eagles, e], setEagles);
    say(`Eagle write-up logged — ${EAGLE_WINDOW_DAYS}-day submission clock started.`, "blue");
  }, [eagles, commit, say]);

  const updateEagle = useCallback(async (id, patch) => {
    await commit(K.eagles, eagles.map((e) => (e.id === id ? { ...e, ...patch } : e)), setEagles);
  }, [eagles, commit]);

  const deleteEagle = useCallback(async (id) => {
    if (!window.confirm("Delete this Eagle write-up?")) return;
    await commit(K.eagles, eagles.filter((e) => e.id !== id), setEagles);
  }, [eagles, commit]);

  const addActivity = useCallback(async (row) => {
    await commit(K.activity, [...activity, row], setActivity);
  }, [activity, commit]);

  const quickAdd = useCallback(async (field, amount) => {
    const d = isoDate(today);
    const existing = activity.find((a) => a.date === d);
    const base = existing || { id: "act-" + d, date: d, doors: 0, presentations: 0, apps: 0, referrals: 0 };
    const updated = { ...base, [field]: (Number(base[field]) || 0) + amount };
    const next = existing ? activity.map((a) => (a.date === d ? updated : a)) : [...activity, updated];
    await commit(K.activity, next, setActivity);
  }, [activity, commit, today]);

  const setConsStatus = useCallback(async (id, status) => {
    await commit(K.conservation, conservation.map((c) => (c.id === id ? { ...c, status } : c)), setConservation);
  }, [conservation, commit]);

  const addConservation = useCallback(async (row) => {
    await commit(K.conservation, [...conservation, row], setConservation);
  }, [conservation, commit]);

  const resetAll = useCallback(async () => {
    if (!window.confirm("Reset ALL data back to the seeded baseline? Every logged week, Eagle, and activity entry you added will be erased.")) return;
    setWeeks(SEED_WEEKS); setProfile(SEED_PROFILE); setEagles(SEED_EAGLES);
    setConservation(SEED_CONSERVATION); setActivity(SEED_ACTIVITY);
    await Promise.all([
      storeSet(K.weeks, SEED_WEEKS), storeSet(K.profile, SEED_PROFILE), storeSet(K.eagles, SEED_EAGLES),
      storeSet(K.conservation, SEED_CONSERVATION), storeSet(K.activity, SEED_ACTIVITY),
    ]);
    say("All data reset to seeded baseline.", "amber");
  }, [say]);

  const ctx = {
    model, profile, weeks, eagles, conservation, activity, nextTarget, today,
    saveWeek, deleteWeek, setAtRatio, addEagle, updateEagle, deleteEagle,
    addActivity, quickAdd, setConsStatus, addConservation, go: setTab,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <div className="mx-auto max-w-md pt-24 text-center">
          <Flame className="mx-auto animate-pulse text-sky-500" size={48} />
          <p className="mt-4 text-lg font-black uppercase tracking-widest text-slate-300">Loading production data…</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-2 w-1/2 animate-pulse rounded-full bg-sky-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-3 pb-24 pt-4 sm:px-5">
        <DeadlineStrip model={model} go={setTab} />
        <Header profile={profile} model={model} onReset={resetAll} persistOk={persistOk}
          onExport={exportBackup} onImport={importBackup} />
        {model.thisMonth.failed ? <ActivityAlarm agg={model.thisMonth} /> : null}
        {celebration ? <Celebration hits={celebration} onClose={() => setCelebration(null)} /> : null}
        {flash ? (
          <div className={`mb-3 rounded-lg border px-3 py-2 text-sm font-semibold ${TONE[flash.tone].chip}`}>{flash.msg}</div>
        ) : null}

        <nav className="sticky top-0 z-10 -mx-3 mb-4 flex gap-1 overflow-x-auto bg-slate-950 px-3 py-2 sm:mx-0 sm:px-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                  active ? "border-sky-500 bg-sky-950 text-sky-300" : "border-slate-800 bg-slate-900 text-slate-400"}`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "dash" ? <DashboardTab {...ctx} /> : null}
        {tab === "weekly" ? <WeeklyTab {...ctx} /> : null}
        {tab === "monthly" ? <MonthlyTab {...ctx} /> : null}
        {tab === "string" ? <StringTab {...ctx} /> : null}
        {tab === "glu" ? <GluTab {...ctx} /> : null}
        {tab === "quality" ? <QualityTab {...ctx} /> : null}
        {tab === "eagles" ? <EaglesTab {...ctx} /> : null}
        {tab === "annual" ? <AnnualTab {...ctx} /> : null}
        {tab === "activity" ? <ActivityTab {...ctx} /> : null}
        {tab === "pace" ? <PaceTab {...ctx} /> : null}
        {tab === "rules" ? <RulesTab /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ shell pieces */

function Header({ profile, model, onReset, persistOk, onExport, onImport }) {
  const fileRef = React.useRef(null);
  const d = DRIVER_LABEL[storageDriver()];
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-slate-100 sm:text-3xl">
          FHD Production <span className="text-sky-400">Command Center</span>
        </h1>
        <p className="text-xs text-slate-400">
          {profile.name} · Agent #{profile.agentNumber} · Director {profile.director} ({profile.directorNumber})
        </p>
        <p className="text-xs text-slate-500">{profile.productMix}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={d.tone}>{d.text}</Chip>
        <button onClick={onExport} className={`${btnCls} border border-slate-700 bg-slate-800 text-slate-200`}>
          <Save size={14} /> Backup
        </button>
        <button onClick={() => fileRef.current && fileRef.current.click()} className={`${btnCls} border border-slate-700 bg-slate-800 text-slate-200`}>
          <RefreshCw size={14} /> Restore
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; onImport(f); }} />
        <button onClick={onReset} className={`${btnCls} border border-slate-700 bg-slate-900 text-slate-400`}>
          <Trash2 size={14} /> Reset
        </button>
      </div>
      {!persistOk ? (
        <div className="w-full rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-xs font-semibold text-amber-300">
          This browser is not letting the dashboard save anything. Entries last until you close the tab —
          hit <span className="font-black">Backup</span> before you leave, and <span className="font-black">Restore</span> next time.
        </div>
      ) : null}
    </div>
  );
}

function DeadlineStrip({ model, go }) {
  const three = model.deadlines.slice(0, 3);
  return (
    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
        <Clock size={14} /> Nearest deadlines
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {three.map((d) => {
          const days = daysBetween(model.today, d.date);
          const tone = urgencyTone(days);
          const t = TONE[tone];
          return (
            <button key={d.id} onClick={() => go(d.tab)}
              className={`rounded-lg border ${t.ring} ${t.soft} p-3 text-left ${urgencyPulse(days) ? "animate-pulse" : ""}`}>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${t.text}`}>{days < 0 ? "—" : days}</span>
                <span className="text-xs font-bold uppercase text-slate-400">{days === 1 ? "day" : "days"}</span>
              </div>
              <div className="text-xs font-semibold text-slate-200">{d.label}</div>
              <div className="text-xs text-slate-500">{fmtLong(d.date)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActivityAlarm({ agg }) {
  return (
    <div className="mb-4 animate-pulse rounded-xl border-2 border-red-500 bg-red-950 p-4">
      <div className="flex items-center gap-2 text-lg font-black uppercase tracking-widest text-red-300">
        <AlertTriangle size={22} /> Activity minimum failed — {agg.month.label}
      </div>
      <p className="mt-1 text-sm text-red-200">
        {agg.weeksProduced} of {agg.required} required production weeks logged, with {agg.weeksRemaining} week
        {agg.weeksRemaining === 1 ? "" : "s"} left. The requirement can no longer be met.
        <span className="font-black"> Monthly Cash Bonus for {agg.month.label} pays $0 regardless of NAP ({money(agg.nap)} logged).</span>
      </p>
    </div>
  );
}

function Celebration({ hits, onClose }) {
  return (
    <div className="mb-4 rounded-xl border-2 border-sky-500 bg-sky-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-black uppercase tracking-widest text-sky-300">
            <Trophy className="animate-bounce" size={22} /> New personal record
          </div>
          <ul className="mt-2 space-y-1">
            {hits.map((h, i) => (
              <li key={i} className="text-sm font-bold text-sky-100">
                <span className="mr-2 inline-block animate-ping rounded-full bg-sky-400 p-1 align-middle" />{h}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={onClose} className="text-slate-400"><XCircle size={20} /></button>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 1 — MASTER DASHBOARD
   ========================================================================== */

function Card({ title, icon: Icon, tone = "gray", onClick, children, pulse = false }) {
  const t = TONE[tone] || TONE.gray;
  return (
    <button onClick={onClick}
      className={`w-full rounded-xl border ${t.ring} bg-slate-900 p-4 text-left ${pulse ? "animate-pulse" : ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
          {Icon ? <Icon size={14} /> : null} {title}
        </span>
        <ChevronRight size={16} className="text-slate-600" />
      </div>
      {children}
    </button>
  );
}

function DashboardTab({ model: m, nextTarget, go, profile }) {
  const monthEndDays = daysBetween(m.today, monthEnd(m.currentMonth)) + 1;
  const weekTone = m.curWeekNap >= GREEN_OUT ? "blue" : m.curWeekNap > 0 ? "amber" : "red";
  const atTone = m.multiplier === 0 ? "red" : m.atRatio >= AT_CEILING ? "blue" : m.atRatio >= 100 ? "green" : "amber";
  const streakTone = m.zeroStreak > 0 ? "red" : "green";
  const glu = m.liveGlu;

  return (
    <div className="space-y-4">
      {/* Hero numbers: current week NAP + gap to next milestone are the biggest text on screen. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border ${TONE[weekTone].ring} bg-slate-900 p-5`}>
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">
            Week {m.currentWeek} NAP · {weekRange(m.currentWeek)}
          </div>
          <div className={`text-6xl font-black leading-none ${TONE[weekTone].text} sm:text-7xl`}>{money(m.curWeekNap)}</div>
          <div className="mt-2 text-sm font-bold text-slate-300">
            {m.daysLeftInWeek} day{m.daysLeftInWeek === 1 ? "" : "s"} left in this sales week
            {m.curWeekEntry?.unconfirmed ? <Chip tone="amber" className="ml-2">Unconfirmed</Chip> : null}
          </div>
        </div>
        <div className="rounded-xl border border-sky-800 bg-slate-900 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Gap to next milestone</div>
          <div className="text-6xl font-black leading-none text-amber-400 sm:text-7xl">
            {nextTarget ? money(nextTarget.amount) : "—"}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-300">
            {nextTarget ? `${nextTarget.unlocks[0]} · ≈${nextTarget.apps} apps · ${nextTarget.daysLeft}d left` : "Everything in range is cleared."}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* THIS WEEK */}
        <Card title="This Week" icon={Calendar} tone={weekTone} onClick={() => go("weekly")}>
          <Stat label={`Sales week ${m.currentWeek}`} value={money(m.curWeekNap)} tone={weekTone} sub={weekRange(m.currentWeek)} size="text-3xl" />
          <div className="mt-3"><ProgressBar current={m.curWeekNap} target={GREEN_OUT} label="Green Out ($5,000)" /></div>
          <div className="mt-2 text-xs text-slate-400">
            {m.daysLeftInWeek} days remaining · gap to Green Out <span className="font-bold text-slate-100">{money(Math.max(0, GREEN_OUT - m.curWeekNap))}</span>
          </div>
        </Card>

        {/* THIS MONTH */}
        <Card title="This Month" icon={DollarSign} tone={m.thisMonth.failed ? "red" : m.thisMonth.nap > 0 ? "amber" : "gray"} onClick={() => go("monthly")}>
          <Stat label={m.currentMonth.label} value={money(m.thisMonth.nap)} tone={m.thisMonth.failed ? "red" : "amber"} sub={`${monthRange(m.currentMonth)} · ${m.currentMonth.weeks.length} weeks`} size="text-3xl" />
          <div className="mt-2 text-xs text-slate-400">
            Weeks used: <span className="font-bold text-slate-200">{m.thisMonth.weeksUsed}/{m.currentMonth.weeks.length}</span> ·
            Tier: <span className="font-bold text-slate-200">{m.thisMonth.tier.bonus ? money(m.thisMonth.tier.bonus) : "none"}</span>
          </div>
          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950 p-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Projected payout after A/T</div>
            <div className={`text-2xl font-black ${m.thisMonth.payout > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {money(m.thisMonth.payout)}
            </div>
            <div className="text-xs text-slate-500">
              {m.thisMonth.failed ? "Activity minimum failed — pays $0" : `${money(m.thisMonth.tier.bonus)} tier × ${pct(m.multiplier, 1)} multiplier`}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">{monthEndDays} days left in sales month</div>
        </Card>

        {/* ACTIVITY MINIMUM */}
        <Card title="⚠️ Activity Minimum" icon={AlertTriangle}
          tone={m.thisMonth.failed ? "red" : m.thisMonth.met ? "blue" : m.thisMonth.mustRunTheTable ? "red" : "amber"}
          pulse={m.thisMonth.failed || m.thisMonth.mustRunTheTable}
          onClick={() => go("monthly")}>
          <Stat label="Weeks produced / required"
            value={`${m.thisMonth.weeksProduced} / ${m.thisMonth.required}`}
            tone={m.thisMonth.failed ? "red" : m.thisMonth.met ? "blue" : "amber"} size="text-3xl" />
          <div className="mt-2"><ProgressBar current={m.thisMonth.weeksProduced} target={m.thisMonth.required} unit="wks" /></div>
          <div className={`mt-2 text-xs font-bold ${m.thisMonth.failed ? "text-red-400" : m.thisMonth.mustRunTheTable ? "text-red-400" : "text-slate-300"}`}>
            {m.thisMonth.failed
              ? "FAILED — bonus pays $0 this month regardless of NAP."
              : m.thisMonth.met
                ? "Requirement met — bonus is live."
                : m.thisMonth.mustRunTheTable
                  ? `AT RISK — must produce in ALL ${m.thisMonth.weeksRemaining} remaining weeks (${m.thisMonth.remainingWeekNums.join(", ")}).`
                  : `${m.thisMonth.required - m.thisMonth.weeksProduced} more production weeks needed, ${m.thisMonth.weeksRemaining} available.`}
          </div>
        </Card>

        {/* STRING CLUB */}
        <Card title="String Club" icon={Trophy} tone={m.stringBest ? "blue" : "gray"} onClick={() => go("string")}>
          <Stat label="Highest level achieved" value={m.stringBest ? m.stringBest.name : "None yet"} tone={m.stringBest ? "blue" : "gray"} sub={m.stringBest ? `${money(m.bestWeek.nap)} · week ${m.bestWeek.week}` : "First rung: Green Out $5,000"} size="text-2xl" />
          {m.stringNextThisWeek ? (
            <div className="mt-3">
              <ProgressBar current={m.curWeekNap} target={m.stringNextThisWeek.nap} label={`This week → ${m.stringNextThisWeek.name}`} />
              <div className="mt-1 text-xs text-slate-400">
                Gap in a single week: <span className="font-bold text-slate-100">{money(Math.max(0, m.stringNextThisWeek.nap - m.curWeekNap))}</span>
              </div>
            </div>
          ) : <div className="mt-3 text-sm font-bold text-sky-400">Soaring Eagle cleared.</div>}
        </Card>

        {/* GLU 101 */}
        <Card title="GLU 101" icon={Award} tone={glu.qualified ? "blue" : glu.expired ? "red" : urgencyTone(glu.qualDaysLeft)}
          pulse={urgencyPulse(glu.qualDaysLeft) && !glu.qualified} onClick={() => go("glu")}>
          <div className="text-xs text-slate-400">{glu.label}</div>
          <div className="mt-2 space-y-2">
            <ProgressBar current={glu.greenOuts} target={GLU_GREENOUT_TARGET} label="Green-Outs banked" unit="" />
            <ProgressBar current={glu.napInWindow} target={GLU_NAP_TARGET} label="NAP in window" />
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Qualification window: <span className={`font-bold ${TONE[urgencyTone(glu.qualDaysLeft)].text}`}>{glu.qualDaysLeft}d</span>
            {glu.reg ? <> · Registration {glu.regOpenIn > 0 ? `opens in ${glu.regOpenIn}d` : `closes in ${glu.regDaysLeft}d`}</> : null}
          </div>
        </Card>

        {/* A/T QUALITY */}
        <Card title="A/T Quality" icon={Shield} tone={atTone} onClick={() => go("quality")}>
          <Stat label="12-month A/T ratio" value={pct(m.atRatio, 1)} tone={atTone} sub={`Multiplier applied: ${pct(m.multiplier, 1)}${m.protectedNow ? " (new-agent protection)" : ""}`} size="text-4xl" />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-slate-700 bg-slate-950 p-2">
              <div className="uppercase text-slate-500">To 85% floor</div>
              <div className={`font-black ${m.atRatio >= AT_FLOOR ? "text-emerald-400" : "text-red-400"}`}>
                {m.atRatio >= AT_FLOOR ? `+${(m.atRatio - AT_FLOOR).toFixed(1)} pts clear` : `${(AT_FLOOR - m.atRatio).toFixed(1)} pts below`}
              </div>
            </div>
            <div className="rounded border border-slate-700 bg-slate-950 p-2">
              <div className="uppercase text-slate-500">To 120% ceiling</div>
              <div className="font-black text-slate-200">
                {m.atRatio >= AT_CEILING ? "Maxed" : `${(AT_CEILING - m.atRatio).toFixed(1)} pts`}
              </div>
            </div>
          </div>
          {m.protectedNow ? (
            <div className="mt-2 text-xs text-amber-400">
              New-agent 100% protection expires in <span className="font-black">{m.protectionDays}d</span> ({fmtLong(m.protectionEnd)})
            </div>
          ) : null}
        </Card>

        {/* ANNUAL NAP */}
        <Card title="Annual NAP" icon={TrendingUp} tone="amber" onClick={() => go("annual")}>
          <Stat label="Year to date" value={money(m.ytdNap)} tone="amber" sub={`${m.ytdApps} net apps · rank #${profile.rank}`} size="text-3xl" />
          <div className="mt-3"><ProgressBar current={m.ytdNap} target={170000} label="Pace vs. #60 estimate ($170k)" /></div>
          <div className="mt-1 text-xs text-slate-500">Top 150 is competitive, not a fixed threshold. Pace figures are estimates.</div>
        </Card>

        {/* STREAK */}
        <Card title="Streak" icon={Flame} tone={streakTone} pulse={m.zeroStreak >= 3} onClick={() => go("weekly")}>
          {m.zeroStreak > 0 ? (
            <>
              <Stat label="Consecutive zero weeks" value={`${m.zeroStreak}${m.unconfirmedZeroAhead ? " (likely " + (m.zeroStreak + 1) + ")" : ""}`} tone="red" size="text-5xl" />
              <div className="mt-2 text-xs font-bold text-red-400">
                Last production week: {m.completed.find((w) => Number(w.nap) > 0)?.week ?? "—"}. Break it this week.
              </div>
            </>
          ) : (
            <Stat label="Consecutive production weeks" value={m.prodStreak} tone="green" size="text-5xl" />
          )}
        </Card>
      </div>

      {/* NEXT TARGET hero */}
      <div className="rounded-xl border-2 border-amber-500 bg-slate-900 p-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
          <Target size={16} /> Next target
        </div>
        {nextTarget ? (
          <>
            <div className="mt-1 text-5xl font-black leading-none text-amber-400 sm:text-6xl">{money(nextTarget.amount)}</div>
            <div className="mt-2 text-lg font-bold text-slate-100">
              {money(nextTarget.amount)} {nextTarget.scope === "week" ? "this week" : nextTarget.scope === "month" ? "this month" : "in the window"} ={" "}
              {nextTarget.unlocks.join(" + ")}.
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-400">
              ≈ {nextTarget.apps} apps at {money(NAP_PER_APP)}/app · {nextTarget.daysLeft} day{nextTarget.daysLeft === 1 ? "" : "s"} left
              {nextTarget.daysLeft > 0 ? ` · ${appsFor(nextTarget.amount / nextTarget.daysLeft)} apps/day` : ""}
            </div>
          </>
        ) : (
          <div className="mt-2 text-lg font-bold text-slate-300">Every tracked milestone in range is cleared.</div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 2 — WEEKLY LOG / DATA ENTRY
   ========================================================================== */

function WeeklyTab({ model: m, weeks, saveWeek, deleteWeek, setAtRatio, quickAdd, addEagle, profile }) {
  const [form, setForm] = useState({
    week: m.currentWeek, nap: "", gross: "", netApps: "", grossApps: "", notes: "", at: "", unconfirmed: false,
  });
  const [eagle, setEagle] = useState({ client: "", writeUpDate: isoDate(m.today), submittedDate: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const existing = m.byWeek[Number(form.week)];
  const napNum = form.nap === "" ? 0 : Number(form.nap);
  const previewLevel = stringLevelFor(napNum);

  const submit = async (e) => {
    e.preventDefault();
    const w = Number(form.week);
    if (!w || w < 1 || w > 53) return;
    const ok = await saveWeek({
      week: w,
      nap: form.nap === "" ? 0 : Number(form.nap),
      gross: form.gross === "" ? null : Number(form.gross),
      netApps: form.netApps === "" ? 0 : Number(form.netApps),
      grossApps: form.grossApps === "" ? null : Number(form.grossApps),
      notes: form.notes,
      unconfirmed: !!form.unconfirmed,
    });
    if (ok) {
      if (form.at !== "") await setAtRatio(Number(form.at));
      setForm({ ...form, nap: "", gross: "", netApps: "", grossApps: "", notes: "", at: "" });
    }
  };

  const chartData = weeks.filter((w) => w.week >= 17).map((w) => ({
    name: `W${w.week}`, nap: Number(w.nap) || 0, apps: Number(w.netApps) || 0,
  }));

  return (
    <div className="space-y-4">
      <SectionTitle icon={Calendar} sub="Net premium is the number that counts for everything. Negative weeks are real — log them.">
        Weekly Log
      </SectionTitle>

      <RuleBox title="Rule — the sales week">
        <p>A sales week runs Monday through Sunday and is labeled by the Monday it begins. FHD pays on sales months made of whole sales weeks, not calendar months.</p>
        <p className="text-slate-400">Current: week {m.currentWeek} ({weekRange(m.currentWeek)}) · {m.daysLeftInWeek} days remaining · sales month {m.currentMonth.label}.</p>
      </RuleBox>

      {m.zeroStreak > 0 ? (
        <div className="rounded-xl border border-red-500 bg-red-950 p-3 text-sm font-bold text-red-300">
          <AlertTriangle className="mr-2 inline" size={16} />
          {m.zeroStreak} consecutive completed zero weeks{m.unconfirmedZeroAhead ? " (likely 7 — week 31 unconfirmed)" : ""}. Any new zero week extends the streak.
        </div>
      ) : null}

      <Panel>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Sales week #" hint={`Week ${form.week}: ${weekRange(Number(form.week) || m.currentWeek)}${existing ? " · ALREADY LOGGED" : ""}`}>
            <input type="number" className={inputCls} value={form.week} onChange={set("week")} />
          </Field>
          <Field label="Net premium (NAP)" hint="Negative allowed — chargeback weeks count against you.">
            <input type="number" step="0.01" className={inputCls} value={form.nap} onChange={set("nap")} placeholder="0" />
          </Field>
          <Field label="Gross premium" hint="Drives the CAI / chargeback %.">
            <input type="number" step="0.01" className={inputCls} value={form.gross} onChange={set("gross")} placeholder="optional" />
          </Field>
          <Field label="Net apps"><input type="number" className={inputCls} value={form.netApps} onChange={set("netApps")} placeholder="0" /></Field>
          <Field label="Gross apps"><input type="number" className={inputCls} value={form.grossApps} onChange={set("grossApps")} placeholder="optional" /></Field>
          <Field label="Updated 12-month A/T ratio (%)" hint={`Current on file: ${pct(profile.atRatio, 1)}`}>
            <input type="number" step="0.1" className={inputCls} value={form.at} onChange={set("at")} placeholder="optional" />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Notes"><input className={inputCls} value={form.notes} onChange={set("notes")} placeholder="What moved, what stalled" /></Field>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <input type="checkbox" checked={form.unconfirmed} onChange={(e) => setForm({ ...form, unconfirmed: e.target.checked })} />
            Unconfirmed (awaiting Agent Register)
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button type="submit" className={`${btnCls} bg-sky-600 text-white`}><Save size={14} /> {existing ? "Overwrite week" : "Log week"}</button>
            {napNum !== 0 ? (
              <span className="text-xs text-slate-400">
                {money(napNum)} → {previewLevel ? <span className="font-bold text-sky-400">{previewLevel.name}</span> : <span className="text-slate-500">below Green Out</span>}
                {" · "}{Math.round(napNum / NAP_PER_APP)} apps equivalent
              </span>
            ) : null}
          </div>
        </form>
      </Panel>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel>
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Quick-add today's activity</div>
          <div className="flex flex-wrap gap-2">
            {[["doors", "Door / call", 10], ["doors", "Door / call", 1], ["presentations", "Presentation", 1], ["apps", "App written", 1], ["referrals", "Referral", 1]].map(([f, label, n], i) => (
              <button key={i} onClick={() => quickAdd(f, n)} className={`${btnCls} border border-slate-700 bg-slate-800 text-slate-200`}>
                <Plus size={14} /> {n > 1 ? `${n} ` : ""}{label}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            This week: {m.actTotals.doors} doors/calls · {m.actTotals.presentations} presentations · {m.actTotals.apps} apps · {m.actTotals.referrals} referrals
          </div>
        </Panel>

        <Panel>
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Log an Eagle write-up</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input className={inputCls} placeholder="Client / policy" value={eagle.client} onChange={(e) => setEagle({ ...eagle, client: e.target.value })} />
            <input type="date" className={inputCls} value={eagle.writeUpDate} onChange={(e) => setEagle({ ...eagle, writeUpDate: e.target.value })} />
            <input type="date" className={inputCls} value={eagle.submittedDate} onChange={(e) => setEagle({ ...eagle, submittedDate: e.target.value })} />
          </div>
          <button
            onClick={() => { if (!eagle.writeUpDate) return; addEagle({ ...eagle, id: "eagle-" + Date.now() }); setEagle({ client: "", writeUpDate: isoDate(m.today), submittedDate: "" }); }}
            className={`${btnCls} mt-2 bg-emerald-600 text-white`}>
            <Plus size={14} /> Start 14-day clock
          </button>
          <div className="mt-1 text-xs text-slate-500">Write-up date · submission date (leave blank until submitted).</div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Weekly NAP — full history</div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-45} textAnchor="end" height={40} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }} formatter={(v) => money(v)} />
              <ReferenceLine y={GREEN_OUT} stroke="#22c55e" strokeDasharray="4 4" />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="nap">
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.nap < 0 ? "#ef4444" : d.nap >= GREEN_OUT ? "#0ea5e9" : d.nap > 0 ? "#f59e0b" : "#334155"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 text-xs text-slate-500">Dashed green line = $5,000 Green Out.</div>
      </Panel>

      <Table
        headers={["Wk", "Week of", "Net NAP", "Net apps", "Gross", "Level", "Notes", ""]}
        rows={[...weeks].sort((a, b) => b.week - a.week).map((w) => {
          const lvl = stringLevelFor(Number(w.nap) || 0);
          return [
            <span className="font-bold text-slate-100">{w.week}{w.unconfirmed ? "*" : ""}</span>,
            weekRange(w.week),
            <span className={Number(w.nap) < 0 ? "font-bold text-red-400" : Number(w.nap) >= GREEN_OUT ? "font-bold text-sky-400" : Number(w.nap) > 0 ? "font-bold text-amber-400" : "text-slate-500"}>{money(w.nap)}</span>,
            w.netApps,
            w.gross === null || w.gross === undefined ? "—" : money(w.gross),
            lvl ? <Chip tone="blue">{lvl.name}</Chip> : "—",
            <span className="text-xs text-slate-500">{w.notes}</span>,
            <button onClick={() => deleteWeek(w.week)} className="text-slate-600"><Trash2 size={14} /></button>,
          ];
        })}
      />
      <p className="text-xs text-slate-500">* unconfirmed — awaiting Agent Register. Historical gross premium was not itemized by week; 12-month gross/CAI lives on the Quality tab.</p>
    </div>
  );
}

/* ============================================================================
   SECTION 5 — MONTHLY BONUS DRILL-DOWN
   ========================================================================== */

function MonthlyTab({ model: m }) {
  const a = m.thisMonth;
  const weekBars = a.month.weeks.map((w) => {
    const e = m.byWeek[w];
    return { name: `W${w}`, nap: e ? Number(e.nap) || 0 : 0, future: daysBetween(m.today, weekEnd(w)) >= 0 && !e };
  });
  const daysLeft = daysBetween(m.today, monthEnd(a.month)) + 1;

  return (
    <div className="space-y-4">
      <SectionTitle icon={DollarSign} sub="Personal NAP per sales month, gated by the activity minimum and multiplied by A/T.">
        Monthly Cash Bonus — {a.month.label}
      </SectionTitle>

      <RuleBox title="Official rule — Monthly Cash Bonus">
        <p>Paid on personal NAP within a sales month. Tiers: $15,000 → $375 · $20,000 → $750 · $30,000 → $1,500 · $40,000 → $2,000 · $50,000 → $3,000 · $60,000 → $3,500 · $70,000 → $4,000 · $80,000 → $4,500 · $90,000 → $5,000 · $100,000 → $6,000. New agents only: $10,000 NAP pays $250.</p>
        <p>Activity minimum: business must be produced in at least 3 weeks of a 4-week sales month, or 4 weeks of a 5-week sales month. Fail it and the bonus pays $0 regardless of NAP.</p>
        <p>The Quality Business Multiplier (12-month A/T ratio) is applied to the tier amount. Below 85% A/T, everything zeroes out.</p>
      </RuleBox>

      {a.failed ? <ActivityAlarm agg={a} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel tone={a.nap > 0 ? "amber" : "gray"}>
          <Stat label="NAP so far" value={money(a.nap)} tone={a.nap > 0 ? "amber" : "gray"} size="text-4xl" sub={`${monthRange(a.month)} · ${a.month.weeks.length}-week month`} />
        </Panel>
        <Panel tone={a.failed ? "red" : a.payout > 0 ? "green" : "gray"}>
          <Stat label="Projected payout (after A/T)" value={money(a.payout)} tone={a.failed ? "red" : a.payout > 0 ? "green" : "gray"} size="text-4xl"
            sub={a.failed ? "Activity minimum failed — $0" : `${money(a.tier.bonus)} tier × ${pct(m.multiplier, 1)}`} />
        </Panel>
        <Panel tone={urgencyTone(daysLeft)} pulse={urgencyPulse(daysLeft)}>
          <Stat label="Days left in sales month" value={daysLeft} tone={urgencyTone(daysLeft)} size="text-4xl" sub={`Closes ${fmtLong(monthEnd(a.month))}`} />
        </Panel>
      </div>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Week-by-week — {a.month.label}</div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekBars}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} formatter={(v) => money(v)} />
              <ReferenceLine y={GREEN_OUT} stroke="#22c55e" strokeDasharray="4 4" />
              <Bar dataKey="nap">
                {weekBars.map((d, i) => <Cell key={i} fill={d.nap < 0 ? "#ef4444" : d.nap >= GREEN_OUT ? "#0ea5e9" : d.nap > 0 ? "#f59e0b" : d.future ? "#334155" : "#7f1d1d"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Tier ladder</div>
        <div className="space-y-2">
          {[...BONUS_TIERS].sort((x, y) => x.nap - y.nap).map((t) => {
            const cleared = a.nap >= t.nap;
            const isNext = a.next && a.next.nap === t.nap;
            const tone = cleared ? "blue" : isNext ? "amber" : "gray";
            return (
              <div key={t.nap} className={`flex items-center justify-between gap-3 rounded-lg border ${TONE[tone].ring} bg-slate-950 px-3 py-2 ${isNext ? "animate-pulse" : ""}`}>
                <div className="flex items-center gap-2">
                  {cleared ? <CheckCircle2 size={16} className="text-sky-400" /> : <Lock size={16} className="text-slate-600" />}
                  <span className={`font-bold ${TONE[tone].text}`}>{money(t.nap)}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-slate-200">{money(t.bonus)}</div>
                  <div className="text-xs text-slate-500">after A/T: {money(Math.round(t.bonus * (m.multiplier / 100)))}</div>
                </div>
                <div className="w-24 text-right text-xs text-slate-400">{cleared ? "cleared" : `gap ${money(t.nap - a.nap)}`}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel tone="amber">
        <div className="text-xs font-black uppercase tracking-widest text-slate-400">Required pace to the next tier</div>
        {a.next ? (
          <>
            <div className="mt-1 text-2xl font-black text-amber-400">
              {money(a.gapToNext)} more → {money(a.next.nap)} tier ({money(a.next.bonus)}, {money(Math.round(a.next.bonus * (m.multiplier / 100)))} after A/T)
            </div>
            <div className="mt-2"><GapTriad dollars={a.gapToNext} dailyNap={m.dailyNap} /></div>
            <div className="mt-2 text-sm text-slate-300">
              {a.weeksRemaining > 0
                ? <>Required pace: <span className="font-black text-slate-100">{money(Math.ceil(a.paceNeeded))}/week</span> across the {a.weeksRemaining} remaining week{a.weeksRemaining === 1 ? "" : "s"} ({a.remainingWeekNums.join(", ")}) — {appsFor(a.paceNeeded)} apps per week.</>
                : "No weeks remain in this sales month."}
            </div>
          </>
        ) : <div className="mt-1 text-2xl font-black text-sky-400">Top tier cleared.</div>}
      </Panel>

      <div>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Sales month history</div>
        <Table
          headers={["Sales month", "Weeks", "Range", "NAP", "Wks produced", "Min", "Tier", "After A/T", "Status"]}
          rows={m.months.map((x) => [
            <span className="font-bold text-slate-100">{x.month.label}{x.month.derived ? "†" : ""}</span>,
            `${x.month.weeks[0]}–${x.month.weeks[x.month.weeks.length - 1]}`,
            monthRange(x.month),
            <span className={x.nap > 0 ? "font-bold text-amber-400" : "text-slate-500"}>{money(x.nap)}</span>,
            <span className={x.met ? "font-bold text-emerald-400" : "font-bold text-red-400"}>{x.weeksProduced}</span>,
            x.required,
            x.tier.bonus ? money(x.tier.bonus) : "—",
            <span className={x.payout > 0 ? "font-bold text-emerald-400" : "text-red-400"}>{money(x.payout)}</span>,
            x.failed ? <Chip tone="red">Min failed</Chip> : x.closed ? <Chip tone="gray">Closed</Chip> : x.month.key === m.currentMonth.key ? <Chip tone="amber">In progress</Chip> : <Chip tone="gray">Future</Chip>,
          ])}
        />
        <p className="mt-1 text-xs text-slate-500">† Apr–Jul sales months are derived from the same Monday-anchored week pattern as the published Aug–Dec calendar.</p>
      </div>
    </div>
  );
}

/* ============================================================================
   STRING CLUB
   ========================================================================== */

function StringTab({ model: m }) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={Trophy} sub="Single-week NAP records. One week, one number.">String Club</SectionTitle>

      <RuleBox title="Official rule — String Club">
        <p>Recognition levels earned on single-week NAP: Green Out $5,000 · Globe Week $7,500 · Flight of the Eagle $10,000 · Leaders Eagle $15,000 · Heritage Eagle $20,000 · Soaring Eagle $25,000.</p>
      </RuleBox>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel tone="blue"><Stat label="Highest level achieved" value={m.stringBest ? m.stringBest.name : "None"} tone="blue" size="text-2xl" sub={m.stringBest ? `Week ${m.bestWeek.week} · ${money(m.bestWeek.nap)}` : "—"} /></Panel>
        <Panel tone="amber"><Stat label={`Week ${m.currentWeek} in progress`} value={money(m.curWeekNap)} tone="amber" size="text-3xl" sub={`${m.daysLeftInWeek} days left`} /></Panel>
        <Panel tone="gray"><Stat label="Green-Out weeks (career)" value={m.greenOutWeeks.length} tone={m.greenOutWeeks.length ? "blue" : "gray"} size="text-3xl" sub={m.greenOutWeeks.map((w) => `W${w.week}`).join(", ") || "—"} /></Panel>
      </div>

      <Panel>
        <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">The ladder</div>
        <div className="space-y-2">
          {STRING_CLUB.map((l) => {
            const achieved = m.bestWeek.nap >= l.nap;
            const isNext = m.stringNextThisWeek && m.stringNextThisWeek.nap === l.nap;
            const tone = achieved ? "blue" : isNext ? "amber" : "gray";
            const gap = Math.max(0, l.nap - m.curWeekNap);
            return (
              <div key={l.name} className={`rounded-lg border ${TONE[tone].ring} bg-slate-950 p-3 ${isNext ? "animate-pulse" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-black uppercase tracking-wide ${TONE[tone].text}`}>
                    {achieved ? <CheckCircle2 className="mr-2 inline" size={16} /> : null}{l.name}
                  </span>
                  <span className="font-bold text-slate-200">{money(l.nap)}</span>
                </div>
                <div className="mt-2"><ProgressBar current={m.curWeekNap} target={l.nap} tone={tone} /></div>
                {!achieved ? <div className="mt-2"><GapTriad dollars={gap} dailyNap={m.dailyNap} /></div> : (
                  <div className="mt-1 text-xs font-bold text-sky-400">Achieved — week {m.bestWeek.week}, {money(m.bestWeek.nap)}</div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <div>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Every week vs. the ladder</div>
        <Table
          headers={["Wk", "Week of", "NAP", "Level earned", "Gap to next rung"]}
          rows={[...m.completed, ...(m.curWeekEntry ? [m.curWeekEntry] : [])]
            .filter((v, i, arr) => arr.findIndex((x) => x.week === v.week) === i)
            .sort((a, b) => b.week - a.week)
            .map((w) => {
              const nap = Number(w.nap) || 0;
              const lvl = stringLevelFor(nap);
              const nxt = nextStringLevel(nap);
              return [w.week, weekRange(w.week), money(nap),
                lvl ? <Chip tone="blue">{lvl.name}</Chip> : <span className="text-slate-600">—</span>,
                nxt ? `${money(nxt.nap - nap)} → ${nxt.name}` : "maxed"];
            })}
        />
      </div>
    </div>
  );
}

/* ============================================================================
   GLU 101
   ========================================================================== */

function GluTab({ model: m }) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={Award} sub="Foundations of Agency Building — two parallel paths, whichever lands first.">GLU 101</SectionTitle>

      <RuleBox title="Official rule — GLU 101">
        <p>Qualify with EITHER three Green-Outs ($5,000+ single weeks) OR $30,000 NAP inside the qualification window.</p>
        <p>Aug 19–21, 2026 session — qualification window Apr 6 – Jul 19, 2026 · registration CLOSED.</p>
        <p>Nov 4–6, 2026 session — qualification window Jul 22 – Oct 4, 2026 · registration Sep 14 – Oct 16, 2026.</p>
      </RuleBox>

      {m.gluSessions.map((s) => {
        const live = s.livePath === "greenouts";
        const dead = s.expired;
        return (
          <Panel key={s.id} tone={s.qualified ? "blue" : dead ? "gray" : urgencyTone(s.qualDaysLeft)} pulse={!dead && !s.qualified && urgencyPulse(s.qualDaysLeft)}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-black uppercase tracking-wide text-slate-100">{s.label}</span>
              {s.qualified ? <Chip tone="blue">Qualified</Chip> : dead ? <Chip tone="gray">Window closed</Chip> : <Chip tone="amber">Open</Chip>}
            </div>
            <div className="text-xs text-slate-400">
              Qualification window {fmtLong(s.qual[0])} – {fmtLong(s.qual[1])}
              {s.reg ? ` · Registration ${fmtLong(s.reg[0])} – ${fmtLong(s.reg[1])}` : " · Registration closed"}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={`rounded-lg border p-3 ${live && !dead ? "border-amber-500 bg-amber-950" : "border-slate-700 bg-slate-950"}`}>
                <div className="mb-1 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-300">
                  Path A — three Green-Outs {live && !dead ? <Chip tone="amber">Live path</Chip> : null}
                </div>
                <ProgressBar current={s.greenOuts} target={GLU_GREENOUT_TARGET} unit="" />
                <div className="mt-2 text-xs text-slate-400">
                  {s.goGap > 0 ? <>{s.goGap} more Green-Out{s.goGap === 1 ? "" : "s"} — each needs {money(GREEN_OUT)} in a single week.</> : "Path complete."}
                </div>
              </div>
              <div className={`rounded-lg border p-3 ${!live && !dead ? "border-amber-500 bg-amber-950" : "border-slate-700 bg-slate-950"}`}>
                <div className="mb-1 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-300">
                  Path B — $30,000 NAP {!live && !dead ? <Chip tone="amber">Live path</Chip> : null}
                </div>
                <ProgressBar current={s.napInWindow} target={GLU_NAP_TARGET} />
                <div className="mt-2"><GapTriad dollars={s.napGap} dailyNap={m.dailyNap} /></div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Countdown date={s.qual[1]} label="Qualification window closes" />
              {s.reg ? (
                s.regOpenIn > 0
                  ? <Countdown date={s.reg[0]} label="Registration opens" />
                  : <Countdown date={s.reg[1]} label="Registration closes" />
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registration</div>
                  <div className="text-2xl font-black text-slate-500">CLOSED</div>
                </div>
              )}
            </div>

            {!dead && s.qualDaysLeft > 0 ? (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
                Required pace on Path B: <span className="font-black text-amber-400">{money(Math.ceil(s.napGap / Math.max(1, Math.ceil(s.qualDaysLeft / 7))))}/week</span>{" "}
                across the ~{Math.ceil(s.qualDaysLeft / 7)} weeks left ({appsFor(s.napGap / Math.max(1, Math.ceil(s.qualDaysLeft / 7)))} apps/week).
                Path A needs {s.goGap} of those weeks to land at {money(GREEN_OUT)}+.
              </div>
            ) : null}

            <div className="mt-3">
              <Table
                headers={["Wk", "Week of", "NAP", "Green Out?"]}
                empty="No weeks logged inside this window."
                rows={m.completed.concat(m.curWeekEntry ? [m.curWeekEntry] : [])
                  .filter((v, i, arr) => arr.findIndex((x) => x.week === v.week) === i)
                  .filter((w) => { const ws = weekStart(w.week); return ws >= startOfDay(s.qual[0]) && ws <= startOfDay(s.qual[1]); })
                  .sort((a, b) => b.week - a.week)
                  .map((w) => [w.week, weekRange(w.week), money(w.nap),
                    Number(w.nap) >= GREEN_OUT ? <Chip tone="blue">Yes</Chip> : <span className="text-slate-600">no</span>])}
              />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/* ============================================================================
   SECTION 6 — QUALITY (A/T) DRILL-DOWN
   ========================================================================== */

const CONS_STATUSES = ["Open", "Contacted", "Saved", "Lost"];
const consTone = (s) => (s === "Saved" ? "blue" : s === "Lost" ? "red" : s === "Contacted" ? "amber" : "gray");

function QualityTab({ model: m, profile, setAtRatio, conservation, setConsStatus, addConservation }) {
  const [ratio, setRatio] = useState(String(profile.atRatio));
  const [row, setRow] = useState({ policy: "", name: "", reason: "", monthly: "" });
  const atData = (profile.atHistory || []).map((h) => ({ name: h.label, ratio: Number(h.ratio) }));
  const caiData = m.completed.filter((w) => w.gross !== null && w.gross !== undefined && Number(w.gross) > 0)
    .sort((a, b) => a.week - b.week)
    .map((w) => ({ name: `W${w.week}`, cai: ((Number(w.gross) - Number(w.nap)) / Number(w.gross)) * 100 }));

  return (
    <div className="space-y-4">
      <SectionTitle icon={Shield} sub="The multiplier on everything. Below 85% and the bonuses zero out.">Quality — 12-month A/T ratio</SectionTitle>

      <RuleBox title="Official rule — Quality Business Multiplier">
        <p>120%+ A/T → 120% multiplier. 100–119% → multiplier equals the ratio. 85–99% → multiplier equals the ratio. Below 85% → 0%, everything zeroes out.</p>
        <p>Applies to the Monthly Cash Bonus and the Quarterly Stock Bonus. 85%+ is also required for Annual Awards. New agents are given 100% A/T automatically for their first 6 months.</p>
      </RuleBox>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Panel tone={m.atRatio >= AT_FLOOR ? "green" : "red"}><Stat label="12-month A/T" value={pct(m.atRatio, 1)} tone={m.atRatio >= AT_FLOOR ? "green" : "red"} size="text-4xl" /></Panel>
        <Panel tone={m.multiplier ? "blue" : "red"}><Stat label="Multiplier applied" value={pct(m.multiplier, 1)} tone={m.multiplier ? "blue" : "red"} size="text-4xl" sub={m.protectedNow ? "New-agent protection active" : "Actual ratio"} /></Panel>
        <Panel tone={m.atRatio >= AT_FLOOR ? "green" : "red"}><Stat label="Distance to 85% floor" value={m.atRatio >= AT_FLOOR ? `+${(m.atRatio - AT_FLOOR).toFixed(1)} pts` : `${(AT_FLOOR - m.atRatio).toFixed(1)} pts short`} tone={m.atRatio >= AT_FLOOR ? "green" : "red"} size="text-3xl" /></Panel>
        <Panel tone="gray"><Stat label="Distance to 120% ceiling" value={m.atRatio >= AT_CEILING ? "Maxed" : `${(AT_CEILING - m.atRatio).toFixed(1)} pts`} tone="gray" size="text-3xl" /></Panel>
      </div>

      {m.protectedNow ? (
        <Panel tone={urgencyTone(m.protectionDays)} pulse={urgencyPulse(m.protectionDays)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">New-agent 100% A/T protection expires</div>
              <div className={`text-4xl font-black ${TONE[urgencyTone(m.protectionDays)].text}`}>{m.protectionDays} days</div>
              <div className="text-xs text-slate-400">{fmtLong(m.protectionEnd)} — 6 months from first new business {fmtLong(parseISO(profile.firstBusinessDate))}</div>
            </div>
            <div className="text-sm text-slate-300">
              After that date the multiplier drops to the real ratio: <span className="font-black text-amber-400">{pct(rawMultiplier(m.atRatio), 1)}</span> at today's {pct(m.atRatio, 1)}.
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">A/T trend — 85% floor / 120% ceiling</div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={atData}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis domain={[70, 130]} stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} formatter={(v) => pct(v, 1)} />
              <ReferenceLine y={AT_FLOOR} stroke="#ef4444" strokeWidth={2} />
              <ReferenceLine y={AT_CEILING} stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="ratio" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Field label="Update 12-month A/T (%)"><input className={inputCls} type="number" step="0.1" value={ratio} onChange={(e) => setRatio(e.target.value)} /></Field>
          <button onClick={() => setAtRatio(ratio)} className={`${btnCls} bg-sky-600 text-white`}><Save size={14} /> Save ratio</button>
        </div>
      </Panel>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">CAI % — where NAP leaks</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="12-month CAI" value={pct(profile.cai12mo, 1)} tone="red" size="text-4xl" sub={`${money(profile.cai12moGross)} gross → ${money(profile.cai12moNet)} net`} />
          <Stat label="YTD gross premium" value={money(profile.ytdGross)} tone="gray" size="text-3xl" sub={`vs. ${money(m.ytdNap)} net`} />
          <Stat label="Implied YTD chargeback rate" value={pct(profile.ytdGross > 0 ? ((profile.ytdGross - m.ytdNap) / profile.ytdGross) * 100 : 0, 1)} tone="amber" size="text-3xl" sub="every point here is NAP you already wrote" />
        </div>
        {caiData.length > 0 ? (
          <div className="mt-3 h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={caiData}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} formatter={(v) => pct(v, 1)} />
                <ReferenceLine y={profile.cai12mo} stroke="#f59e0b" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="cai" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-500">
            Per-week CAI needs gross premium logged alongside net. Log gross on the Weekly Log tab and this trend fills in.
          </div>
        )}
      </Panel>

      <Panel>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Conservation tracker</span>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-sky-400">NAP saved <span className="font-black">{money(m.napSaved)}</span></span>
            <span className="text-amber-400">At risk <span className="font-black">{money(m.napAtRisk)}</span></span>
            <span className="text-red-400">Lost <span className="font-black">{money(m.napLost)}</span></span>
          </div>
        </div>
        <div className="space-y-2">
          {m.consRows.map((c) => (
            <div key={c.id} className={`rounded-lg border ${TONE[consTone(c.status)].ring} bg-slate-950 p-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-100">{c.name}</div>
                  <div className="text-xs text-slate-400">Policy {c.policy} · {c.reason} · {money(c.monthly, 2)}/mo · {money(c.annual, 2)} annualized</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {CONS_STATUSES.map((s) => (
                    <button key={s} onClick={() => setConsStatus(c.id, s)}
                      className={`rounded border px-2 py-1 text-xs font-bold uppercase ${c.status === s ? TONE[consTone(s)].chip : "border-slate-700 bg-slate-900 text-slate-500"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {m.consRows.length === 0 ? <div className="text-sm text-slate-500">No open conservation items.</div> : null}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
          <input className={inputCls} placeholder="Policy #" value={row.policy} onChange={(e) => setRow({ ...row, policy: e.target.value })} />
          <input className={inputCls} placeholder="Client name" value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} />
          <input className={inputCls} placeholder="Reason (NSF, terminated…)" value={row.reason} onChange={(e) => setRow({ ...row, reason: e.target.value })} />
          <input className={inputCls} type="number" step="0.01" placeholder="$/mo" value={row.monthly} onChange={(e) => setRow({ ...row, monthly: e.target.value })} />
          <button className={`${btnCls} bg-slate-700 text-slate-100`}
            onClick={() => { if (!row.policy && !row.name) return; addConservation({ ...row, monthly: Number(row.monthly) || 0, id: "cons-" + Date.now(), status: "Open", logged: isoDate(m.today) }); setRow({ policy: "", name: "", reason: "", monthly: "" }); }}>
            <Plus size={14} /> Add item
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================================
   SECTION — EAGLES & EXTRAS
   ========================================================================== */

function EaglesTab({ model: m, updateEagle, deleteEagle, addEagle }) {
  const [e2, setE2] = useState({ client: "", writeUpDate: isoDate(m.today), submittedDate: "" });
  return (
    <div className="space-y-4">
      <SectionTitle icon={Star} sub="Deadline-driven money. Miss the 14-day window and the $100 is gone.">Eagles & Extras</SectionTitle>

      <RuleBox title="Official rule — $100 Eagle Bonus">
        <p>$100 is paid for every Eagle write-up submitted within 2 weeks (14 days) of the write-up date. Submit late and the $100 is forfeited.</p>
      </RuleBox>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel tone="blue"><Stat label="Eagle bonus earned" value={money(m.eagleEarned)} tone="blue" size="text-4xl" /></Panel>
        <Panel tone="red"><Stat label="Forfeited (late / expired)" value={money(m.eagleForfeited)} tone="red" size="text-4xl" /></Panel>
        <Panel tone="amber"><Stat label="Clocks running" value={m.eagleRows.filter((e) => !e.submitted && !e.expired).length} tone="amber" size="text-4xl" /></Panel>
      </div>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Log a write-up</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input className={inputCls} placeholder="Client / policy" value={e2.client} onChange={(ev) => setE2({ ...e2, client: ev.target.value })} />
          <Field label="Write-up date"><input type="date" className={inputCls} value={e2.writeUpDate} onChange={(ev) => setE2({ ...e2, writeUpDate: ev.target.value })} /></Field>
          <Field label="Submitted date"><input type="date" className={inputCls} value={e2.submittedDate} onChange={(ev) => setE2({ ...e2, submittedDate: ev.target.value })} /></Field>
          <button className={`${btnCls} self-end bg-emerald-600 text-white`}
            onClick={() => { if (!e2.writeUpDate) return; addEagle({ ...e2, id: "eagle-" + Date.now() }); setE2({ client: "", writeUpDate: isoDate(m.today), submittedDate: "" }); }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </Panel>

      <div className="space-y-2">
        {m.eagleRows.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">No Eagle write-ups logged yet. Each one is $100 if it lands inside 14 days.</div>
        ) : null}
        {m.eagleRows.map((e) => {
          const tone = e.submitted ? (e.onTime ? "blue" : "red") : e.expired ? "red" : e.daysLeft <= 4 ? "red" : e.daysLeft <= 7 ? "amber" : "green";
          return (
            <Panel key={e.id} tone={tone} pulse={!e.submitted && !e.expired && e.daysLeft <= 4}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-black text-slate-100">{e.client || "Unnamed write-up"}</div>
                  <div className="text-xs text-slate-400">
                    Written {fmtLong(parseISO(e.writeUpDate))} · due {e.due ? fmtLong(e.due) : "—"}
                    {e.submitted ? ` · submitted ${fmtLong(parseISO(e.submittedDate))}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  {e.submitted ? (
                    <div className={`text-2xl font-black ${e.onTime ? "text-sky-400" : "text-red-400"}`}>
                      {e.onTime ? "+$100 EARNED" : "LATE — $100 forfeited"}
                    </div>
                  ) : e.expired ? (
                    <div className="text-2xl font-black text-red-400">EXPIRED — $100 forfeited</div>
                  ) : (
                    <div className={`text-3xl font-black ${TONE[tone].text}`}>{e.daysLeft}d left</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {!e.submitted ? (
                    <button onClick={() => updateEagle(e.id, { submittedDate: isoDate(m.today) })} className={`${btnCls} bg-emerald-600 text-white`}>
                      <CheckCircle2 size={14} /> Mark submitted today
                    </button>
                  ) : null}
                  <button onClick={() => deleteEagle(e.id)} className={`${btnCls} border border-slate-700 bg-slate-900 text-slate-400`}><Trash2 size={14} /></button>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel tone={m.ytdNap >= LICENSE_REIMB_NAP ? "blue" : "amber"}>
        <div className="text-xs font-black uppercase tracking-widest text-slate-400">License reimbursement</div>
        <RuleBox title="Official rule"><p>$50,000 cumulative NAP earns reimbursement of licensing expenses.</p></RuleBox>
        <div className="mt-3"><ProgressBar current={m.ytdNap} target={LICENSE_REIMB_NAP} label="Cumulative NAP" /></div>
        <div className="mt-2"><GapTriad dollars={m.licenseGap} dailyNap={m.dailyNap} /></div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Panel tone="gray">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">"I Dare You!" — 13-week contest</div>
          <div className="mt-2 text-2xl font-black text-slate-500">Watch for announcement</div>
          <p className="mt-1 text-sm text-slate-400">No published thresholds. Nothing is computed against this until the rules drop.</p>
        </Panel>
        <Panel tone="gray">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Record Breakers</div>
          <div className="mt-2 text-2xl font-black text-slate-500">Watch for announcement</div>
          <p className="mt-1 text-sm text-slate-400">No published thresholds. Informational only.</p>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================================
   ANNUAL & QUARTERLY
   ========================================================================== */

function AnnualTab({ model: m, profile }) {
  const yearEnd = monthEnd(SALES_MONTHS[SALES_MONTHS.length - 1]);
  const weeksLeft = Math.max(0, Math.ceil((daysBetween(m.today, yearEnd) + 1) / 7));
  const projCurrent = m.ytdNap + m.weeklyPace * weeksLeft;
  const proj18 = m.ytdNap + m.week18Pace * weeksLeft;

  return (
    <div className="space-y-4">
      <SectionTitle icon={TrendingUp} sub="Quarterly stock, the Top 150 race, and the dormant 2027 Mid-Year window.">Annual & Quarterly</SectionTitle>

      <RuleBox title="Official rule — Quarterly Stock Bonus">
        <p>Three Monthly Cash Bonuses of $20,000+ NAP each within one quarter earns $2,000 in Globe Life stock plus a $105 mobile technology fee reimbursement. Requires 85%+ A/T.</p>
        <p>Q3 = July + August + September sales months. Q4 = October + November + December sales months.</p>
      </RuleBox>

      {m.quarters.map((q) => (
        <Panel key={q.key} tone={q.achieved ? "blue" : q.possible ? "amber" : "red"}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-lg font-black uppercase tracking-wide text-slate-100">{q.label}</span>
            {q.achieved ? <Chip tone="blue">Earned</Chip> : q.possible ? <Chip tone="amber">{q.cleared}/3 slots</Chip> : <Chip tone="red">Out of reach</Chip>}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {q.slots.map((s) => {
              const tone = s.cleared ? "green" : s.closed ? "red" : "gray";
              return (
                <div key={s.key} className={`rounded-lg border ${TONE[tone].ring} ${s.cleared ? "bg-emerald-950" : "bg-slate-950"} p-3`}>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{s.label}</div>
                  <div className={`text-2xl font-black ${TONE[tone].text}`}>{money(s.nap)}</div>
                  <ProgressBar current={s.nap} target={QUARTERLY_STOCK_NAP} showGap={false} height="h-2" />
                  <div className="mt-1 text-xs text-slate-400">
                    {s.cleared ? "Slot cleared" : s.closed ? "Closed short" : `gap ${money(QUARTERLY_STOCK_NAP - s.nap)}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Reward: $2,000 Globe Life stock + $105 mobile technology reimbursement. A/T requirement {q.atOk ? <span className="font-bold text-emerald-400">met ({pct(m.multiplier, 1)})</span> : <span className="font-bold text-red-400">NOT met</span>}.
          </div>
        </Panel>
      ))}

      <RuleBox title="Official rule — Annual Awards Meeting (Punta Cana)">
        <p>The top 150 Sales Professionals by annual NAP qualify. This is a competitive ranking, not a fixed threshold. 85%+ A/T is required, and the November report is the final determinant.</p>
        <p>Clubs: Chairman's = top 10 · President's = 11–30 · Achiever's = 31–60 · Leader's = 61–150.</p>
      </RuleBox>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel tone="amber"><Stat label="Annual NAP (YTD)" value={money(m.ytdNap)} tone="amber" size="text-4xl" sub={`${m.ytdApps} net apps`} /></Panel>
        <Panel tone="gray"><Stat label="Current rank" value={`#${profile.rank}`} tone="gray" size="text-4xl" sub="last reported" /></Panel>
        <Panel tone={m.multiplier >= AT_FLOOR ? "green" : "red"}><Stat label="A/T eligibility (85%+)" value={m.atRatio >= AT_FLOOR ? "Eligible" : "Not eligible"} tone={m.atRatio >= AT_FLOOR ? "green" : "red"} size="text-3xl" sub="November report decides" /></Panel>
      </div>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Club pace context — estimates only</div>
        <div className="space-y-3">
          {AWARD_CLUBS.map((c) => (
            <div key={c.name}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-bold text-slate-200">{c.name} <span className="text-xs text-slate-500">({c.range})</span></span>
                <span className="text-xs text-slate-500">~{money(c.pace)} pace est.</span>
              </div>
              <ProgressBar current={m.ytdNap} target={c.pace} />
              <div className="mt-1"><GapTriad dollars={Math.max(0, c.pace - m.ytdNap)} dailyNap={m.dailyNap} /></div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Estimates, flagged as such: #60 tracked near $170,000 mid-2026 and the top 10 ran $300,000–$500,000+. Actual cutoffs move with the field.
        </p>
      </Panel>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Year-end projection</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-red-800 bg-slate-950 p-3">
            <div className="text-xs uppercase text-slate-500">At current pace ({money(Math.round(m.weeklyPace))}/wk)</div>
            <div className="text-3xl font-black text-red-400">{money(Math.round(projCurrent))}</div>
          </div>
          <div className="rounded-lg border border-sky-800 bg-slate-950 p-3">
            <div className="text-xs uppercase text-slate-500">At Week-18 pace ({money(m.week18Pace)}/wk)</div>
            <div className="text-3xl font-black text-sky-400">{money(Math.round(proj18))}</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">{weeksLeft} sales weeks left in the year (through {fmtLong(yearEnd)}).</div>
      </Panel>

      <Panel tone="gray">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400"><Lock size={14} /> Mid-Year Meeting — 2027 cycle</div>
        <div className="mt-2 text-2xl font-black text-slate-500">Not yet open</div>
        <p className="mt-1 text-sm text-slate-400">
          22-week qualification period. Personal NAP levels: L1 $50,000 · L2 $80,000 · L3 $100,000 · L4 $130,000.
          Nothing is computed against this until the 2027 window is announced.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MIDYEAR_LEVELS.map((l) => (
            <span key={l.level} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-500">{l.level} · {money(l.nap)}</span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================================
   SECTION 7 — ACTIVITY DRIVERS
   ========================================================================== */

const WEEK18_APPS = 25;

function ActivityTab({ model: m, activity, addActivity, quickAdd }) {
  const [row, setRow] = useState({ date: isoDate(m.today), doors: "", presentations: "", apps: "", referrals: "" });
  const impliedNap = m.actTotals.apps * NAP_PER_APP;
  const weekRows = [...m.curWeekActivity].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <SectionTitle icon={Activity} sub="NAP is a lagging indicator. These are the inputs that produce it.">Activity Drivers</SectionTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Doors / calls", m.actTotals.doors, "gray"],
          ["Presentations", m.actTotals.presentations, "amber"],
          ["Apps written", m.actTotals.apps, "green"],
          ["Referrals", m.actTotals.referrals, "blue"],
          ["Days worked", m.actTotals.daysWorked, "gray"],
        ].map(([label, val, tone]) => (
          <Panel key={label} tone={tone}><Stat label={label} value={val} tone={tone} size="text-3xl" /></Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel tone="amber"><Stat label="Apps per day" value={m.appsPerDay.toFixed(1)} tone="amber" size="text-4xl" sub={`week ${m.currentWeek}, ${m.actTotals.daysWorked} days worked`} /></Panel>
        <Panel tone="amber"><Stat label="Implied NAP from apps" value={money(impliedNap)} tone="amber" size="text-4xl" sub={`${m.actTotals.apps} apps × ${money(NAP_PER_APP)}`} /></Panel>
        <Panel tone={m.actTotals.apps >= WEEK18_APPS ? "blue" : "gray"}>
          <Stat label="vs. Week 18 benchmark" value={`${m.actTotals.apps} / ${WEEK18_APPS}`} tone={m.actTotals.apps >= WEEK18_APPS ? "blue" : "gray"} size="text-4xl" sub="25 apps — proven ceiling" />
          <div className="mt-2"><ProgressBar current={m.actTotals.apps} target={WEEK18_APPS} unit="apps" /></div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Quick add — today</div>
        <div className="flex flex-wrap gap-2">
          {[["doors", "+10 doors/calls", 10], ["doors", "+1 door/call", 1], ["presentations", "+1 presentation", 1], ["apps", "+1 app", 1], ["referrals", "+1 referral", 1]].map(([f, label, n], i) => (
            <button key={i} onClick={() => quickAdd(f, n)} className={`${btnCls} border border-slate-700 bg-slate-800 text-slate-200`}>{label}</button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <Field label="Date"><input type="date" className={inputCls} value={row.date} onChange={(e) => setRow({ ...row, date: e.target.value })} /></Field>
          <Field label="Doors"><input type="number" className={inputCls} value={row.doors} onChange={(e) => setRow({ ...row, doors: e.target.value })} /></Field>
          <Field label="Presentations"><input type="number" className={inputCls} value={row.presentations} onChange={(e) => setRow({ ...row, presentations: e.target.value })} /></Field>
          <Field label="Apps"><input type="number" className={inputCls} value={row.apps} onChange={(e) => setRow({ ...row, apps: e.target.value })} /></Field>
          <Field label="Referrals"><input type="number" className={inputCls} value={row.referrals} onChange={(e) => setRow({ ...row, referrals: e.target.value })} /></Field>
          <button className={`${btnCls} self-end bg-sky-600 text-white`}
            onClick={() => { addActivity({ id: "act-" + Date.now(), date: row.date, doors: Number(row.doors) || 0, presentations: Number(row.presentations) || 0, apps: Number(row.apps) || 0, referrals: Number(row.referrals) || 0 }); setRow({ ...row, doors: "", presentations: "", apps: "", referrals: "" }); }}>
            <Plus size={14} /> Log day
          </button>
        </div>
      </Panel>

      <div>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">This week's daily log</div>
        <Table headers={["Date", "Doors/calls", "Presentations", "Apps", "Referrals", "Implied NAP"]}
          empty="Nothing logged this week. Activity is the only part of this dashboard you control directly."
          rows={weekRows.map((a) => [fmtLong(parseISO(a.date)), a.doors, a.presentations, a.apps, a.referrals, money((Number(a.apps) || 0) * NAP_PER_APP)])} />
      </div>

      <div>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Full activity history</div>
        <Table headers={["Date", "Week", "Doors/calls", "Presentations", "Apps", "Referrals"]}
          empty="No activity logged yet."
          rows={[...activity].sort((a, b) => (a.date < b.date ? 1 : -1)).map((a) => {
            const d = parseISO(a.date);
            return [fmtLong(d), `W${weekForDate(d)}`, a.doors, a.presentations, a.apps, a.referrals];
          })} />
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 8 — PACE & PROJECTION
   ========================================================================== */

function PaceTab({ model: m }) {
  const [appsPerDay, setAppsPerDay] = useState(3);
  const [scope, setScope] = useState("week");

  const daysLeft = scope === "week" ? m.daysLeftInWeek : daysBetween(m.today, monthEnd(m.currentMonth)) + 1;
  const added = appsPerDay * daysLeft * NAP_PER_APP;
  const projWeek = m.curWeekNap + (scope === "week" ? added : appsPerDay * m.daysLeftInWeek * NAP_PER_APP);
  const projMonth = m.thisMonth.nap + (scope === "month" ? added : appsPerDay * m.daysLeftInWeek * NAP_PER_APP);

  const weeksLeftInYear = Math.max(0, Math.ceil((daysBetween(m.today, monthEnd(SALES_MONTHS[SALES_MONTHS.length - 1])) + 1) / 7));
  const yearAtCurrent = m.ytdNap + m.weeklyPace * weeksLeftInYear;
  const yearAt18 = m.ytdNap + m.week18Pace * weeksLeftInYear;
  const yearAtSlider = m.ytdNap + appsPerDay * NAP_PER_APP * 5 * weeksLeftInYear;

  const gluNext = m.liveGlu;
  const unlocks = [
    { label: "Green Out ($5,000 week)", hit: projWeek >= GREEN_OUT, detail: money(GREEN_OUT) },
    { label: m.stringNextThisWeek ? `String Club — ${m.stringNextThisWeek.name}` : "String Club — maxed", hit: m.stringNextThisWeek ? projWeek >= m.stringNextThisWeek.nap : true, detail: m.stringNextThisWeek ? money(m.stringNextThisWeek.nap) : "—" },
    { label: `New best week (PR ${money(m.bestWeek.nap)})`, hit: projWeek > m.bestWeek.nap, detail: money(m.bestWeek.nap) },
    { label: m.thisMonth.next ? `Monthly tier ${money(m.thisMonth.next.nap)} → ${money(m.thisMonth.next.bonus)}` : "Top monthly tier", hit: m.thisMonth.next ? projMonth >= m.thisMonth.next.nap : true, detail: m.thisMonth.next ? money(m.thisMonth.next.nap) : "—" },
    { label: "Quarterly stock slot ($20,000 month)", hit: projMonth >= QUARTERLY_STOCK_NAP, detail: money(QUARTERLY_STOCK_NAP) },
    { label: `GLU 101 $30k path (${gluNext.label.replace("GLU 101 — ", "")})`, hit: gluNext.napInWindow + added >= GLU_NAP_TARGET, detail: money(GLU_NAP_TARGET) },
    { label: "License reimbursement ($50k cumulative)", hit: m.ytdNap + added >= LICENSE_REIMB_NAP, detail: money(LICENSE_REIMB_NAP) },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle icon={Zap} sub="One slider. Every milestone re-computes off it.">Pace & Projection</SectionTitle>

      <Panel tone="amber">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-black text-slate-100">
            If I write <span className="text-amber-400">{appsPerDay}</span> app{appsPerDay === 1 ? "" : "s"} per day for the rest of this{" "}
            <button onClick={() => setScope(scope === "week" ? "month" : "week")} className="underline decoration-dotted text-sky-400">{scope}</button>…
          </div>
          <div className="text-xs text-slate-400">{daysLeft} days left in the {scope} · tap the word to switch</div>
        </div>
        <input type="range" min="0" max="8" step="1" value={appsPerDay} onChange={(e) => setAppsPerDay(Number(e.target.value))} className="mt-3 w-full" />
        <div className="mt-1 flex justify-between text-xs text-slate-500"><span>0</span><span>4</span><span>8 apps/day</span></div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
            <div className="text-xs uppercase text-slate-500">NAP added</div>
            <div className="text-3xl font-black text-amber-400">{money(added)}</div>
            <div className="text-xs text-slate-500">{appsPerDay * daysLeft} apps × {money(NAP_PER_APP)}</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
            <div className="text-xs uppercase text-slate-500">Week {m.currentWeek} finishes at</div>
            <div className={`text-3xl font-black ${projWeek >= GREEN_OUT ? "text-sky-400" : "text-amber-400"}`}>{money(projWeek)}</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
            <div className="text-xs uppercase text-slate-500">{m.currentMonth.label} finishes at</div>
            <div className="text-3xl font-black text-amber-400">{money(projMonth)}</div>
            <div className="text-xs text-slate-500">
              tier {money(bonusTierFor(projMonth, m.newAgent).bonus)} → {money(Math.round(bonusTierFor(projMonth, m.newAgent).bonus * (m.multiplier / 100)))} after A/T
              {m.thisMonth.failed ? " (activity minimum failed — pays $0)" : ""}
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">What that unlocks</div>
        <div className="space-y-2">
          {unlocks.map((u, i) => (
            <div key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${u.hit ? "border-emerald-600 bg-emerald-950" : "border-slate-700 bg-slate-950"}`}>
              <span className={`text-sm font-bold ${u.hit ? "text-emerald-300" : "text-slate-400"}`}>
                {u.hit ? <CheckCircle2 className="mr-2 inline" size={14} /> : <Lock className="mr-2 inline" size={14} />}{u.label}
              </span>
              <span className="text-xs text-slate-500">{u.detail}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Year-end projection — side by side</div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: "Current pace", nap: Math.round(yearAtCurrent) },
              { name: `Slider (${appsPerDay}/day)`, nap: Math.round(yearAtSlider) },
              { name: "Week-18 pace", nap: Math.round(yearAt18) },
            ]}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} formatter={(v) => money(v)} />
              <ReferenceLine y={LICENSE_REIMB_NAP} stroke="#22c55e" strokeDasharray="4 4" />
              <Bar dataKey="nap">
                <Cell fill="#ef4444" /><Cell fill="#f59e0b" /><Cell fill="#0ea5e9" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div className="text-red-400">Current pace: <span className="font-black">{money(Math.round(yearAtCurrent))}</span> ({money(Math.round(m.weeklyPace))}/wk)</div>
          <div className="text-amber-400">At {appsPerDay} apps/day, 5 days/wk: <span className="font-black">{money(Math.round(yearAtSlider))}</span></div>
          <div className="text-sky-400">Week-18 pace: <span className="font-black">{money(Math.round(yearAt18))}</span> ({money(m.week18Pace)}/wk)</div>
        </div>
        <div className="mt-1 text-xs text-slate-500">{weeksLeftInYear} sales weeks remain. Dashed green line = $50,000 license reimbursement.</div>
      </Panel>
    </div>
  );
}

/* ============================================================================
   SECTION 9 — RULES REFERENCE
   ========================================================================== */

const RULES = [
  { t: "Sales calendar", b: "FHD pays on sales months, not calendar months. A sales week runs Monday–Sunday and is labeled by its Monday. August 2026 = weeks 31–34 (Jul 27 – Aug 23, 4 weeks). September 2026 = weeks 35–39 (Aug 24 – Sep 27, 5 weeks). October 2026 = weeks 40–43 (Sep 28 – Oct 25, 4 weeks). November 2026 = weeks 44–48 (Oct 26 – Nov 29, 5 weeks). December 2026 = weeks 49–52 (Nov 30 – Dec 27, 4 weeks)." },
  { t: "Quarters", b: "Q3 = July + August + September sales months. Q4 = October + November + December sales months." },
  { t: "Activity minimum", b: "Business must be produced in a minimum of 3 weeks during a 4-week sales month and 4 weeks during a 5-week sales month. Fail this and the Monthly Cash Bonus pays $0 regardless of NAP." },
  { t: "Monthly Cash Bonus tiers", b: "$15,000 → $375 · $20,000 → $750 · $30,000 → $1,500 · $40,000 → $2,000 · $50,000 → $3,000 · $60,000 → $3,500 · $70,000 → $4,000 · $80,000 → $4,500 · $90,000 → $5,000 · $100,000 → $6,000. New agents only: $10,000 NAP pays $250. Based on personal NAP within a sales month." },
  { t: "Quality Business Multiplier (A/T)", b: "120%+ → 120% multiplier. 100–119% → the ratio itself. 85–99% → the ratio itself. Below 85% → 0%, everything zeroes out. Applies to the Monthly Cash Bonus and the Quarterly Stock Bonus. 85%+ also required for Annual Awards. New agents are given 100% A/T automatically for their first 6 months." },
  { t: "String Club", b: "Single-week NAP records. Green Out $5,000 · Globe Week $7,500 · Flight of the Eagle $10,000 · Leaders Eagle $15,000 · Heritage Eagle $20,000 · Soaring Eagle $25,000." },
  { t: "GLU 101 — Foundations of Agency Building", b: "Qualify with EITHER three Green-Outs ($5,000+ weeks) OR $30,000 NAP within the qualification window. Aug 19–21, 2026 session: qualification Apr 6 – Jul 19, 2026, registration CLOSED. Nov 4–6, 2026 session: qualification Jul 22 – Oct 4, 2026, registration Sep 14 – Oct 16, 2026." },
  { t: "Quarterly Stock Bonus", b: "Three Monthly Cash Bonuses of $20,000+ NAP each within one quarter earns $2,000 in Globe Life stock plus a $105 mobile technology fee reimbursement. Requires 85%+ A/T." },
  { t: "$100 Eagle Bonus", b: "$100 for every Eagle write-up submitted within 2 weeks of the write-up date. Submitted late = forfeited." },
  { t: "License reimbursement", b: "$50,000 cumulative NAP earns reimbursement of licensing expenses." },
  { t: "Annual Awards Meeting — Punta Cana", b: "Top 150 Sales Professionals ranked by annual NAP. Competitive, not a fixed threshold. Requires 85%+ A/T; the November report is the final determinant. Clubs: Chairman's = top 10, President's = 11–30, Achiever's = 31–60, Leader's = 61–150. Pace context (estimates only): #60 tracked near $170,000 mid-2026; top 10 ran $300,000–$500,000+." },
  { t: "Mid-Year Meeting — 2027 cycle", b: "22-week qualification period. Personal NAP levels: L1 $50,000 · L2 $80,000 · L3 $100,000 · L4 $130,000. Not yet open — the 2027 window has not been announced, so nothing is computed against it." },
  { t: "\"I Dare You!\" 13-week contest", b: "No published thresholds. Watch for announcement." },
  { t: "Record Breakers", b: "No published thresholds. Watch for announcement." },
  { t: "NAP per app (working constant)", b: "This agent's trailing average is about $243 of NAP per net app. Every dollar goal in this dashboard is also expressed as an app count at that rate." },
];

function RulesTab() {
  const [q, setQ] = useState("");
  const hits = RULES.filter((r) => (r.t + " " + r.b).toLowerCase().includes(q.toLowerCase().trim()));
  return (
    <div className="space-y-4">
      <SectionTitle icon={Layers} sub="Everything the incentive book says, searchable, so nothing gets looked up mid-week.">Rules Reference</SectionTitle>
      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3">
        <Search size={16} className="text-slate-500" />
        <input className="w-full bg-transparent py-2 text-slate-100 outline-none" placeholder="Search rules — “activity”, “stock”, “eagle”, “85%”…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {hits.length === 0 ? <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">No rule matches “{q}”.</div> : null}
      {hits.map((r) => (
        <div key={r.t} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-1 text-sm font-black uppercase tracking-wide text-sky-400">{r.t}</div>
          <p className="text-sm leading-relaxed text-slate-300">{r.b}</p>
        </div>
      ))}
    </div>
  );
}
