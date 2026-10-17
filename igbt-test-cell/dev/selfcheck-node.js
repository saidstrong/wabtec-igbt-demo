/* dev/selfcheck-node.js: run the selfcheck.html checks in node (same scripts, same check code:
   the <script id="checks"> block is read out of selfcheck.html) and print the total plus the
   AC-11 / AC-17 actual-vs-expected table (03 §12), the AC-14 validation messages and the AC-16 noise
   checks (N1–N3) in Markdown. Not loaded by index.html; leave dev/ out
   of the zip.
   Usage: node dev/selfcheck-node.js            (all cases + AC-11 and AC-14 tables; exit 1 on any FAIL)
          node dev/selfcheck-node.js --table    (AC-11 table only) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
var page = fs.readFileSync(path.join(root, "selfcheck.html"), "utf8");
var ctx = { console: console };
ctx.window = ctx;   // window shim: the scripts attach to window.APP_DATA / window.IGBT
vm.createContext(ctx);
// Same scripts, same order as selfcheck.html
var srcs = [], re = /<script src="([^"]+)"><\/script>/g, m;
while ((m = re.exec(page))) srcs.push(m[1]);
srcs.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }); });
var checks = page.match(/<script id="checks">([\s\S]*?)<\/script>/);
if (!checks) { process.stderr.write("selfcheck.html: <script id=\"checks\"> not found\n"); process.exit(2); }
vm.runInContext(checks[1], ctx, { filename: "selfcheck.html#checks" });

var tableOnly = process.argv.indexOf("--table") >= 0;
var out = [];
if (!tableOnly) {
  var results = ctx.IGBT.selfcheck.run();
  results.forEach(function (r) { out.push(r.result + "  " + r.n + ". " + r.name + (r.result === "PASS" ? "" : "\n      " + r.detail)); });
  var passed = results.filter(function (r) { return r.result === "PASS"; }).length;
  out.push("", "Total: " + passed + " / " + results.length + " PASS", "");
}
function cell(s) { return String(s).replace(/\|/g, "\\|"); }
out.push("AC-11 (P0) and AC-17 (S8b): 03 §12 actual vs expected (σ = 0, default bench)", "",
  "| Scenario | Column | Expected (03 §12) | Actual (engine) | Match |", "| --- | --- | --- | --- | --- |");
ctx.IGBT.selfcheck.s12Table().forEach(function (r) {
  out.push("| " + [r.scenario, r.column, cell(r.expected), cell(r.actual), r.pass ? "yes" : "**NO**"].join(" | ") + " |");
});
if (!tableOnly) {
  out.push("", "AC-14: validation messages (configPreflight → INVALID, no run, no verdict)", "",
    "| Case | Status | Field | Value | Rule |", "| --- | --- | --- | --- | --- |");
  ctx.IGBT.selfcheck.ac14Table().forEach(function (r) {
    out.push("| " + [r.name, r.status, "`" + r.field + "`", "`" + r.value + "`", cell(r.rule)].join(" | ") + " |");
  });
  out.push("", "AC-16: noise checks (03 §11, σ = " + ctx.APP_DATA.noise_on_sigma + ")", "",
    "| ID | Check | Result | Pass |", "| --- | --- | --- | --- |");
  ctx.IGBT.selfcheck.ac16Table().forEach(function (r) {
    out.push("| " + [r.id, cell(r.check), cell(r.result), r.pass ? "yes" : "**NO**"].join(" | ") + " |");
  });
}
process.stdout.write(out.join("\n") + "\n");
if (!tableOnly && passed !== results.length) process.exit(1);
