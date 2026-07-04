"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  ChapterNode,
  KnowledgeNode,
  LastMasteredRecord,
  MasteryState,
  QuestionEntry,
  StudyWallPersistedState,
  SubjectId,
  SubjectWiki,
  TypeGroup,
} from "@/types/study-wall";

export type OverviewQuestion = {
  question: QuestionEntry;
  typeGroup: TypeGroup;
};

const STUDY_WALL_STATE_STORAGE_KEY = "study-wiki-wall.persisted-state";

function isMasteryState(value: unknown): value is MasteryState {
  return value === "mastered" || value === "blurred" || value === "unknown";
}

function sanitizePersistedState(
  payload: StudyWallPersistedState,
  validQuestionIds: ReadonlySet<string>,
): StudyWallPersistedState {
  const questionMasteryMap = Object.fromEntries(
    Object.entries(payload.questionMasteryMap ?? {}).filter(
      ([questionId, mastery]) => validQuestionIds.has(questionId) && isMasteryState(mastery),
    ),
  );

  const questionFavoriteMap = Object.fromEntries(
    Object.entries(payload.questionFavoriteMap ?? {}).filter(
      ([questionId, favorite]) => validQuestionIds.has(questionId) && favorite === true,
    ),
  );

  const lastMasteredRecord =
    payload.lastMasteredRecord && validQuestionIds.has(payload.lastMasteredRecord.questionId)
      ? payload.lastMasteredRecord
      : null;

  return {
    questionMasteryMap,
    questionFavoriteMap,
    lastMasteredRecord,
  };
}

export function useStudyWallDashboard(subjects: readonly SubjectWiki[]) {
  const preferredSubject = subjects.find((subject) => subject.id === "signal-system") ?? subjects[0];
  const preferredChapterId = preferredSubject?.chapters[0]?.id ?? "";

  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId>(
    preferredSubject?.id ?? "signal-system",
  );
  const [selectedChapterId, setSelectedChapterId] = useState(preferredChapterId);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [query, setQuery] = useState("");
  const [questionMasteryMap, setQuestionMasteryMap] = useState<Record<string, MasteryState>>({});
  const [questionFavoriteMap, setQuestionFavoriteMap] = useState<Record<string, boolean>>({});
  const [lastMasteredRecord, setLastMasteredRecord] = useState<LastMasteredRecord | null>(null);
  const [expandedChapterId, setExpandedChapterId] = useState(preferredChapterId);
  const [expandedKnowledgeId, setExpandedKnowledgeId] = useState("");
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);

  const validQuestionIds = useMemo(() => {
    return new Set(
      subjects.flatMap((subject) =>
        subject.chapters.flatMap((chapter) =>
          chapter.typeGroups.flatMap((typeGroup) => typeGroup.questions.map((question) => question.id)),
        ),
      ),
    );
  }, [subjects]);

  const selectedSubject = useMemo(() => {
    return subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null;
  }, [selectedSubjectId, subjects]);

  const chapters = useMemo(() => selectedSubject?.chapters ?? [], [selectedSubject]);

  const effectiveSelectedChapterId = useMemo(() => {
    return chapters.some((chapter) => chapter.id === selectedChapterId)
      ? selectedChapterId
      : chapters[0]?.id ?? "";
  }, [chapters, selectedChapterId]);

  const selectedChapter = useMemo<ChapterNode | null>(() => {
    return chapters.find((chapter) => chapter.id === effectiveSelectedChapterId) ?? null;
  }, [chapters, effectiveSelectedChapterId]);

  const knowledgeNodes = useMemo(
    () => selectedChapter?.knowledgeNodes ?? [],
    [selectedChapter],
  );

  const effectiveSelectedKnowledgeId = useMemo(() => {
    return knowledgeNodes.some((node) => node.id === selectedKnowledgeId) ? selectedKnowledgeId : "";
  }, [knowledgeNodes, selectedKnowledgeId]);

  const selectedKnowledge = useMemo<KnowledgeNode | null>(() => {
    if (!selectedChapter) {
      return null;
    }

    return selectedChapter.knowledgeNodes.find((node) => node.id === effectiveSelectedKnowledgeId) ?? null;
  }, [effectiveSelectedKnowledgeId, selectedChapter]);

  const effectiveExpandedChapterId = useMemo(() => {
    return chapters.some((chapter) => chapter.id === expandedChapterId)
      ? expandedChapterId
      : effectiveSelectedChapterId;
  }, [chapters, effectiveSelectedChapterId, expandedChapterId]);

  const effectiveExpandedKnowledgeId = useMemo(() => {
    return knowledgeNodes.some((node) => node.id === expandedKnowledgeId) ? expandedKnowledgeId : "";
  }, [expandedKnowledgeId, knowledgeNodes]);

  const overviewQuestions = useMemo<OverviewQuestion[]>(() => {
    if (!selectedChapter) {
      return [];
    }

    const flattened = selectedChapter.typeGroups.flatMap((typeGroup) =>
      typeGroup.questions.map((question) => ({
        question,
        typeGroup,
      })),
    );

    const normalizedQuery = query.trim().toLowerCase();

    return flattened.filter(({ question, typeGroup }) => {
      const matchesKnowledge = selectedKnowledge
        ? question.knowledgePoint === selectedKnowledge.name
        : true;

      if (!matchesKnowledge) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        question.title,
        question.source,
        question.knowledgePoint,
        question.prompt,
        question.note,
        question.strategy.join(" "),
        typeGroup.name,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, selectedChapter, selectedKnowledge]);

  const allChapterQuestions = useMemo<OverviewQuestion[]>(() => {
    if (!selectedChapter) {
      return [];
    }

    return selectedChapter.typeGroups.flatMap((typeGroup) =>
      typeGroup.questions.map((question) => ({
        question,
        typeGroup,
      })),
    );
  }, [selectedChapter]);

  const selectedQuestionBundle = useMemo(() => {
    if (!selectedQuestionId) {
      return null;
    }

    return allChapterQuestions.find(({ question }) => question.id === selectedQuestionId) ?? null;
  }, [allChapterQuestions, selectedQuestionId]);

  const treeQuestionsByKnowledge = useMemo(() => {
    if (!selectedChapter) {
      return {} as Record<string, OverviewQuestion[]>;
    }

    return selectedChapter.knowledgeNodes.reduce<Record<string, OverviewQuestion[]>>(
      (accumulator, node) => {
        accumulator[node.id] = selectedChapter.typeGroups.flatMap((typeGroup) =>
          typeGroup.questions
            .filter((question) => question.knowledgePoint === node.name)
            .map((question) => ({ question, typeGroup })),
        );

        return accumulator;
      },
      {},
    );
  }, [selectedChapter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const rawState = window.localStorage.getItem(STUDY_WALL_STATE_STORAGE_KEY);

        if (!rawState) {
          return;
        }

        const payload = JSON.parse(rawState) as StudyWallPersistedState;
        const sanitized = sanitizePersistedState(payload, validQuestionIds);

        setQuestionMasteryMap(sanitized.questionMasteryMap);
        setQuestionFavoriteMap(sanitized.questionFavoriteMap);
        setLastMasteredRecord(sanitized.lastMasteredRecord);
      } catch {
        // Ignore malformed local state and keep defaults.
      } finally {
        setHasLoadedPersistedState(true);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [validQuestionIds]);

  useEffect(() => {
    if (!hasLoadedPersistedState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STUDY_WALL_STATE_STORAGE_KEY,
          JSON.stringify({
            questionMasteryMap,
            questionFavoriteMap,
            lastMasteredRecord,
          } satisfies StudyWallPersistedState),
        );
      } catch {
        // Keep UI usable even if the local save fails.
      }
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasLoadedPersistedState, lastMasteredRecord, questionFavoriteMap, questionMasteryMap]);

  function setQuestionMastery(questionId: string, mastery: MasteryState) {
    setQuestionMasteryMap((current) => ({
      ...current,
      [questionId]: mastery,
    }));

    if (mastery !== "mastered") {
      return;
    }

    const matchedSubject = subjects.find((subject) =>
      subject.chapters.some((chapter) =>
        chapter.typeGroups.some((typeGroup) =>
          typeGroup.questions.some((question) => question.id === questionId),
        ),
      ),
    );

    if (!matchedSubject) {
      return;
    }

    const matchedChapter = matchedSubject.chapters.find((chapter) =>
      chapter.typeGroups.some((typeGroup) =>
        typeGroup.questions.some((question) => question.id === questionId),
      ),
    );

    if (!matchedChapter) {
      return;
    }

    const matchedQuestion = matchedChapter.typeGroups
      .flatMap((typeGroup) => typeGroup.questions)
      .find((question) => question.id === questionId);

    if (!matchedQuestion) {
      return;
    }

    const matchedKnowledge =
      matchedChapter.knowledgeNodes.find((node) => node.name === matchedQuestion.knowledgePoint) ??
      matchedChapter.knowledgeNodes[0];

    setLastMasteredRecord({
      subjectId: matchedSubject.id,
      subjectName: matchedSubject.name,
      chapterId: matchedChapter.id,
      chapterName: matchedChapter.name,
      knowledgeId: matchedKnowledge?.id ?? "",
      knowledgeName: matchedKnowledge?.name ?? matchedQuestion.knowledgePoint,
      questionId: matchedQuestion.id,
      questionTitle: matchedQuestion.title,
      masteredAt: new Date().toISOString(),
    });
  }

  function toggleQuestionFavorite(questionId: string) {
    setQuestionFavoriteMap((current) => ({
      ...current,
      [questionId]: !current[questionId],
    }));
  }

  function selectSubject(subjectId: SubjectId) {
    const nextSubject = subjects.find((subject) => subject.id === subjectId) ?? subjects[0] ?? null;
    const nextChapterId = nextSubject?.chapters[0]?.id ?? "";

    setSelectedSubjectId(nextSubject?.id ?? "signal-system");
    setSelectedChapterId(nextChapterId);
    setExpandedChapterId(nextChapterId);
    setSelectedKnowledgeId("");
    setExpandedKnowledgeId("");
    setSelectedQuestionId("");
    setQuery("");
  }

  function selectChapter(chapterId: string) {
    setSelectedChapterId(chapterId);
    setExpandedChapterId(chapterId);
    setSelectedKnowledgeId("");
    setExpandedKnowledgeId("");
    setSelectedQuestionId("");
  }

  function toggleChapter(chapterId: string) {
    setExpandedChapterId((current) => {
      const nextValue = current === chapterId ? "" : chapterId;

      if (current === chapterId) {
        setExpandedKnowledgeId("");
      }

      return nextValue;
    });
  }

  function selectKnowledge(knowledgeId: string) {
    setSelectedKnowledgeId(knowledgeId);
    setExpandedKnowledgeId(knowledgeId);
    setSelectedQuestionId("");
  }

  function toggleKnowledge(knowledgeId: string) {
    setExpandedKnowledgeId((current) => (current === knowledgeId ? "" : knowledgeId));
  }

  function openQuestion(questionId: string) {
    setSelectedQuestionId(questionId);

    const questionBundle = allChapterQuestions.find(({ question }) => question.id === questionId);

    if (!questionBundle || !selectedChapter) {
      return;
    }

    const knowledgeNode = selectedChapter.knowledgeNodes.find(
      (node) => node.name === questionBundle.question.knowledgePoint,
    );

    if (knowledgeNode) {
      setSelectedKnowledgeId(knowledgeNode.id);
      setExpandedKnowledgeId(knowledgeNode.id);
    }

    setExpandedChapterId(selectedChapter.id);
  }

  function jumpToQuestion(questionId: string) {
    const matchedSubject = subjects.find((subject) =>
      subject.chapters.some((chapter) =>
        chapter.typeGroups.some((typeGroup) =>
          typeGroup.questions.some((question) => question.id === questionId),
        ),
      ),
    );

    if (!matchedSubject) {
      return;
    }

    const matchedChapter = matchedSubject.chapters.find((chapter) =>
      chapter.typeGroups.some((typeGroup) =>
        typeGroup.questions.some((question) => question.id === questionId),
      ),
    );

    if (!matchedChapter) {
      return;
    }

    const matchedQuestion = matchedChapter.typeGroups
      .flatMap((typeGroup) => typeGroup.questions)
      .find((question) => question.id === questionId);

    if (!matchedQuestion) {
      return;
    }

    const matchedKnowledge =
      matchedChapter.knowledgeNodes.find((node) => node.name === matchedQuestion.knowledgePoint) ?? null;

    setSelectedSubjectId(matchedSubject.id);
    setSelectedChapterId(matchedChapter.id);
    setExpandedChapterId(matchedChapter.id);
    setSelectedKnowledgeId(matchedKnowledge?.id ?? "");
    setExpandedKnowledgeId(matchedKnowledge?.id ?? "");
    setSelectedQuestionId(questionId);
    setQuery("");
  }

  return {
    selectedSubject,
    selectedChapter,
    selectedKnowledge,
    selectedQuestionBundle,
    chapters,
    knowledgeNodes,
    overviewQuestions,
    treeQuestionsByKnowledge,
    query,
    selectedSubjectId,
    selectedChapterId: effectiveSelectedChapterId,
    selectedKnowledgeId: effectiveSelectedKnowledgeId,
    selectedQuestionId,
    expandedChapterId: effectiveExpandedChapterId,
    expandedKnowledgeId: effectiveExpandedKnowledgeId,
    questionMasteryMap,
    questionFavoriteMap,
    lastMasteredRecord,
    hasLoadedPersistedState,
    selectSubject,
    selectChapter,
    toggleChapter,
    selectKnowledge,
    toggleKnowledge,
    openQuestion,
    jumpToQuestion,
    setSelectedQuestionId,
    setQuestionMastery,
    toggleQuestionFavorite,
    setQuery,
  };
}
