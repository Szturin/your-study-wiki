export type SubjectId = "signal-system";
export type TypeDifficulty = "基础" | "综合" | "提高";
export type MasteryState = "mastered" | "blurred" | "unknown";

export interface KnowledgeNode {
  id: string;
  name: string;
  summary: string;
}

export interface QuestionEntry {
  id: string;
  title: string;
  year: string;
  source: string;
  knowledgePoint: string;
  prompt: string;
  latex?: string;
  note: string;
  strategy: string[];
  mastery: MasteryState;
  paperMajor?: number;
  paperMinor?: number | null;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  sourcePage?: number;
  proofMarker?: string;
}

export interface TypeGroup {
  id: string;
  name: string;
  description: string;
  difficulty: TypeDifficulty;
  years: string;
  questionCount: number;
  knowledgePoints: string[];
  questions: QuestionEntry[];
}

export interface ChapterNode {
  id: string;
  name: string;
  summary: string;
  knowledgeNodes: KnowledgeNode[];
  typeGroups: TypeGroup[];
}

export interface SubjectWiki {
  id: SubjectId;
  name: string;
  shortName: string;
  description: string;
  chapters: ChapterNode[];
}

export interface LastMasteredRecord {
  subjectId: SubjectId;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  knowledgeId: string;
  knowledgeName: string;
  questionId: string;
  questionTitle: string;
  masteredAt: string;
}

export interface StudyWallPersistedState {
  version: 1;
  questionMasteryMap: Record<string, MasteryState>;
  questionFavoriteMap: Record<string, boolean>;
  lastMasteredRecord: LastMasteredRecord | null;
}
