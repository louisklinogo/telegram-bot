import fs from "fs";
import path from "path";

type Stat = { count: number; total: number; min: number; max: number };

function main() {
  const logPath = path.resolve(process.cwd(), "logs", "api.log");
  if (!fs.existsSync(logPath)) {
    console.error("logs/api.log not found. Run dev with logging first.");
    process.exit(1);
  }
  const text = fs.readFileSync(logPath, "utf8");
  const lines = text.split(/\r?\n/);
  const re = /\[trpc](?:\[slow])?\s+(\d+)ms\s+(query|mutation):([^\s]+)\s+queries=(\d+)/;
  const bucket = new Map<string, Stat>();

  for (const l of lines) {
    const m = l.match(re);
    if (!m) continue;
    const ms = Number(m[1]);
    const type = m[2];
    const path = m[3];
    const key = `${type}:${path}`;
    const s = bucket.get(key) || { count: 0, total: 0, min: Number.POSITIVE_INFINITY, max: 0 };
    s.count += 1;
    s.total += ms;
    s.min = Math.min(s.min, ms);
    s.max = Math.max(s.max, ms);
    bucket.set(key, s);
  }

  const rows = Array.from(bucket.entries()).map(([key, s]) => ({
    key,
    avg: s.total / s.count,
    min: s.min,
    max: s.max,
    count: s.count,
  }));
  rows.sort((a, b) => b.avg - a.avg);
  if (!rows.length) {
    console.log("No [trpc] timing lines found. Ensure TRPC_TIMING is enabled and reproduce the flow.");
    return;
  }
  console.log("TRPC Timing Summary (avg ms, count, min..max):\n");
  for (const r of rows.slice(0, 20)) {
    console.log(`${r.key.padEnd(40)} avg=${r.avg.toFixed(1)}ms  n=${r.count}  [${r.min}..${r.max}]`);
  }
}

main();
