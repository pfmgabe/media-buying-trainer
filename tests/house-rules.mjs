/* HOUSE RULES
   ===========
   The standards set for this project, written as checks so they hold without anyone
   remembering them. Every rule here was earned: each one is something that shipped wrong,
   was pointed out, and had to be fixed. Prose rules kept drifting back; these do not.

   Run: node tests/house-rules.mjs
   Exit 0 = clean. Exit 1 = a rule is broken, with the offending file, line and text quoted.

   Each rule below names the failure that produced it, so a future reader can tell whether it
   still applies or whether the situation has genuinely changed. */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = f => fs.readFileSync(path.join(root, f), "utf8");

const JS = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f);
const CSS = "assets/styles/trainer.css";
const HTML = "index.html";

/* Player-facing copy lives in these. knowledge-data and lesson-data are reference material
   whose register is deliberately more formal, so the prose rules do not apply there. */
const COPY_FILES = JS.filter(f => /agency-career-(data|engine)|menu-flow|modern-engine|nightmare-engine|classic-engine|flavors|session/.test(f));

const failures = [];
const checked = [];

function rule(name, why, fn) {
  checked.push(name);
  try { fn((msg) => failures.push({ rule: name, why, msg })); }
  catch (err) { failures.push({ rule: name, why, msg: `check itself threw: ${err.message}` }); }
}

/* Strips comments so a rule about player copy is not tripped by a note explaining the rule. */
function codeLines(file) {
  /* Tracks block-comment state rather than testing each line's first characters. The first
     version only skipped lines starting with a comment marker, so the CONTINUATION lines of a
     block comment read as code -- and this audit reported setNodeText's own docstring as a
     violation of the rule that docstring explains. */
  const out = [];
  let inBlock = false;
  read(file).split("\n").forEach((text, i) => {
    const t = text.trim();
    const opens = t.includes("/*"), closes = t.includes("*/");
    if (inBlock) { if (closes) inBlock = false; return; }
    if (opens && !closes) { inBlock = true; return; }
    if (t.startsWith("//") || (opens && closes)) return;
    out.push({ n: i + 1, text });
  });
  return out;
}

function scanCopy(pattern, report, label) {
  for (const file of COPY_FILES) {
    for (const { n, text } of codeLines(file)) {
      const hit = text.match(pattern);
      if (hit) report(`${file}:${n} ${label}: "${hit[0].slice(0, 70)}"`);
    }
  }
}

/* ---------------------------------------------------------------- copy */

rule("no throat-clearing",
  'Announcing that something matters instead of saying it. "Why this number decides your career: keep each conversion under $363" should open with "Keep each conversion under $363".',
  report => {
    scanCopy(/Why (?:this|these|that|it|the) [^:<"'`]{0,50}:/i, report, 'a "Why this X:" opener');
    scanCopy(/What this [a-z]{2,14} (?:answers|means|tells|shows)\b/i, report, 'a "What this X answers" opener');
    scanCopy(/Here(?:'|&#39;)?s (?:why|how|what)\b/i, report, 'a "Here\'s why" opener');
  });

rule("no filler abstraction",
  '"Signal" reads as meaningless to a person and as machine-written prose. It survives only as "signal loss", the real name for what ATT did to attribution.',
  report => {
    const prose = /(note|pros|cons|copy|effect|premise|blurb|body|reason|summary|lead|hint|stakes|customer)\s*:\s*"([^"]{20,})"/g;
    for (const file of COPY_FILES) {
      for (const { n, text } of codeLines(file)) {
        for (const m of text.matchAll(prose)) {
          const v = m[2];
          if (/\bsignals?\b/i.test(v) && !/signal[- ]loss/i.test(v))
            report(`${file}:${n} uses "signal" as filler: "${v.slice(0, 64)}"`);
        }
      }
    }
  });

rule("conversions, not outcomes",
  'The player was told to count "outcomes" when the thing meant is a conversion. Name the real thing.',
  report => scanCopy(/\bad outcomes\b/i, report, 'says "ad outcomes" where it means conversions'));

/* ------------------------------------------------------------ typography */

rule("nothing below 12px",
  "The UI was built on an 8-11px tier with labels at 7px. Two shapes of the font shorthand exist and a sweep that matched only one left 150 declarations at 9px.",
  report => {
    const css = read(CSS), html = read(HTML);
    const sizes = [
      ...[...css.matchAll(/font:([0-9.]+)px\/([0-9.]+)/g)].map(m => +m[1]),
      ...[...css.matchAll(/font:(?:[^;{}]*?\s)([0-9.]+)px\/([0-9.]+)/g)].map(m => +m[1]),
      ...[...css.matchAll(/font-size:([0-9.]+)px/g)].map(m => +m[1]),
    ].filter(n => n > 0 && n < 12);
    if (sizes.length) report(`stylesheet sets ${[...new Set(sizes)].join(", ")}px`);
    const inline = [...html.matchAll(/font-size:([0-9.]+)px/g)].map(m => +m[1]).filter(n => n > 0 && n < 12);
    if (inline.length) report(`index.html sets inline ${[...new Set(inline)].join(", ")}px`);
  });

rule("line-height at least 1.4 on body text",
  "The brief asked for 1.4 to 1.6 and the sheet was shipping 1.2 to 1.35 on labels and body copy.",
  report => {
    const css = read(CSS);
    const tight = [
      ...[...css.matchAll(/font:([0-9.]+)px\/([0-9.]+)/g)],
      ...[...css.matchAll(/font:(?:[^;{}]*?\s)([0-9.]+)px\/([0-9.]+)/g)],
    ].map(m => ({ size: +m[1], ratio: +m[2] })).filter(d => d.size < 20 && d.ratio > 0.5 && d.ratio < 1.4);
    if (tight.length) report(tight.slice(0, 6).map(d => `${d.size}px/${d.ratio}`).join(", "));
  });

rule("fluid type grows at one rate",
  "45 sizes scaled with the viewport at rates from 2vw to 10vw, so a heading grew five times faster than its label and the hierarchy was only correct at one window width.",
  report => {
    const ratios = [...read(CSS).matchAll(/clamp\(([0-9.]+)px,\s*([0-9.]+)vw,\s*([0-9.]+)px\)/g)]
      .map(m => +(+m[3] / +m[1]).toFixed(2));
    if (!ratios.length) return;
    const lo = Math.min(...ratios), hi = Math.max(...ratios);
    if (hi - lo > 0.12) report(`growth ratios span ${lo} to ${hi}; they should sit within about 0.1 of each other`);
  });

/* ---------------------------------------------------------------- layout */

rule("no destination renders blank",
  "A CSS rule hid the pane four routes handed the screen to, so they rendered empty while every structural check passed.",
  report => {
    const css = read(CSS);
    const routes = { overview: "workspace-main", board: "workspace-main", history: "workspace-main",
                     finance: "workspace-side", team: "workspace-side", growth: "workspace-side" };
    for (const [route, pane] of Object.entries(routes)) {
      const rules = css.match(new RegExp(`[^{}]*\\[data-workspace-view="${route}"\\][^{}]*\\.${pane}\\s*(?:,[^{}]*)?\\{[^}]*\\}`, "g")) || [];
      if (rules.some(r => /display\s*:\s*none/.test(r.slice(r.indexOf("{")))))
        report(`${route} exposes .${pane} but the stylesheet hides it`);
    }
  });

rule("column counts follow the container, not the viewport",
  "repeat(4,...) keyed on a 1500px viewport packed four cards into a 959px pane at 228px each, clipping content that needed 263px. A wider screen made it worse.",
  report => {
    for (const m of read(CSS).matchAll(/@media[^{]*min-width:\s*(\d+)px[^{]*\{([\s\S]*?)\n {2}\}/g)) {
      for (const inner of m[2].matchAll(/([^{};]*)\{[^}]*grid-template-columns:\s*repeat\((\d+),/g)) {
        const sel = inner[1].trim();
        /* Modes 0 and 5 pin their column counts deliberately -- the classic ad-group pairs read
           as pairs, and the portfolio wants three lanes. Both were swept for clipped content at
           1728px and came back clean, so they are exempt by verification, not by assumption.
           Anything else hard-coding columns behind a viewport width is the bug that jammed the
           cards, and should use auto-fit with a minimum instead. */
        const verifiedSafe = /data-mode="(?:0|5)"/.test(sel);
        if (!verifiedSafe && /\.slots|\.agency-roster|\.wizard-mode-list|\.agency-brief-grid/.test(sel))
          report(`${sel} hard-codes ${inner[2]} columns inside a min-width media query`);
      }
    }
  });

rule("a missing node cannot blank the app",
  "Thirty-seven call sites wrote textContent straight onto a getElementById result. One absent element threw out of the render and left the previous mode's chrome over an empty board.",
  report => {
    const raw = /getElementById\(\s*["'][A-Za-z0-9_-]+["']\s*\)\s*\.textContent\s*=/;
    for (const file of JS) {
      /* Scan code, not the comments that explain the rule -- the first run of this audit
         reported itself, because setNodeText's own docstring quotes the banned pattern. */
      for (const { n, text } of codeLines(file)) {
        const hit = text.match(raw);
        if (hit) report(`${file}:${n} writes ${hit[0]}`);
      }
    }
    if (!/function setNodeText\(id,value\)\{[\s\S]*?if\(!node\)return false;/.test(read("js/content-db.js")))
      report("setNodeText lost its missing-node guard");
  });

/* ------------------------------------------------------------- behaviour */

rule("every control is wired",
  "A control that looks live and does nothing reads as a broken app.",
  report => {
    const engine = read("js/agency-career-engine.js");
    const emitted = new Set([...engine.matchAll(/data-agency-([a-z-]+)=/g)].map(m => "data-agency-" + m[1]));
    const bound = new Set([...engine.matchAll(/querySelectorAll\("\[data-agency-([a-z-]+)\]/g)].map(m => "data-agency-" + m[1]));
    const owned = new Set(["data-agency-workspace"]); // workspace.js binds this one
    for (const attr of emitted)
      if (!bound.has(attr) && !owned.has(attr)) report(`${attr} is rendered but never bound to a handler`);
  });

rule("blocked controls say why",
  "Gated controls returned false in silence, so a trust-locked or focus-starved click did nothing at all with no explanation.",
  report => {
    const engine = read("js/agency-career-engine.js");
    if (!/function refuseAgency\(/.test(engine)) return report("refuseAgency is gone");
    const silent = [...engine.matchAll(/if\(!check\.ok\)return false;/g)];
    if (silent.length) report(`${silent.length} gate(s) still discard their reason and return false`);
  });

/* ----------------------------------------------------------------- report */

console.log(`house rules: ${checked.length} checked\n`);
if (!failures.length) {
  console.log("all clean");
  process.exit(0);
}
const byRule = new Map();
for (const f of failures) {
  if (!byRule.has(f.rule)) byRule.set(f.rule, { why: f.why, items: [] });
  byRule.get(f.rule).items.push(f.msg);
}
for (const [name, { why, items }] of byRule) {
  console.log(`BROKEN: ${name}`);
  console.log(`  why it exists: ${why}`);
  for (const item of items.slice(0, 8)) console.log(`    - ${item}`);
  if (items.length > 8) console.log(`    ... and ${items.length - 8} more`);
  console.log("");
}
process.exit(1);
