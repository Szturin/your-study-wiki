export type EnglishBank = {
  reading: {
    articles: { id: string; year: number; text: number; topic: string; body?: string; paragraphs: { label: string; text: string }[]; questions: { number: number; answer: string }[] }[];
    questions: { id: string; year: number; text: number; number: number; stem: string; type: string; options: { label: string; text: string }[]; answer: string; locator: { p: string; text: string }[]; analysisStatus: string }[];
    vocab: { word: string; meaning: string; usage: string; phonetic: string; articles: number; example?: { sentence: string; source: string } }[];
    phrases: [string, string, string, string][];
  };
  knowledge: {
    sources: Record<string, string>;
    cards: { kind: "vocab" | "sentence" | "method"; source: string; title: string; en?: string; body?: string; chips?: string[]; steps?: [string, string][] }[];
  };
  writing: {
    smallTemplates: { name: string; logic: string[]; tpl: string }[];
    bigTemplates: { name: string; logic: string[]; tpl: string }[];
    phraseGroups: Record<string, [string, [string, string][]][]>;
    coreWords: [string, [string, string][]][];
    topics: [string, [string, string][]][];
    methodSections: { title: string; blocks: { kind: "heading" | "list" | "text"; text: string }[] }[];
  };
};
