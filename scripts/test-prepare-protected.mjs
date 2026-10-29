import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./prepare-protected.mjs", import.meta.url));
const directory = mkdtempSync(path.join(tmpdir(), "study-wall-protected-test-"));
const hash = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const run = passphrase => spawnSync(process.execPath, [script], {
  cwd: directory, env: { ...process.env, WALL_PASSPHRASE: passphrase }, encoding: "utf8",
});

try {
  mkdirSync(path.join(directory, "src", "lib"), { recursive: true });
  mkdirSync(path.join(directory, "public", "843", "questions"), { recursive: true });
  writeFileSync(path.join(directory, "src", "lib", "ustc843-bank.json"), '{"questions":1}');
  writeFileSync(path.join(directory, "src", "lib", "ustc843-formulas.json"), '{"cards":1}');
  writeFileSync(path.join(directory, "public", "843", "questions", "sample.webp"), "sample image");

  const passphrase = "test-only-long-passphrase-for-encryption";
  assert.equal(run(passphrase).status, 0);
  const files = ["manifest.json", "bank.enc", "formulas.enc", "843/questions/sample.webp.enc"];
  const before = files.map(file => hash(path.join(directory, "protected", file)));
  assert.equal(run(passphrase).status, 0);
  assert.deepEqual(files.map(file => hash(path.join(directory, "protected", file))), before);

  assert.notEqual(run("incorrect-long-passphrase-for-test").status, 0);
  assert.deepEqual(files.map(file => hash(path.join(directory, "protected", file))), before);

  writeFileSync(path.join(directory, "src", "lib", "ustc843-bank.json"), '{"questions":2}');
  assert.equal(run(passphrase).status, 0);
  const after = files.map(file => hash(path.join(directory, "protected", file)));
  assert.notEqual(after[1], before[1]);
  assert.equal(after[0], before[0]);
  assert.equal(after[2], before[2]);
  assert.equal(after[3], before[3]);
  console.log("Protected preparation keeps existing keys and updates only changed assets.");
} finally {
  if (!directory.startsWith(path.resolve(tmpdir()) + path.sep)) throw new Error("Unexpected test directory");
  rmSync(directory, { recursive: true, force: true });
}
