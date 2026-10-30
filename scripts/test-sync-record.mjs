import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/sync-record.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { mergeRecords, sameSnapshot, trackRecordChange, stateKeys, clockKey } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };

const [masteryKey, journalKey] = stateKeys;
const snapshot = (mastery, notes, clocks = {}) => ({
  version: 1, updatedAt: "2026-10-29T00:00:00Z",
  values: {
    [masteryKey]: JSON.stringify({ version: 1, questionMasteryMap: mastery, questionFavoriteMap: {}, lastMasteredRecord: null }),
    [journalKey]: JSON.stringify({ version: 1, notes, scratch: {}, activity: {}, lastQuestionId: "", examDate: "" }),
  }, clocks,
});
const local = snapshot({ q1: "mastered" }, { q1: "本机笔记" }, { [`${masteryKey}/questionMasteryMap:q1`]: 10, [`${journalKey}/notes:q1`]: 10 });
const remote = snapshot({ q1: "blurred", q2: "unknown" }, { q2: "云端笔记" }, { [`${masteryKey}/questionMasteryMap:q1`]: 20, [`${masteryKey}/questionMasteryMap:q2`]: 20, [`${journalKey}/notes:q2`]: 20 });
const merged = mergeRecords(local, remote);
assert.deepEqual(JSON.parse(merged.values[masteryKey]).questionMasteryMap, { q1: "blurred", q2: "unknown" });
assert.deepEqual(JSON.parse(merged.values[journalKey]).notes, { q1: "本机笔记", q2: "云端笔记" });
assert.equal(sameSnapshot(merged, merged), true);

const deleted = snapshot({}, {}, { [`${journalKey}/notes:q1`]: 30 });
assert.equal(JSON.parse(mergeRecords(deleted, local).values[journalKey]).notes?.q1, undefined);
assert.equal(JSON.parse(mergeRecords(local, snapshot({ q1: "blurred" }, { q1: "云端旧笔记" })).values[journalKey]).notes.q1, "本机笔记");
const fresh = snapshot({}, {});
const legacyCloud = snapshot({ q2: "mastered" }, { q2: "旧云端笔记" });
assert.equal(JSON.parse(mergeRecords(fresh, legacyCloud).values[journalKey]).notes.q2, "旧云端笔记");
assert.equal(JSON.parse(mergeRecords(fresh, legacyCloud).values[masteryKey]).questionMasteryMap.q2, "mastered");

const before = JSON.stringify({ version: 1, notes: { q1: "旧" } });
const after = JSON.stringify({ version: 1, notes: { q1: "新" } });
trackRecordChange(journalKey, null, before);
assert.equal(storage.get(clockKey), undefined);
trackRecordChange(journalKey, before, after);
assert.ok(JSON.parse(storage.get(clockKey))[`${journalKey}/notes:q1`] > 0);
const [, , answersKey, masteredKey, reviewKey, draftKey, preferencesKey, dailyKey, modelKey, syncDisplayKey] = stateKeys;
const englishLocal = { version: 1, updatedAt: "", values: {
  [answersKey]: JSON.stringify({ "2000-T1-Q11": { choice: "A" } }),
  [masteredKey]: JSON.stringify(["signal", "system"]),
  [reviewKey]: JSON.stringify({ cards: { signal: { reps: 2 } }, logs: [] }),
  [draftKey]: JSON.stringify("本机作文"),
  [preferencesKey]: JSON.stringify({ theme: "dark", size: 18 }),
  [dailyKey]: JSON.stringify({ "2026-10-30": { title: "今日阅读" } }),
  [modelKey]: JSON.stringify("codex:gpt-6-sol"),
  [syncDisplayKey]: JSON.stringify("compact"),
}, clocks: { [`${masteredKey}/mastered:signal`]: 20, [`${draftKey}/value`]: 20, [`${modelKey}/value`]: 20, [`${syncDisplayKey}/value`]: 20 } };
const englishRemote = { version: 1, updatedAt: "", values: {
  [answersKey]: JSON.stringify({ "2001-T1-Q21": { choice: "C" } }),
  [masteredKey]: JSON.stringify(["signal", "fourier"]),
  [reviewKey]: JSON.stringify({ cards: { fourier: { reps: 3 } }, logs: [] }),
  [draftKey]: JSON.stringify("云端旧作文"),
  [preferencesKey]: JSON.stringify({ theme: "light", size: 19 }),
  [dailyKey]: JSON.stringify({ "2026-10-29": { title: "昨日阅读" } }),
  [modelKey]: JSON.stringify("codex:gpt-5.4"),
  [syncDisplayKey]: JSON.stringify("full"),
}, clocks: { [`${masteredKey}/mastered:fourier`]: 30, [`${draftKey}/value`]: 10 } };
const englishMerged = mergeRecords(englishLocal, englishRemote);
assert.deepEqual(new Set(JSON.parse(englishMerged.values[masteredKey])), new Set(["signal", "system", "fourier"]));
assert.equal(JSON.parse(englishMerged.values[answersKey])["2001-T1-Q21"].choice, "C");
assert.equal(JSON.parse(englishMerged.values[reviewKey]).cards.fourier.reps, 3);
assert.equal(JSON.parse(englishMerged.values[draftKey]), "本机作文");
assert.equal(JSON.parse(englishMerged.values[dailyKey])["2026-10-29"].title, "昨日阅读");
assert.equal(JSON.parse(englishMerged.values[modelKey]), "codex:gpt-6-sol");
assert.equal(JSON.parse(englishMerged.values[syncDisplayKey]), "compact");
console.log("Sync merge, legacy records, tombstones and change clocks passed.");
