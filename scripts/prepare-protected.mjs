import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const passphrase = process.env.WALL_PASSPHRASE;
if (!passphrase || passphrase.length < 20) throw new Error("WALL_PASSPHRASE must contain at least 20 characters");
const output = path.join(root, "public", "protected");
const salt = randomBytes(16);
const key = pbkdf2Sync(passphrase, salt, 310000, 32, "sha256");

function encrypt(source, target) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(readFileSync(source)), cipher.final()]);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, Buffer.concat([iv, body, cipher.getAuthTag()]));
}

function walk(directory, relative = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, name);
    else if (entry.isFile()) encrypt(absolute, path.join(output, "843", `${name}.enc`));
  }
}

rmSync(output, { recursive: true, force: true });
encrypt(path.join(root, "src", "lib", "ustc843-bank.json"), path.join(output, "bank.enc"));
encrypt(path.join(root, "src", "lib", "ustc843-formulas.json"), path.join(output, "formulas.enc"));
walk(path.join(root, "public", "843"));
writeFileSync(path.join(output, "manifest.json"), JSON.stringify({ version: 1, iterations: 310000, salt: salt.toString("base64") }));
console.log("Protected bank, formulas, and 843 assets prepared.");
