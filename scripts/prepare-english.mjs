import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { parseFragment } from "parse5";

const root = process.cwd();
const vault = process.env.ENGLISH_VAULT_ROOT || "S:/0_Obsidian/my_study_library/考研/2-英语";
const passphrase = process.env.WALL_PASSPHRASE;
if (!passphrase || passphrase.length < 20) throw new Error("WALL_PASSPHRASE is required");
const manifest = JSON.parse(readFileSync(path.join(root, "protected/manifest.json"), "utf8"));
const key = pbkdf2Sync(passphrase, Buffer.from(manifest.salt, "base64"), manifest.iterations, 32, "sha256");
const target = path.join(root, "protected/english.enc");
const bank = readFileSync(path.join(root, "protected/bank.enc"));
const probe = createDecipheriv("aes-256-gcm", key, bank.subarray(0, 12));
probe.setAuthTag(bank.subarray(-16));
try { Buffer.concat([probe.update(bank.subarray(12, -16)), probe.final()]); }
catch { throw new Error("Passphrase does not match the protected bank"); }

const readingHtml = readFileSync(path.join(vault, "阅读/考研英语一历年阅读真题系统.html"), "utf8");
const start = readingHtml.indexOf("const DATA=");
const end = readingHtml.indexOf("};const $", start) + 1;
if (start < 0 || end < start) throw new Error("Reading data block was not found");
const reading = JSON.parse(readingHtml.slice(start + "const DATA=".length, end));
if (reading.articles.length !== 110 || reading.questions.length !== 540) throw new Error("Reading source count changed; inspect extraction");
const phraseStart = readingHtml.indexOf("const PHRASES=");
const phraseEnd = readingHtml.indexOf(";\r\nfunction initPhrases", phraseStart);
if (phraseStart < 0 || phraseEnd < phraseStart) throw new Error("Reading phrase block was not found");
reading.phrases = JSON.parse(readingHtml.slice(phraseStart + "const PHRASES=".length, phraseEnd));
const writingHtml = readFileSync(path.join(vault, "作文/考研英语一写作系统.html"), "utf8");
const writingStart = writingHtml.indexOf("const smallTemplates=");
const writingEnd = writingHtml.indexOf("const WRITING_AGENT_ENDPOINT", writingStart);
if (writingStart < 0 || writingEnd < writingStart) throw new Error("Writing source block was not found");
const writing = vm.runInNewContext(`${writingHtml.slice(writingStart, writingEnd)};({smallTemplates,bigTemplates,phraseGroups,coreWords,topics})`, {}, { timeout: 3000 });
const methodStart = writingHtml.indexOf("function renderMethodHome(){");
const methodEnd = writingHtml.indexOf("function renderContent(){", methodStart);
if (methodStart < 0 || methodEnd < methodStart) throw new Error("Writing method block was not found");
const methodHtml = vm.runInNewContext(`${writingHtml.slice(methodStart, methodEnd)};renderMethodHome()`, {}, { timeout: 3000 });
const fragment = parseFragment(methodHtml);
const children = node => node.childNodes || [];
const textOf = node => (node.value || children(node).map(textOf).join(" ")).replace(/\s+/g, " ").trim();
const find = (node, test) => test(node) ? node : children(node).map(child => find(child, test)).find(Boolean);
const main = find(fragment, node => node.tagName === "main");
function blocksOf(node, skipped = null) {
  if (node === skipped) return [];
  const className = node.attrs?.find(attr => attr.name === "class")?.value || "";
  if (node.tagName === "h3" || node.tagName === "h4") return [{ kind: "heading", text: textOf(node) }];
  if (node.tagName === "p" || node.tagName === "li" || className.includes("sentence") ||
      className.includes("thinking-item") || className.includes("detail-item") || className.includes("thought-line") ||
      className.includes("home-equation-line") || className.includes("home-close")) {
    const content = textOf(node);
    return content ? [{ kind: node.tagName === "li" ? "list" : "text", text: content }] : [];
  }
  if (className.includes("method-table")) {
    const cells = children(node).filter(child => child.tagName === "div").map(textOf);
    return Array.from({ length: Math.floor(cells.length / 2) }, (_, index) => ({ kind: "text", text: `${cells[index * 2]}：${cells[index * 2 + 1]}` }));
  }
  return children(node).flatMap(child => blocksOf(child, skipped));
}
writing.methodSections = children(main).filter(node => node.tagName === "section" || node.attrs?.some(attr => attr.name === "class" && attr.value.includes("home-close"))).map((node, index) => {
  const titleNode = find(node, child => child.tagName === "h3");
  return { title: titleNode ? textOf(titleNode) : index === 0 ? "写作思想" : "复习要点", blocks: blocksOf(node, titleNode) };
});
const knowledgeHtml = readFileSync(path.join(vault, "阅读/精读知识点归纳.html"), "utf8");
const knowledgeStart = knowledgeHtml.indexOf("const sources=");
const knowledgeEnd = knowledgeHtml.indexOf("let activeKind=", knowledgeStart);
if (knowledgeStart < 0 || knowledgeEnd < knowledgeStart) throw new Error("Knowledge source block was not found");
const knowledge = vm.runInNewContext(`${knowledgeHtml.slice(knowledgeStart, knowledgeEnd)};({sources,cards})`, {}, { timeout: 3000 });
const plaintext = Buffer.from(JSON.stringify({ reading, writing, knowledge }));
if (existsSync(target)) {
  const old = readFileSync(target);
  const decipher = createDecipheriv("aes-256-gcm", key, old.subarray(0, 12));
  decipher.setAuthTag(old.subarray(-16));
  if (Buffer.concat([decipher.update(old.subarray(12, -16)), decipher.final()]).equals(plaintext)) {
    console.log("English protected content is current");
    process.exit(0);
  }
}
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
writeFileSync(target, Buffer.concat([iv, cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]));
console.log(`English content encrypted: ${reading.articles.length} articles, ${reading.questions.length} questions, ${knowledge.cards.length} knowledge cards`);
