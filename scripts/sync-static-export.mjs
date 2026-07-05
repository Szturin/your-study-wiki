import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "out");
const mirroredDirectories = new Set(["_next", "_not-found"]);

function assertInsideProject(targetPath) {
  const relativePath = path.relative(projectRoot, targetPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to write outside the project root: ${targetPath}`);
  }
}

if (!existsSync(outputDirectory)) {
  throw new Error("Static export folder not found. Run `NEXT_PUBLIC_BASE_PATH=/your-study-wiki npm run build` first.");
}

for (const entry of readdirSync(outputDirectory, { withFileTypes: true })) {
  const sourcePath = path.join(outputDirectory, entry.name);
  const targetPath = path.join(projectRoot, entry.name);

  assertInsideProject(targetPath);

  if (entry.isDirectory()) {
    if (!mirroredDirectories.has(entry.name)) {
      console.warn(`Skipping exported directory "${entry.name}" to avoid overwriting source folders.`);
      continue;
    }

    rmSync(targetPath, { recursive: true, force: true });
    cpSync(sourcePath, targetPath, { recursive: true });
    continue;
  }

  if (entry.isFile()) {
    mkdirSync(path.dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}

writeFileSync(path.join(projectRoot, ".nojekyll"), "");
console.log("Static export synced to the repository root for GitHub Pages.");
