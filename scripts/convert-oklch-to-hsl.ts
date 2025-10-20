// bun scripts/convert-oklch-to-hsl.ts
// Reads v0-brillance tokens (light from app/globals.css, dark from styles/globals.css),
// converts OKLCH values to HSL triplets "H S% L%", and prints CSS variable blocks.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { converter, parse } from "culori";

type TokenMap = Record<string, string>;

function extractTokens(css: string): TokenMap {
  const map: TokenMap = {};
  // Match lines like: --background: oklch(0.5 0.1 120);
  const re = /--([a-z0-9-]+)\s*:\s*oklch\(([^)]+)\)\s*;/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const name = m[1];
    const value = `oklch(${m[2].trim()})`;
    map[name] = value;
  }
  return map;
}

const toHsl = converter("hsl");

function oklchToHslTriplet(oklchCss: string): string | null {
  const col = parse(oklchCss);
  if (!col) return null;
  const hsl: any = toHsl(col);
  if (!hsl || typeof hsl.h !== "number" || typeof hsl.s !== "number" || typeof hsl.l !== "number") {
    return null;
  }
  // Clamp and round
  const H = Math.round(((hsl.h ?? 0) % 360 + 360) % 360);
  const S = Math.round(Math.max(0, Math.min(1, hsl.s)) * 100);
  const L = Math.round(Math.max(0, Math.min(1, hsl.l)) * 100);
  return `${H} ${S}% ${L}%`;
}

function convertTokenMap(map: TokenMap): TokenMap {
  const out: TokenMap = {};
  for (const [k, v] of Object.entries(map)) {
    const h = oklchToHslTriplet(v);
    if (h) out[k] = h;
  }
  return out;
}

function printCssBlock(selector: string, tokens: TokenMap) {
  const keys = Object.keys(tokens).sort();
  console.log(`${selector} {`);
  for (const k of keys) {
    console.log(`  --${k}: ${tokens[k]};`);
  }
  console.log(`}`);
}

const root = process.cwd();
const v0dir = join(root, "v0-brillance-saa-s-landing-page");
const appGlobals = readFileSync(join(v0dir, "app", "globals.css"), "utf8");
const stylesGlobalsPath = join(v0dir, "styles", "globals.css");
let stylesGlobals = "";
try {
  stylesGlobals = readFileSync(stylesGlobalsPath, "utf8");
} catch {}

// Light from app/globals.css :root
const light = convertTokenMap(extractTokens(appGlobals));

// Dark from styles/globals.css .dark (if present)
let dark: TokenMap = {};
if (stylesGlobals) {
  const darkBlockMatch = stylesGlobals.match(/\.dark\s*\{([\s\S]*?)\}/);
  if (darkBlockMatch) {
    dark = convertTokenMap(extractTokens(darkBlockMatch[0]));
  }
}

// Output blocks for manual paste
printCssBlock(":root", light);
console.log("");
if (Object.keys(dark).length) {
  printCssBlock(".dark", dark);
}
