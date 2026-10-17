/* dev/run-node.js: run one scenario to the end in node and print the deterministic section.
   Not loaded by index.html; leave dev/ out of the zip.
   Usage: node dev/run-node.js S0 > s0.json
          node dev/run-node.js S0 --report     (whole report JSON, incl. metadata)
          node dev/run-node.js S0 --html > report_S0.html   (HTML report, 05 §10) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
var files = ["data.js", "validate.js", "rng.js", "models.js", "engine.js", "sequencer.js", "report.js"];
var ctx = { console: console };
ctx.window = ctx;   // window shim: the scripts attach to window.APP_DATA / window.IGBT
vm.createContext(ctx);
files.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), ctx, { filename: "js/" + f });
});

var args = process.argv.slice(2);
var scenarioId = args.filter(function (a) { return a.indexOf("--") !== 0; })[0] || "S0";
var full = args.indexOf("--report") >= 0, html = args.indexOf("--html") >= 0;
var D = ctx.APP_DATA, V = ctx.IGBT.validate, SEQ = ctx.IGBT.sequencer, REP = ctx.IGBT.report;

var setup = {
  run_id: "RUN-NODE-0001", module_id: D.module_defaults.module_id, profile_id: "demo",
  scenario_id: scenarioId, seed: D.seed_default, speed: D.profiles[0].bench_conditions.speed_default, operator: "node"
};
var pre = V.configPreflight(setup);
var report;
if (pre.status === "INVALID") {
  process.stderr.write("Validation error:\n" + pre.errors.map(function (e) {
    return "  " + e.field + " = " + JSON.stringify(e.value) + ": " + e.rule;
  }).join("\n") + "\n");
  process.exit(1);
} else if (pre.status === "CONFIG_BLOCKED") {
  report = REP.buildConfigBlockedJson(pre, { run_id: setup.run_id, operator: setup.operator });
} else {
  var run = SEQ.runToEnd(SEQ.create(pre));
  report = REP.buildJson(run, { run_id: setup.run_id, operator: setup.operator });
}
if (html) process.stdout.write(REP.buildHtml(report));
else process.stdout.write(JSON.stringify(full ? report : report.deterministic, null, 2) + "\n");
