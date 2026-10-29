export const stateKeys = ["study-wiki-wall.persisted-state.ustc843", "study-wiki-wall.learning-journal"] as const;
export const clockKey = "study-wiki-wall.sync-clocks.v1";

export type ClockMap = Record<string, number>;
export type CloudState = { version: 1; updatedAt: string; values: Record<string, string>; clocks?: ClockMap };

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);
const parse = (value: string | null): JsonObject => {
  try { const parsed: unknown = JSON.parse(value || "null"); return object(parsed) ? parsed : {}; }
  catch { return {}; }
};

function fields(value: JsonObject): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, content] of Object.entries(value)) {
    if (name === "version") continue;
    if (object(content) && ["questionMasteryMap", "questionFavoriteMap", "notes", "scratch", "activity"].includes(name)) {
      for (const [id, item] of Object.entries(content)) result[`${name}:${id}`] = item;
    } else result[name] = content;
  }
  return result;
}

export function trackRecordChange(storageKey: string, previous: string | null, next: string) {
  if (previous === null) return;
  const before = fields(parse(previous));
  const after = fields(parse(next));
  const clocks = parse(localStorage.getItem(clockKey)) as ClockMap;
  const timestamp = Date.now();
  for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[name]) !== JSON.stringify(after[name])) clocks[`${storageKey}/${name}`] = timestamp;
  }
  localStorage.setItem(clockKey, JSON.stringify(clocks));
}

export function localSnapshot(): CloudState {
  return {
    version: 1, updatedAt: new Date().toISOString(),
    values: Object.fromEntries(stateKeys.map(key => [key, localStorage.getItem(key) || ""])),
    clocks: parse(localStorage.getItem(clockKey)) as ClockMap,
  };
}

export function mergeRecords(local: CloudState, remote: CloudState | null): CloudState {
  if (!remote) return local;
  const values: Record<string, string> = {};
  const clocks: ClockMap = { ...remote.clocks, ...local.clocks };
  for (const key of stateKeys) {
    const localObject = parse(local.values[key]);
    const remoteObject = parse(remote.values[key]);
    const localFields = fields(localObject);
    const remoteFields = fields(remoteObject);
    const merged: JsonObject = { version: 1 };
    for (const name of new Set([...Object.keys(localFields), ...Object.keys(remoteFields)])) {
      const localClock = local.clocks?.[`${key}/${name}`] || 0;
      const remoteClock = remote.clocks?.[`${key}/${name}`] || 0;
      const hasLocal = Object.hasOwn(localFields, name);
      const hasRemote = Object.hasOwn(remoteFields, name);
      // Legacy records have no clocks. Keep local conflicts, while importing missing remote entries.
      const localEmpty = localFields[name] === null || localFields[name] === "";
      const takeRemote = remoteClock > localClock ||
        (remoteClock === localClock && hasRemote && (!hasLocal || (localClock === 0 && localEmpty)));
      const chosen = takeRemote ? remoteFields[name] : localFields[name];
      clocks[`${key}/${name}`] = Math.max(localClock, remoteClock);
      if (chosen === undefined) continue;
      const separator = name.indexOf(":");
      if (separator < 0) merged[name] = chosen;
      else {
        const group = name.slice(0, separator);
        const id = name.slice(separator + 1);
        const map = object(merged[group]) ? merged[group] : {};
        map[id] = chosen;
        merged[group] = map;
      }
    }
    values[key] = Object.keys(merged).length > 1 ? JSON.stringify(merged) : "";
  }
  return { version: 1, updatedAt: new Date().toISOString(), values, clocks };
}

export function applySnapshot(snapshot: CloudState) {
  for (const key of stateKeys) {
    if (snapshot.values[key]) localStorage.setItem(key, snapshot.values[key]);
    else localStorage.removeItem(key);
  }
  localStorage.setItem(clockKey, JSON.stringify(snapshot.clocks || {}));
}

export function sameSnapshot(a: CloudState, b: CloudState) {
  return stateKeys.every(key => a.values[key] === b.values[key]) &&
    JSON.stringify(a.clocks || {}) === JSON.stringify(b.clocks || {});
}
