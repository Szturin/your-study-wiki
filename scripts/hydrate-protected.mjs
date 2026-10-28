import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "protected");
const target = path.join(root, "public", "protected");
if (!existsSync(path.join(source, "manifest.json"))) throw new Error("Encrypted 843 assets are missing");
rmSync(target, { recursive: true, force: true });
mkdirSync(path.dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });
console.log("Encrypted resources are ready for the static build.");
