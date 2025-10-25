import fs from "fs";
import path from "path";

async function run() {
  const root = process.cwd();
  const src = path.resolve(root, ".env");
  const dst = path.resolve(root, "apps", "api", ".env");
  if (!fs.existsSync(src)) {
    console.error("Root .env not found at", src);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`Copied .env to ${dst}`);
}

run();
