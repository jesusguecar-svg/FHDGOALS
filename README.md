# FHD Production Command Center

Single-file React artifact: a personal sales-production tracker for a Globe Life
Family Heritage Division Sales Professional on the personal-production track.

**File:** `FHDProductionCommandCenter.jsx` — default export, no required props.

## Look

Set as a 1994 printed production report: ledger stock, corporate navy masthead
over an oxblood double rule, greenbar fanfold tables, Courier data columns,
Georgia pull figures, and thermometer bars with printed tick marks. Urgency is
a rubber stamp, not a throb.

Status color keeps its meaning throughout — red missed, amber behind pace,
green on pace, blue banked, gray not yet started — re-voiced in period ink.

## Stack
- React (hooks only), `recharts`, `lucide-react`
- Tailwind core utility classes only (no arbitrary values, no custom config), plus
  one scoped `<style>` block for the type roles, rules and greenbar striping
  that utilities can't express
- Persistence via `window.storage` only — never `localStorage`/`sessionStorage`.
  Keys: `fhd:weeks`, `fhd:profile`, `fhd:eagles`, `fhd:conservation`, `fhd:activity`.
  Every call is wrapped in try/catch and degrades to in-memory state.

## What it computes
The FHD rule set is hard-coded as a live engine, not static text:

- **Sales calendar** — Monday-anchored sales weeks and sales months (Aug–Dec 2026
  published; Apr–Jul derived from the same pattern for history).
- **Activity minimum** — 3 production weeks in a 4-week month, 4 in a 5-week
  month; raises a full-width red alarm the moment it becomes mathematically
  unreachable, and forces the bonus to $0 with the reason shown.
- **Monthly Cash Bonus** — full tier ladder, always displayed after the A/T
  multiplier, never as a raw tier.
- **Quality Business Multiplier** — 120% cap, linear 85–119%, zero below 85%,
  with new-agent 100% protection and its own expiry countdown.
- **String Club** — single-week ladder, Green Out through Soaring Eagle.
- **GLU 101** — three sessions (Aug 2026 closed, the Spanish-language Academia
  de Liderazgo Latina on Sep 22–23, and Nov 2026), each with both qualification
  paths tracked in parallel and separate qualification / registration
  countdowns.
- **Summer Ka-Ching** — the August 2026 cash bonus pays ×2. Every displayed
  payout routes through the promo factor, then the A/T multiplier, and still
  zeroes if the activity minimum fails.
- **Quarterly Stock Bonus**, **$100 Eagle Bonus** (per-write-up 14-day timers),
  **license reimbursement**, **Top 150 annual race**, dormant 2027 Mid-Year card,
  and watch-list items with no published thresholds.

Every gap is expressed in three units: dollars, apps (at $243/app), and
days-at-current-pace.

## Scope — FHD only

This tracker carries **Globe Life Family Heritage Division incentives only**,
sourced from the 2026 Incentives, Awards and Recognition brochure, the Summer
Ka-Ching flyer, and division email.

The branch `agent/import-fhd-goals-files` contains a President's Club 2027
target ($165,000 / top 55, Big Sky MT, qualification Feb 1 – Jan 31) and a
Chairman's Club 2027 target ($275,000 / top 45). **These are deliberately not
implemented.** They are sourced in that document to an unnamed public flyer,
not to any FHD material, and they conflict with the FHD structure on every
axis: a different meeting, qualification on active-app count and portfolio
persistency rather than the A/T ratio, and case sizes (~$11,690/app) that do
not match this book of business (~$243/app).

The same branch's 8-week sprint ($280,569) carries its own warning to confirm
whether it is active before treating it as current. Do not import any of it
without a Family Heritage Division source document.

## Seed data
Loads populated with the agent's real 2026 log (weeks 17–31), A/T and CAI
history, PR records, and open conservation items, so the dashboard renders full
on first open. "Reset all data" restores this baseline behind a confirm.

## Viewing it

The `.jsx` is the source of record — paste it into a Claude conversation and it
runs with real `window.storage` persistence.

To render it as a standalone page instead:

```
npm install react react-dom recharts lucide-react tailwindcss@3
.build/build.sh          # -> dist/fhd-command-center.html
```

The build inlines React, recharts, lucide and the generated Tailwind CSS into
one file with no external requests, so it opens anywhere.

## Where the data lives

The dashboard saves to whichever store the surface it is running on actually
provides, in priority order, and names the active one in the header:

| Surface | Store | Header chip |
|---|---|---|
| Claude conversation artifact | `window.storage` | Saved to Claude storage |
| Published page / any browser | `localStorage` (per device+browser) | Saved on this device |
| Storage blocked entirely | memory | Session only — export a backup |

Browser storage is per-device and can be cleared by the browser, so **Backup**
writes a dated JSON file with the full log, and **Restore** reads one back. That
file is the copy that survives a cleared cache, and the way to carry the log
into the repo.

**Phone ↔ Laptop** turns the same data into a paste-able sync code (`FHD1.…`).
Copy it on the device you logged on, paste it on the other one. Each device
keeps its own store, so the paste replaces that device's log — always copy from
whichever device you logged on last.
