"use client";

import { useEffect, useState } from "react";

const KEY = "study-wiki-wall.learning-journal";
type Journal = {
  version: 1;
  notes: Record<string, string>;
  scratch: Record<string, string>;
  activity: Record<string, number>;
  lastQuestionId: string;
  examDate: string;
};
const empty: Journal = { version: 1, notes: {}, scratch: {}, activity: {}, lastQuestionId: "", examDate: "" };
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sanitize(value: unknown, ids: ReadonlySet<string>): Journal {
  if (!record(value) || value.version !== 1) return empty;
  const textMap = (source: unknown) => Object.fromEntries(
    Object.entries(record(source) ? source : {}).filter(([id, text]) => ids.has(id) && typeof text === "string"),
  ) as Record<string, string>;
  const activity = Object.fromEntries(Object.entries(record(value.activity) ? value.activity : {})
    .filter(([day, count]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && typeof count === "number" && Number.isSafeInteger(count) && count > 0)) as Record<string, number>;
  return {
    version: 1, notes: textMap(value.notes), scratch: textMap(value.scratch), activity,
    lastQuestionId: typeof value.lastQuestionId === "string" && ids.has(value.lastQuestionId) ? value.lastQuestionId : "",
    examDate: typeof value.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.examDate) && !Number.isNaN(Date.parse(value.examDate)) ? value.examDate : "",
  };
}

export function useLearningJournal(ids: ReadonlySet<string>) {
  const [journal, setJournal] = useState<Journal>(empty);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [today, setToday] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setToday(localDay(new Date()));
      try { setJournal(sanitize(JSON.parse(localStorage.getItem(KEY) || "null"), ids)); }
      catch { /* Corrupt state does not prevent learning. */ }
      setReady(true);
    }, 0);
    const midnight = window.setInterval(() => setToday(localDay(new Date())), 60000);
    return () => { clearTimeout(timer); clearInterval(midnight); };
  }, [ids]);
  useEffect(() => {
    if (!ready) return;
    // Save after each edit so closing a practice page does not discard the final note.
    let failed = false;
    try { localStorage.setItem(KEY, JSON.stringify(journal)); window.dispatchEvent(new Event("study-record-changed")); }
    catch { failed = true; }
    const notification = window.setTimeout(() => setSaveError(failed), 0);
    return () => clearTimeout(notification);
  }, [journal, ready]);

  function update(patch: Partial<Journal>) {
    setJournal(current => {
      const next = { ...current, ...patch };
      return next;
    });
  }
  function setText(kind: "notes" | "scratch", id: string, text: string) {
    if (!ids.has(id)) return;
    setJournal(current => ({ ...current, [kind]: { ...current[kind], [id]: text } }));
  }
  function recordReview() {
    const day = localDay(new Date());
    setJournal(current => ({ ...current, activity: { ...current.activity, [day]: (current.activity[day] || 0) + 1 } }));
  }
  return { journal, ready, saveError, today, update, setText, recordReview };
}
