import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const passphrase = process.env.WALL_PASSPHRASE;
if (!passphrase || passphrase.length < 20) throw new Error("WALL_PASSPHRASE must contain at least 20 characters");
const output = path.join(root, "protected");
const manifestPath = path.join(output, "manifest.json");
const existingManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
if (existingManifest && (existingManifest.version !== 1 || existingManifest.iterations !== 310000 ||
    Buffer.from(existingManifest.salt, "base64").length !== 16)) {
  throw new Error("Existing encryption manifest is not supported");
}
const salt = existingManifest ? Buffer.from(existingManifest.salt, "base64") : randomBytes(16);
const key = pbkdf2Sync(passphrase, salt, 310000, 32, "sha256");

function decrypt(target) {
  const bytes = readFileSync(target);
  if (bytes.length < 29) throw new Error(`Encrypted resource is incomplete: ${target}`);
  const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]);
}

if (existingManifest) {
  const probe = path.join(output, "bank.enc");
  if (!existsSync(probe)) throw new Error("Existing encrypted bank is missing");
  try { decrypt(probe); }
  catch { throw new Error("Passphrase does not match the existing encrypted bank"); }
}

const inputs = [
  [path.join(root, "src", "lib", "ustc843-bank.json"), path.join(output, "bank.enc")],
  [path.join(root, "src", "lib", "ustc843-formulas.json"), path.join(output, "formulas.enc")],
];

function walk(directory, relative = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, name);
    else if (entry.isFile()) inputs.push([absolute, path.join(output, "843", `${name}.enc`)]);
  }
}

walk(path.join(root, "public", "843"));
const changed = inputs.map(([source, target]) => ({ source, target, plaintext: readFileSync(source) }))
  .filter(({ target, plaintext }) => !existsSync(target) || !decrypt(target).equals(plaintext));

function encrypt(plaintext, target) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, Buffer.concat([iv, body, cipher.getAuthTag()]));
}

for (const { plaintext, target } of changed) encrypt(plaintext, target);
if (!existingManifest) writeFileSync(manifestPath, JSON.stringify({ version: 1, iterations: 310000, salt: salt.toString("base64") }));
console.log(`Protected bank, formulas, and 843 assets prepared; ${changed.length} file(s) updated.`);
