"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useStudyWallDashboard } from "@/hooks/use-study-wall-dashboard";
import { MathMarkdown } from "@/components/ui/math-markdown";
import { SignalAlgorithmLab } from "@/components/dashboard/signal-algorithm-lab";
import type { MasteryState, SubjectId, SubjectWiki } from "@/types/study-wall";

type StudyWallDashboardProps = {
  subjects: readonly SubjectWiki[];
};

type DashboardMode = "home" | "wrongbook" | "favorite" | "algorithms";
type CollectionDashboardMode = Extract<DashboardMode, "wrongbook" | "favorite">;
type ThemeMode = "light" | "dark";
type CollectionViewMode = "list" | "mindmap";
type MindMapLayoutMode = "tree" | "framework";
type StartupLoaderPhase = "boot" | "reveal" | "hidden";

type StartupSignalLoaderProps = {
  phase: StartupLoaderPhase;
};

type NavItemProps = {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

type QuestionRow = {
  rowId: string;
  subjectId: SubjectId;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  knowledgeId: string;
  knowledgeName: string;
  typeGroupId: string;
  typeGroupName: string;
  questionId: string;
  title: string;
  year: string;
  source: string;
  prompt: string;
  note: string;
  strategy: string[];
  mastery: MasteryState;
};

type MindMapQuestionNode = {
  id: string;
  questionId: string;
  title: string;
  year: string;
  source: string;
  typeGroupName: string;
  promptPreview: string;
  promptDetail: string;
  promptPreviewText: string;
  promptDetailText: string;
};

type MindMapKnowledgeNode = {
  id: string;
  name: string;
  questions: MindMapQuestionNode[];
};

type MindMapChapterNode = {
  id: string;
  name: string;
  knowledges: MindMapKnowledgeNode[];
};

type MindMapRootNode = {
  subjectId: SubjectId;
  subjectName: string;
  mode: CollectionDashboardMode;
  chapters: MindMapChapterNode[];
};

type MindMapRenderKind = "root" | "chapter" | "knowledge" | "question";

type MindMapRenderNode = {
  id: string;
  kind: MindMapRenderKind;
  signature: string;
  dirty: boolean;
  title: string;
  subtitle: string;
  meta?: string;
  preview?: string;
  detail?: string;
  previewText?: string;
  detailText?: string;
  questionId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  subtreeHeight: number;
  depth: number;
  questionCount: number;
  leafCount: number;
  collapsed?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  framed?: boolean;
  children: MindMapRenderNode[];
};

const MINDMAP_NODE_SIZE: Record<MindMapRenderKind, { width: number; height: number }> = {
  root: { width: 252, height: 116 },
  chapter: { width: 248, height: 96 },
  knowledge: { width: 224, height: 82 },
  question: { width: 372, height: 156 },
};

const MINDMAP_CANVAS_PADDING = {
  x: 96,
  y: 72,
};

const MINDMAP_FRAME_LAYOUT = {
  rootWidth: 1540,
  rootHeaderHeight: 104,
  rootPadding: 34,
  chapterColumns: 2,
  chapterGap: 28,
  chapterHeaderHeight: 84,
  chapterPadding: 22,
  chapterMinHeight: 220,
  knowledgeColumns: 2,
  knowledgeGap: 16,
  knowledgeHeaderHeight: 62,
  knowledgePadding: 16,
  knowledgeMinHeight: 138,
  questionGap: 10,
  questionHeight: 92,
};

const MINDMAP_LOD_THRESHOLD = {
  compact: 0.62,
  math: 0.92,
};

const MINDMAP_LOD_HYSTERESIS = 0.08;
const MINDMAP_MIN_SCALE = 0.35;
const MINDMAP_MAX_SCALE = 5;
const MINDMAP_SCALE_STEP = 0.12;
const STARTUP_PIXEL_COLUMNS = 16;
const STARTUP_PIXEL_COUNT = STARTUP_PIXEL_COLUMNS * 11;
const STARTUP_PIXEL_INDICES = Array.from({ length: STARTUP_PIXEL_COUNT }, (_, index) => index);

type MindMapQuestionRenderMode = "compact" | "summary" | "math";

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePromptContent(prompt: string) {
  return prompt
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createPlainPreviewText(prompt: string, limit: number) {
  return prompt
    .replace(/\$\$/g, " ")
    .replace(/\$/g, " ")
    .replace(/\\\[|\\\]/g, " ")
    .replace(/\\\(|\\\)/g, " ")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function getMindMapQuestionHeight(expanded: boolean) {
  const baseHeight = 188;

  if (!expanded) {
    return baseHeight;
  }

  return baseHeight + 72;
}

function canExpandMindMapQuestion(questionNode: MindMapQuestionNode) {
  return questionNode.promptDetailText.length > questionNode.promptPreviewText.length + 18;
}

function getMindMapVerticalGap(kind: MindMapRenderKind, childCount: number, questionCount: number) {
  if (childCount <= 1) {
    return 0;
  }

  if (kind === "root") {
    return clampNumber(56 - Math.max(0, childCount - 3) * 4, 28, 56);
  }

  if (kind === "chapter") {
    return clampNumber(32 - Math.max(0, childCount - 4) * 3 - Math.floor(questionCount / 8), 12, 32);
  }

  if (kind === "knowledge") {
    return clampNumber(18 - Math.max(0, childCount - 3) * 1.8 - Math.floor(questionCount / 6), 8, 18);
  }

  return 0;
}

function getMindMapHorizontalGap(kind: MindMapRenderKind, questionCount: number, leafCount: number) {
  if (kind === "root") {
    return clampNumber(132 - Math.max(0, leafCount - 4) * 2, 104, 132);
  }

  if (kind === "chapter") {
    return clampNumber(118 - Math.max(0, questionCount - 8) * 1.8, 88, 118);
  }

  if (kind === "knowledge") {
    return clampNumber(106 - Math.max(0, questionCount - 4) * 3.4, 70, 106);
  }

  return 0;
}

function getNextMindMapQuestionRenderMode(
  scale: number,
  currentMode: MindMapQuestionRenderMode,
): MindMapQuestionRenderMode {
  if (currentMode === "compact") {
    return scale >= MINDMAP_LOD_THRESHOLD.compact + MINDMAP_LOD_HYSTERESIS ? "summary" : "compact";
  }

  if (currentMode === "summary") {
    if (scale <= MINDMAP_LOD_THRESHOLD.compact - MINDMAP_LOD_HYSTERESIS) {
      return "compact";
    }

    if (scale >= MINDMAP_LOD_THRESHOLD.math + MINDMAP_LOD_HYSTERESIS) {
      return "math";
    }

    return "summary";
  }

  return scale <= MINDMAP_LOD_THRESHOLD.math - MINDMAP_LOD_HYSTERESIS ? "summary" : "math";
}

function getMindMapInitialOffset(layoutMode: MindMapLayoutMode) {
  return layoutMode === "framework" ? { x: 46, y: 58 } : { x: 120, y: 80 };
}

function buildMindMapRenderTree(
  collectionMindMap: MindMapRootNode,
  questionCount: number,
  collapsedNodeMap: Record<string, boolean>,
  expandedQuestionMap: Record<string, boolean>,
  previousTree?: MindMapRenderNode | null,
): MindMapRenderNode {
  const previousNodeMap = new Map<string, MindMapRenderNode>();

  if (previousTree) {
    const stack = [previousTree];

    while (stack.length > 0) {
      const currentNode = stack.pop();

      if (!currentNode) {
        continue;
      }

      previousNodeMap.set(currentNode.id, currentNode);
      stack.push(...currentNode.children);
    }
  }

  function reuseOrCreateNode(node: MindMapRenderNode): MindMapRenderNode {
    const previousNode = previousNodeMap.get(node.id);

    if (previousNode && previousNode.signature === node.signature) {
      previousNode.dirty = false;
      previousNode.title = node.title;
      previousNode.subtitle = node.subtitle;
      previousNode.meta = node.meta;
      previousNode.preview = node.preview;
      previousNode.detail = node.detail;
      previousNode.previewText = node.previewText;
      previousNode.detailText = node.detailText;
      previousNode.width = node.width;
      previousNode.height = node.height;
      previousNode.expandable = node.expandable;
      previousNode.expanded = node.expanded;
      previousNode.collapsed = node.collapsed;
      previousNode.children = node.children;
      previousNode.questionId = node.questionId;
      return previousNode;
    }

    return node;
  }

  function buildQuestionNode(questionNode: MindMapQuestionNode): MindMapRenderNode {
    const isExpanded = expandedQuestionMap[questionNode.id] === true;
    const canExpand = canExpandMindMapQuestion(questionNode);
    const questionHeight = getMindMapQuestionHeight(canExpand && isExpanded);
    const signature = [
      "question",
      questionNode.id,
      canExpand ? "expandable" : "fixed",
      isExpanded ? "open" : "closed",
      questionHeight,
      questionNode.promptPreviewText.length,
      questionNode.promptDetailText.length,
    ].join(":");

    return reuseOrCreateNode({
      id: questionNode.id,
      kind: "question",
      signature,
      dirty: true,
      questionId: questionNode.questionId,
      title: questionNode.title,
      subtitle: questionNode.title,
      meta: `${questionNode.year} · ${questionNode.source} · ${questionNode.typeGroupName}`,
      preview: questionNode.promptPreview,
      detail: questionNode.promptDetail,
      previewText: questionNode.promptPreviewText,
      detailText: questionNode.promptDetailText,
      x: 0,
      y: 0,
      width: MINDMAP_NODE_SIZE.question.width,
      height: questionHeight,
      subtreeHeight: questionHeight,
      depth: 3,
      questionCount: 1,
      leafCount: 1,
      expandable: canExpand,
      expanded: canExpand && isExpanded,
      children: [],
    });
  }

  function buildKnowledgeNode(knowledgeNode: MindMapKnowledgeNode): MindMapRenderNode {
    const collapsed = collapsedNodeMap[knowledgeNode.id] === true;
    const children = collapsed ? [] : knowledgeNode.questions.map(buildQuestionNode);
    const signature = [
      "knowledge",
      knowledgeNode.id,
      collapsed ? "collapsed" : "expanded",
      ...children.map((child) => child.signature),
    ].join("|");

    return reuseOrCreateNode({
      id: knowledgeNode.id,
      kind: "knowledge",
      signature,
      dirty: true,
      title: knowledgeNode.name,
      subtitle: `${knowledgeNode.questions.length} 道题`,
      x: 0,
      y: 0,
      width: MINDMAP_NODE_SIZE.knowledge.width,
      height: MINDMAP_NODE_SIZE.knowledge.height,
      subtreeHeight: MINDMAP_NODE_SIZE.knowledge.height,
      depth: 2,
      questionCount: knowledgeNode.questions.length,
      leafCount: Math.max(knowledgeNode.questions.length, 1),
      collapsed,
      expandable: knowledgeNode.questions.length > 0,
      children,
    });
  }

  function buildChapterNode(chapterNode: MindMapChapterNode): MindMapRenderNode {
    const collapsed = collapsedNodeMap[chapterNode.id] === true;
    const children = collapsed ? [] : chapterNode.knowledges.map(buildKnowledgeNode);
    const questionTotal = chapterNode.knowledges.reduce((sum, knowledge) => sum + knowledge.questions.length, 0);
    const signature = [
      "chapter",
      chapterNode.id,
      collapsed ? "collapsed" : "expanded",
      ...children.map((child) => child.signature),
    ].join("|");

    return reuseOrCreateNode({
      id: chapterNode.id,
      kind: "chapter",
      signature,
      dirty: true,
      title: chapterNode.name,
      subtitle: `${questionTotal} 道题`,
      x: 0,
      y: 0,
      width: MINDMAP_NODE_SIZE.chapter.width,
      height: MINDMAP_NODE_SIZE.chapter.height,
      subtreeHeight: MINDMAP_NODE_SIZE.chapter.height,
      depth: 1,
      questionCount: 0,
      leafCount: 0,
      collapsed,
      expandable: chapterNode.knowledges.length > 0,
      children,
    });
  }

  const rootChildren = collectionMindMap.chapters.map(buildChapterNode);
  const rootSignature = [
    "root",
    collectionMindMap.mode,
    collectionMindMap.subjectId,
    questionCount,
    ...rootChildren.map((child) => child.signature),
  ].join("|");

  const rootNode = reuseOrCreateNode({
    id: `${collectionMindMap.mode}-${collectionMindMap.subjectId}`,
    kind: "root",
    signature: rootSignature,
    dirty: true,
    title: collectionMindMap.subjectName,
    subtitle: `${collectionMindMap.mode === "favorite" ? "收藏本" : "错题本"} · ${questionCount} 道题`,
    x: 0,
    y: 0,
    width: MINDMAP_NODE_SIZE.root.width,
    height: MINDMAP_NODE_SIZE.root.height,
    subtreeHeight: MINDMAP_NODE_SIZE.root.height,
    depth: 0,
    questionCount,
    leafCount: Math.max(collectionMindMap.chapters.length, 1),
    children: rootChildren,
  });

  function measure(node: MindMapRenderNode, depth: number): number {
    node.depth = depth;

    if (!node.dirty) {
      return node.subtreeHeight;
    }

    if (node.children.length === 0) {
      node.subtreeHeight = node.height;
      node.leafCount = 1;
      node.questionCount = node.kind === "question" ? 1 : 0;
      node.dirty = false;
      return node.subtreeHeight;
    }

    let questionCountSum = 0;
    let leafCountSum = 0;

    for (const child of node.children) {
      measure(child, depth + 1);
      questionCountSum += child.questionCount;
      leafCountSum += child.leafCount;
    }

    node.questionCount = questionCountSum;
    node.leafCount = Math.max(leafCountSum, 1);

    const gap = getMindMapVerticalGap(node.kind, node.children.length, node.questionCount);
    const childrenHeight =
      node.children.reduce((sum, child) => sum + child.subtreeHeight, 0) + gap * (node.children.length - 1);

    node.subtreeHeight = Math.max(node.height, childrenHeight);
    node.dirty = false;
    return node.subtreeHeight;
  }

  function layout(node: MindMapRenderNode, x: number, top: number) {
    node.x = x;
    node.y = top + node.subtreeHeight / 2 - node.height / 2;

    if (node.children.length === 0) {
      return;
    }

    const gap = getMindMapVerticalGap(node.kind, node.children.length, node.questionCount);
    const totalChildrenHeight =
      node.children.reduce((sum, child) => sum + child.subtreeHeight, 0) + gap * (node.children.length - 1);
    let cursorTop = top + (node.subtreeHeight - totalChildrenHeight) / 2;
    const nextX = x + node.width + getMindMapHorizontalGap(node.kind, node.questionCount, node.leafCount);

    for (const child of node.children) {
      layout(child, nextX, cursorTop);
      cursorTop += child.subtreeHeight + gap;
    }
  }

  measure(rootNode, 0);
  layout(rootNode, 0, 0);

  return rootNode;
}

function buildMindMapFrameworkTree(
  collectionMindMap: MindMapRootNode,
  questionCount: number,
  collapsedNodeMap: Record<string, boolean>,
): MindMapRenderNode {
  const chapterWidth =
    (MINDMAP_FRAME_LAYOUT.rootWidth -
      MINDMAP_FRAME_LAYOUT.rootPadding * 2 -
      MINDMAP_FRAME_LAYOUT.chapterGap * (MINDMAP_FRAME_LAYOUT.chapterColumns - 1)) /
    MINDMAP_FRAME_LAYOUT.chapterColumns;
  const knowledgeWidth =
    (chapterWidth -
      MINDMAP_FRAME_LAYOUT.chapterPadding * 2 -
      MINDMAP_FRAME_LAYOUT.knowledgeGap * (MINDMAP_FRAME_LAYOUT.knowledgeColumns - 1)) /
    MINDMAP_FRAME_LAYOUT.knowledgeColumns;
  const questionWidth = knowledgeWidth - MINDMAP_FRAME_LAYOUT.knowledgePadding * 2;
  const rootContentTop = MINDMAP_FRAME_LAYOUT.rootHeaderHeight + MINDMAP_FRAME_LAYOUT.rootPadding;
  const chapterColumnHeights = Array.from({ length: MINDMAP_FRAME_LAYOUT.chapterColumns }, () => 0);

  function offsetNodeTree(node: MindMapRenderNode, deltaX: number, deltaY: number) {
    node.x += deltaX;
    node.y += deltaY;

    for (const child of node.children) {
      offsetNodeTree(child, deltaX, deltaY);
    }
  }

  const rootNode: MindMapRenderNode = {
    id: `${collectionMindMap.mode}-${collectionMindMap.subjectId}`,
    kind: "root",
    signature: `framework-root:${collectionMindMap.mode}:${collectionMindMap.subjectId}:${questionCount}`,
    dirty: false,
    title: collectionMindMap.subjectName,
    subtitle: `${collectionMindMap.mode === "favorite" ? "收藏本" : "错题本"} · ${questionCount} 道题`,
    x: 0,
    y: 0,
    width: MINDMAP_FRAME_LAYOUT.rootWidth,
    height: MINDMAP_FRAME_LAYOUT.rootHeaderHeight + MINDMAP_FRAME_LAYOUT.rootPadding * 2,
    subtreeHeight: MINDMAP_FRAME_LAYOUT.rootHeaderHeight,
    depth: 0,
    questionCount,
    leafCount: Math.max(collectionMindMap.chapters.length, 1),
    framed: true,
    children: [],
  };

  rootNode.children = collectionMindMap.chapters.map((chapterNode) => {
    const chapterCollapsed = collapsedNodeMap[chapterNode.id] === true;
    const chapterQuestionCount = chapterNode.knowledges.reduce(
      (sum, knowledgeNode) => sum + knowledgeNode.questions.length,
      0,
    );
    const knowledgeColumnHeights = Array.from({ length: MINDMAP_FRAME_LAYOUT.knowledgeColumns }, () => 0);
    const knowledgeChildren: MindMapRenderNode[] = [];

    if (!chapterCollapsed) {
      for (const knowledgeNode of chapterNode.knowledges) {
        const knowledgeCollapsed = collapsedNodeMap[knowledgeNode.id] === true;
        const knowledgeColumnIndex = knowledgeColumnHeights.indexOf(Math.min(...knowledgeColumnHeights));
        const knowledgeX =
          MINDMAP_FRAME_LAYOUT.chapterPadding +
          knowledgeColumnIndex * (knowledgeWidth + MINDMAP_FRAME_LAYOUT.knowledgeGap);
        const knowledgeY =
          MINDMAP_FRAME_LAYOUT.chapterHeaderHeight +
          MINDMAP_FRAME_LAYOUT.chapterPadding +
          knowledgeColumnHeights[knowledgeColumnIndex];
        const questionStartX = knowledgeX + MINDMAP_FRAME_LAYOUT.knowledgePadding;
        const questionStartY = knowledgeY + MINDMAP_FRAME_LAYOUT.knowledgeHeaderHeight;
        const questionChildren: MindMapRenderNode[] = knowledgeCollapsed
          ? []
          : knowledgeNode.questions.map((questionNode, questionIndex) => ({
              id: questionNode.id,
              kind: "question",
              signature: `framework-question:${questionNode.id}:${questionNode.promptPreviewText.length}`,
              dirty: false,
              questionId: questionNode.questionId,
              title: questionNode.title,
              subtitle: questionNode.title,
              meta: `${questionNode.year} · ${questionNode.source} · ${questionNode.typeGroupName}`,
              preview: questionNode.promptPreview,
              detail: questionNode.promptDetail,
              previewText: questionNode.promptPreviewText,
              detailText: questionNode.promptDetailText,
              x: questionStartX,
              y: questionStartY + questionIndex * (MINDMAP_FRAME_LAYOUT.questionHeight + MINDMAP_FRAME_LAYOUT.questionGap),
              width: questionWidth,
              height: MINDMAP_FRAME_LAYOUT.questionHeight,
              subtreeHeight: MINDMAP_FRAME_LAYOUT.questionHeight,
              depth: 3,
              questionCount: 1,
              leafCount: 1,
              framed: true,
              children: [],
            }));

        const questionStackHeight =
          questionChildren.length > 0
            ? questionChildren.length * MINDMAP_FRAME_LAYOUT.questionHeight +
              (questionChildren.length - 1) * MINDMAP_FRAME_LAYOUT.questionGap
            : 0;
        const knowledgeHeight = Math.max(
          MINDMAP_FRAME_LAYOUT.knowledgeMinHeight,
          questionChildren.length > 0
            ? MINDMAP_FRAME_LAYOUT.knowledgeHeaderHeight +
                questionStackHeight +
                MINDMAP_FRAME_LAYOUT.knowledgePadding
            : MINDMAP_FRAME_LAYOUT.knowledgeMinHeight,
        );

        const knowledgeRenderNode: MindMapRenderNode = {
          id: knowledgeNode.id,
          kind: "knowledge",
          signature: `framework-knowledge:${knowledgeNode.id}:${knowledgeCollapsed ? "closed" : "open"}:${knowledgeNode.questions.length}`,
          dirty: false,
          title: knowledgeNode.name,
          subtitle: `${knowledgeNode.questions.length} 道题`,
          x: knowledgeX,
          y: knowledgeY,
          width: knowledgeWidth,
          height: knowledgeHeight,
          subtreeHeight: knowledgeHeight,
          depth: 2,
          questionCount: knowledgeNode.questions.length,
          leafCount: Math.max(knowledgeNode.questions.length, 1),
          collapsed: knowledgeCollapsed,
          expandable: knowledgeNode.questions.length > 0,
          framed: true,
          children: questionChildren,
        };

        knowledgeChildren.push(knowledgeRenderNode);
        knowledgeColumnHeights[knowledgeColumnIndex] += knowledgeHeight + MINDMAP_FRAME_LAYOUT.knowledgeGap;
      }
    }

    const knowledgeAreaHeight =
      knowledgeChildren.length > 0 ? Math.max(...knowledgeColumnHeights) - MINDMAP_FRAME_LAYOUT.knowledgeGap : 0;
    const chapterHeight = Math.max(
      MINDMAP_FRAME_LAYOUT.chapterMinHeight,
      MINDMAP_FRAME_LAYOUT.chapterHeaderHeight +
        MINDMAP_FRAME_LAYOUT.chapterPadding +
        knowledgeAreaHeight +
        MINDMAP_FRAME_LAYOUT.chapterPadding,
    );
    const chapterColumnIndex = chapterColumnHeights.indexOf(Math.min(...chapterColumnHeights));
    const chapterX =
      MINDMAP_FRAME_LAYOUT.rootPadding +
      chapterColumnIndex * (chapterWidth + MINDMAP_FRAME_LAYOUT.chapterGap);
    const chapterY = rootContentTop + chapterColumnHeights[chapterColumnIndex];

    const chapterRenderNode: MindMapRenderNode = {
      id: chapterNode.id,
      kind: "chapter",
      signature: `framework-chapter:${chapterNode.id}:${chapterCollapsed ? "closed" : "open"}:${chapterQuestionCount}`,
      dirty: false,
      title: chapterNode.name,
      subtitle: `${chapterQuestionCount} 道题 · ${chapterNode.knowledges.length} 个知识点`,
      x: chapterX,
      y: chapterY,
      width: chapterWidth,
      height: chapterHeight,
      subtreeHeight: chapterHeight,
      depth: 1,
      questionCount: chapterQuestionCount,
      leafCount: Math.max(chapterNode.knowledges.length, 1),
      collapsed: chapterCollapsed,
      expandable: chapterNode.knowledges.length > 0,
      framed: true,
      children: knowledgeChildren,
    };

    for (const child of knowledgeChildren) {
      offsetNodeTree(child, chapterX, chapterY);
    }

    chapterColumnHeights[chapterColumnIndex] += chapterHeight + MINDMAP_FRAME_LAYOUT.chapterGap;
    return chapterRenderNode;
  });

  const contentHeight = Math.max(...chapterColumnHeights) - MINDMAP_FRAME_LAYOUT.chapterGap;
  rootNode.height = Math.max(
    MINDMAP_FRAME_LAYOUT.rootHeaderHeight + MINDMAP_FRAME_LAYOUT.rootPadding * 2,
    rootContentTop + contentHeight + MINDMAP_FRAME_LAYOUT.rootPadding,
  );
  rootNode.subtreeHeight = rootNode.height;

  return rootNode;
}

function collectMindMapNodes(rootNode: MindMapRenderNode) {
  const nodes: MindMapRenderNode[] = [];
  const connectors: Array<{ id: string; path: string; fromId: string; toId: string }> = [];
  const shouldDrawConnectors = rootNode.framed !== true;

  function walk(node: MindMapRenderNode) {
    nodes.push(node);

    for (const child of node.children) {
      if (shouldDrawConnectors) {
        const startX = node.x + node.width;
        const startY = node.y + node.height / 2;
        const endX = child.x;
        const endY = child.y + child.height / 2;
        const deltaX = endX - startX;
        const controlA = startX + clampNumber(deltaX * 0.36, 42, 96);
        const controlB = endX - clampNumber(deltaX * 0.28, 30, 82);

        connectors.push({
          id: `${node.id}-${child.id}`,
          fromId: node.id,
          toId: child.id,
          path: [
            `M ${startX} ${startY}`,
            `C ${controlA} ${startY}, ${controlB} ${endY}, ${endX} ${endY}`,
          ].join(" "),
        });
      }

      walk(child);
    }
  }

  walk(rootNode);

  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));

  return {
    nodes,
    connectors,
    width: maxX + MINDMAP_CANVAS_PADDING.x * 2,
    height: maxY + MINDMAP_CANVAS_PADDING.y * 2,
  };
}

const FAVORITE_REMINDER_STORAGE_KEY = "study-wiki-wall.favorite-remove-reminder-date";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}

function CircleXIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.2 6.5 20l1-6.2L3 9.6l6.2-.9Z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h2.2" />
      <path d="M18.8 12H21" />
      <path d="M5.2 12c1.4-7 3.2-7 4.6 0s3.2 7 4.6 0 3.2-7 4.4 0" />
      <path d="M4 19h16" opacity="0.42" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.9 19.1 1.4-1.4" />
      <path d="m17.7 6.3 1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function ExpandIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
      {active ? (
        <>
          <path d="M8 5H5v3" />
          <path d="M16 5h3v3" />
          <path d="M19 16v3h-3" />
          <path d="M8 19H5v-3" />
          <path d="m9 9-4-4" />
          <path d="m15 9 4-4" />
          <path d="m15 15 4 4" />
          <path d="m9 15-4 4" />
        </>
      ) : (
        <>
          <path d="M9 5H5v4" />
          <path d="M15 5h4v4" />
          <path d="M19 15v4h-4" />
          <path d="M9 19H5v-4" />
        </>
      )}
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21Z" />
      <path d="M8 7h8" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="m10 9 5 3-5 3z" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.2 2.3 4.8-5" />
    </svg>
  );
}

function EmptyBoxIcon() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 text-[var(--wiki-soft)]" fill="none">
      <path d="M32 38h56l-8 18H40z" fill="currentColor" opacity="0.55" />
      <path d="M40 56h40v30H40z" fill="currentColor" opacity="0.75" />
      <path d="m32 38 8 18-12 16V54z" fill="currentColor" opacity="0.45" />
      <path d="m88 38-8 18 12 16V54z" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function NavItem({ active, label, icon, onClick }: NavItemProps) {
  return (
    <button type="button" onClick={onClick} className={`wiki-nav-item ${active ? "wiki-nav-item-active" : ""}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StartupSignalLoader({ phase }: StartupSignalLoaderProps) {
  if (phase === "hidden") {
    return null;
  }

  const loaderClassName = ["wiki-startup-loader", "wiki-startup-loader-visible", `wiki-startup-loader-${phase}`].join(
    " ",
  );

  return (
    <div className={loaderClassName} aria-hidden="true">
      <div className="wiki-startup-loader-grid" />
      <div className="wiki-startup-scope">
        <svg className="wiki-startup-wave" viewBox="0 0 960 260" role="img" aria-label="衰减信号加载进度">
          <defs>
            <linearGradient id="startupWaveGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#a8fbff" stopOpacity="0.12" />
              <stop offset="22%" stopColor="#8df7ff" stopOpacity="0.98" />
              <stop offset="66%" stopColor="#54f0d1" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#ecffff" stopOpacity="0.82" />
            </linearGradient>
            <filter id="startupWaveGlow" x="-12%" y="-80%" width="124%" height="260%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path className="wiki-startup-wave-axis" d="M32 132 H928" />
          <path
            className="wiki-startup-wave-shadow"
            d="M32 132 C58 35 92 220 124 132 S186 56 218 132 S280 78 314 132 S378 99 414 132 S480 113 520 132 S592 123 636 132 S708 128 754 132 S830 132 874 132 H928"
          />
          <path
            className="wiki-startup-wave-line"
            d="M32 132 C58 35 92 220 124 132 S186 56 218 132 S280 78 314 132 S378 99 414 132 S480 113 520 132 S592 123 636 132 S708 128 754 132 S830 132 874 132 H928"
          />
          <path className="wiki-startup-wave-dc" d="M754 132 C800 132 832 132 874 132 H928" />
        </svg>
      </div>
      <div className="wiki-startup-loader-scan" />
      <div className="wiki-startup-pixels">
        {STARTUP_PIXEL_INDICES.map((pixelIndex) => {
          const rowIndex = Math.floor(pixelIndex / STARTUP_PIXEL_COLUMNS);
          const columnIndex = pixelIndex % STARTUP_PIXEL_COLUMNS;
          const staggerDelay = (columnIndex * 31 + rowIndex * 47 + (pixelIndex % 7) * 29) % 540;

          return (
            <span
              key={pixelIndex}
              className="wiki-startup-pixel"
              style={{ animationDelay: `${staggerDelay}ms` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function QuestionAction({
  icon,
  label,
  active = false,
  tone = "default",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  tone?: "default" | "favorite" | "mastered";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wiki-action ${active ? `wiki-action-active wiki-action-active-${tone}` : ""}`}
    >
      <span className="wiki-action-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function formatMasteredAt(masteredAt: string) {
  const date = new Date(masteredAt);

  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function EmptyShelf({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="wiki-panel">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--wiki-text)]">{title}</h1>
          <p className="mt-3 text-[15px] text-[var(--wiki-muted)]">{subtitle}</p>
        </div>
      </div>

      <div className="wiki-empty-panel">
        <EmptyBoxIcon />
        <div className="mt-5 text-[17px] text-[var(--wiki-muted)]">该分类下暂无记录</div>
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  iconClassName,
  emphasisClassName,
  loading = false,
  clickable = false,
  onClick,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
  emphasisClassName?: string;
  loading?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}) {
  if (loading) {
    return (
      <section className="wiki-home-stat-card" aria-hidden="true">
        <div className="wiki-home-stat-icon wiki-skeleton wiki-skeleton-icon" />
        <div className="wiki-skeleton wiki-skeleton-line mt-8 h-[18px] w-[96px]" />
        <div className="wiki-skeleton wiki-skeleton-line mt-4 h-[56px] w-[74px]" />
        <div className="wiki-skeleton wiki-skeleton-line mt-4 h-[15px] w-[132px]" />
      </section>
    );
  }

  const content = (
    <>
      <div className={`wiki-home-stat-icon ${iconClassName}`}>{icon}</div>
      <div className="mt-8 text-[15px] font-medium text-[var(--wiki-muted)]">{title}</div>
      <div className="mt-4 font-serif text-[56px] leading-none tracking-[-0.05em] text-[var(--wiki-text)]">{value}</div>
      <div className="mt-3 text-[14px] text-[var(--wiki-muted)]">{description}</div>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`wiki-home-stat-card wiki-home-stat-card-clickable ${emphasisClassName ?? ""} text-left`}
      >
        {content}
      </button>
    );
  }

  return <section className="wiki-home-stat-card">{content}</section>;
}

export function StudyWallDashboard({ subjects }: StudyWallDashboardProps) {
  const [startupLoaderPhase, setStartupLoaderPhase] = useState<StartupLoaderPhase>("boot");
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("home");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [collectionViewMode, setCollectionViewMode] = useState<CollectionViewMode>("list");
  const [mindMapLayoutMode, setMindMapLayoutMode] = useState<MindMapLayoutMode>("tree");
  const [homeView, setHomeView] = useState(true);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  const [collapsedMindMapNodes, setCollapsedMindMapNodes] = useState<Record<string, boolean>>({});
  const [expandedMindMapQuestions, setExpandedMindMapQuestions] = useState<Record<string, boolean>>({});
  const [mindMapScale, setMindMapScale] = useState(1);
  const [mindMapQuestionRenderMode, setMindMapQuestionRenderMode] = useState<MindMapQuestionRenderMode>("math");
  const [mindMapZoomSnapshot, setMindMapZoomSnapshot] = useState(false);
  const [mindMapOffset, setMindMapOffset] = useState({ x: 120, y: 80 });
  const [mindMapViewportSize, setMindMapViewportSize] = useState({ width: 0, height: 0 });
  const [mindMapFullscreen, setMindMapFullscreen] = useState(false);
  const [favoriteRemovalConfirm, setFavoriteRemovalConfirm] = useState<{
    questionId: string;
    questionTitle: string;
    skipToday: boolean;
  } | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const mindMapViewportRef = useRef<HTMLDivElement | null>(null);
  const mindMapCanvasRef = useRef<HTMLDivElement | null>(null);
  const questionCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const previousMindMapTreeRef = useRef<MindMapRenderNode | null>(null);
  const mindMapAnchorRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const zoomFrameRef = useRef<number | null>(null);
  const wheelCommitTimerRef = useRef<number | null>(null);
  const zoomSnapshotTimerRef = useRef<number | null>(null);
  const pendingOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const liveOffsetRef = useRef({ x: 120, y: 80 });
  const liveScaleRef = useRef(1);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealDelay = prefersReducedMotion ? 160 : 2160;
    const hiddenDelay = prefersReducedMotion ? 360 : 3340;
    const revealTimerId = window.setTimeout(() => {
      setStartupLoaderPhase("reveal");
    }, revealDelay);
    const hiddenTimerId = window.setTimeout(() => {
      setStartupLoaderPhase("hidden");
    }, hiddenDelay);

    return () => {
      window.clearTimeout(revealTimerId);
      window.clearTimeout(hiddenTimerId);
    };
  }, []);

  const {
    selectedSubject,
    selectedChapter,
    selectedKnowledge,
    chapters,
    overviewQuestions,
    selectedSubjectId,
    selectedChapterId,
    selectedKnowledgeId,
    selectedQuestionId,
    expandedChapterId,
    questionMasteryMap,
    questionFavoriteMap,
    lastMasteredRecord,
    hasLoadedPersistedState,
    selectSubject,
    selectChapter,
    toggleChapter,
    selectKnowledge,
    jumpToQuestion,
    setQuestionMastery,
    toggleQuestionFavorite,
  } = useStudyWallDashboard(subjects);

  const isDark = themeMode === "dark";
  const hasMultipleSubjects = subjects.length > 1;

  const allQuestionRows = useMemo<QuestionRow[]>(() => {
    return subjects.flatMap((subject) =>
      subject.chapters.flatMap((chapter) =>
        chapter.typeGroups.flatMap((typeGroup) =>
          typeGroup.questions.map((question) => ({
            rowId: `${subject.id}:${chapter.id}:${typeGroup.id}:${question.id}`,
            subjectId: subject.id,
            subjectName: subject.name,
            chapterId: chapter.id,
            chapterName: chapter.name,
            knowledgeId:
              chapter.knowledgeNodes.find((node) => node.name === question.knowledgePoint)?.id ?? "",
            knowledgeName: question.knowledgePoint,
            typeGroupId: typeGroup.id,
            typeGroupName: typeGroup.name,
            questionId: question.id,
            title: question.title,
            year: question.year,
            source: question.source,
            prompt: question.prompt,
            note: question.note,
            strategy: question.strategy,
            mastery: question.mastery,
          })),
        ),
      ),
    );
  }, [subjects]);

  const selectedSubjectRows = useMemo<QuestionRow[]>(() => {
    return allQuestionRows.filter((row) => row.subjectId === selectedSubjectId);
  }, [allQuestionRows, selectedSubjectId]);

  const visibleQuestionRows = useMemo<QuestionRow[]>(() => {
    if (dashboardMode === "wrongbook") {
      return selectedSubjectRows.filter(
        (row) => (questionMasteryMap[row.questionId] ?? row.mastery) === "unknown",
      );
    }

    if (dashboardMode === "favorite") {
      return selectedSubjectRows.filter((row) => questionFavoriteMap[row.questionId] === true);
    }

    return overviewQuestions.map((item) => ({
      rowId: `${selectedSubject?.id ?? selectedSubjectId}:${selectedChapter?.id ?? ""}:${item.typeGroup.id}:${item.question.id}`,
      subjectId: selectedSubject?.id ?? selectedSubjectId,
      subjectName: selectedSubject?.name ?? "",
      chapterId: selectedChapter?.id ?? "",
      chapterName: selectedChapter?.name ?? "",
      knowledgeId:
        selectedChapter?.knowledgeNodes.find((node) => node.name === item.question.knowledgePoint)?.id ?? "",
      knowledgeName: item.question.knowledgePoint,
      typeGroupId: item.typeGroup.id,
      typeGroupName: item.typeGroup.name,
      questionId: item.question.id,
      title: item.question.title,
      year: item.question.year,
      source: item.question.source,
      prompt: item.question.prompt,
      note: item.question.note,
      strategy: item.question.strategy,
      mastery: item.question.mastery,
    }));
  }, [
    dashboardMode,
    overviewQuestions,
    questionFavoriteMap,
    questionMasteryMap,
    selectedChapter?.id,
    selectedChapter?.knowledgeNodes,
    selectedChapter?.name,
    selectedSubject?.id,
    selectedSubject?.name,
    selectedSubjectId,
    selectedSubjectRows,
  ]);

  const currentChapterIndex = chapters.findIndex((chapter) => chapter.id === selectedChapterId);
  const totalQuestionCount = selectedSubjectRows.length;
  const masteredCount = selectedSubjectRows.filter(
    (row) => (questionMasteryMap[row.questionId] ?? row.mastery) === "mastered",
  ).length;
  const wrongCount = selectedSubjectRows.filter(
    (row) => (questionMasteryMap[row.questionId] ?? row.mastery) === "unknown",
  ).length;
  const favoriteCount = selectedSubjectRows.filter((row) => questionFavoriteMap[row.questionId] === true).length;
  const lastMasteredRow = useMemo(() => {
    if (!lastMasteredRecord || lastMasteredRecord.subjectId !== selectedSubjectId) {
      return null;
    }

    return allQuestionRows.find((row) => row.questionId === lastMasteredRecord.questionId) ?? null;
  }, [allQuestionRows, lastMasteredRecord, selectedSubjectId]);

  const collectionMindMap = useMemo<MindMapRootNode | null>(() => {
    if (dashboardMode !== "wrongbook" && dashboardMode !== "favorite") {
      return null;
    }

    const chapterOrder = new Map(chapters.map((chapter, index) => [chapter.id, index]));
    const knowledgeOrder = new Map(
      chapters.flatMap((chapter) => chapter.knowledgeNodes.map((node, index) => [node.id, index] as const)),
    );
    const chapterMap = new Map<string, MindMapChapterNode>();

    for (const row of visibleQuestionRows) {
      if (!chapterMap.has(row.chapterId)) {
        chapterMap.set(row.chapterId, {
          id: row.chapterId,
          name: row.chapterName,
          knowledges: [],
        });
      }

      const chapterNode = chapterMap.get(row.chapterId)!;
      let knowledgeNode = chapterNode.knowledges.find((node) => node.id === row.knowledgeId);

      if (!knowledgeNode) {
        knowledgeNode = {
          id: row.knowledgeId || `${row.chapterId}-${row.knowledgeName}`,
          name: row.knowledgeName,
          questions: [],
        };
        chapterNode.knowledges.push(knowledgeNode);
      }

      knowledgeNode.questions.push({
        id: row.rowId,
        questionId: row.questionId,
        title: row.title,
        year: row.year,
        source: row.source,
        typeGroupName: row.typeGroupName,
        promptPreview: normalizePromptContent(row.prompt),
        promptDetail: normalizePromptContent(row.prompt),
        promptPreviewText: createPlainPreviewText(row.prompt, 120),
        promptDetailText: createPlainPreviewText(row.prompt, 260),
      });
    }

    const chaptersSorted = [...chapterMap.values()]
      .sort((left, right) => (chapterOrder.get(left.id) ?? 999) - (chapterOrder.get(right.id) ?? 999))
      .map((chapterNode) => ({
        ...chapterNode,
        knowledges: [...chapterNode.knowledges]
          .sort((left, right) => (knowledgeOrder.get(left.id) ?? 999) - (knowledgeOrder.get(right.id) ?? 999))
          .map((knowledgeNode) => ({
            ...knowledgeNode,
            questions: [...knowledgeNode.questions].sort((left, right) => left.title.localeCompare(right.title, "zh-CN")),
          })),
      }));

    return {
      subjectId: selectedSubjectId,
      subjectName: selectedSubject?.name ?? "当前科目",
      mode: dashboardMode,
      chapters: chaptersSorted,
    };
  }, [chapters, dashboardMode, selectedSubject?.name, selectedSubjectId, visibleQuestionRows]);

  const collectionMindMapLayout = useMemo(() => {
    if (!collectionMindMap) {
      return null;
    }

    const renderTree =
      mindMapLayoutMode === "framework"
        ? buildMindMapFrameworkTree(collectionMindMap, visibleQuestionRows.length, collapsedMindMapNodes)
        : buildMindMapRenderTree(
            collectionMindMap,
            visibleQuestionRows.length,
            collapsedMindMapNodes,
            expandedMindMapQuestions,
            previousMindMapTreeRef.current,
          );

    return collectMindMapNodes(renderTree);
  }, [
    collapsedMindMapNodes,
    collectionMindMap,
    expandedMindMapQuestions,
    mindMapLayoutMode,
    visibleQuestionRows.length,
  ]);

  const visibleMindMapScene = useMemo(() => {
    if (!collectionMindMapLayout) {
      return null;
    }

    if (mindMapViewportSize.width <= 0 || mindMapViewportSize.height <= 0) {
      return collectionMindMapLayout;
    }

    const overscan = clampNumber(340 / Math.max(mindMapScale, 0.5), 180, 520);
    const visibleLeft = (-mindMapOffset.x) / mindMapScale - overscan;
    const visibleTop = (-mindMapOffset.y) / mindMapScale - overscan;
    const visibleRight = visibleLeft + mindMapViewportSize.width / mindMapScale + overscan * 2;
    const visibleBottom = visibleTop + mindMapViewportSize.height / mindMapScale + overscan * 2;

    const visibleNodes = collectionMindMapLayout.nodes.filter((node) => {
      const nodeRight = node.x + node.width;
      const nodeBottom = node.y + node.height;

      return (
        nodeRight >= visibleLeft &&
        node.x <= visibleRight &&
        nodeBottom >= visibleTop &&
        node.y <= visibleBottom
      );
    });

    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
    const visibleConnectors = collectionMindMapLayout.connectors.filter(
      (connector) => visibleNodeIds.has(connector.fromId) && visibleNodeIds.has(connector.toId),
    );

    return {
      ...collectionMindMapLayout,
      nodes: visibleNodes,
      connectors: visibleConnectors,
    };
  }, [collectionMindMapLayout, mindMapOffset.x, mindMapOffset.y, mindMapScale, mindMapViewportSize.height, mindMapViewportSize.width]);

  useEffect(() => {
    const shouldScrollToQuestion =
      selectedQuestionId &&
      (
        (dashboardMode === "home" && !homeView) ||
        ((dashboardMode === "wrongbook" || dashboardMode === "favorite") && collectionViewMode === "list")
      );

    if (!shouldScrollToQuestion) {
      return;
    }

    const targetCard = questionCardRefs.current[selectedQuestionId];

    if (!targetCard) {
      return;
    }

    targetCard.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, [collectionViewMode, dashboardMode, homeView, selectedQuestionId, visibleQuestionRows]);

  useEffect(() => {
    liveOffsetRef.current = mindMapOffset;
  }, [mindMapOffset]);

  useEffect(() => {
    liveScaleRef.current = mindMapScale;
  }, [mindMapScale]);

  useEffect(() => {
    const canvas = mindMapCanvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.style.transform = `translate(${mindMapOffset.x}px, ${mindMapOffset.y}px) scale(${mindMapScale})`;
  }, [mindMapOffset.x, mindMapOffset.y, mindMapScale]);

  useEffect(() => {
    updateMindMapViewportGrid(mindMapOffset, mindMapScale);
  }, [mindMapOffset, mindMapScale]);

  useEffect(() => {
    if (!collectionMindMapLayout?.nodes.length) {
      previousMindMapTreeRef.current = null;
      mindMapAnchorRef.current = null;
      return;
    }

    const rootNode = collectionMindMapLayout.nodes.find((node) => node.kind === "root") ?? null;

    if (rootNode) {
      const previousAnchor = mindMapAnchorRef.current;

      if (previousAnchor && previousAnchor.id === rootNode.id) {
        const deltaX = previousAnchor.x - rootNode.x;
        const deltaY = previousAnchor.y - rootNode.y;

        if (deltaX !== 0 || deltaY !== 0) {
          const nextOffset = {
            x: liveOffsetRef.current.x + deltaX * liveScaleRef.current,
            y: liveOffsetRef.current.y + deltaY * liveScaleRef.current,
          };

          liveOffsetRef.current = nextOffset;
          setMindMapOffset(nextOffset);

          if (mindMapCanvasRef.current) {
            mindMapCanvasRef.current.style.transform = `translate(${nextOffset.x}px, ${nextOffset.y}px) scale(${liveScaleRef.current})`;
          }

          updateMindMapViewportGrid(nextOffset, liveScaleRef.current);
        }
      }

      mindMapAnchorRef.current = {
        id: rootNode.id,
        x: rootNode.x,
        y: rootNode.y,
      };
    }

    previousMindMapTreeRef.current = rootNode;
  }, [collectionMindMapLayout]);

  useEffect(() => {
    const viewport = mindMapViewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setMindMapViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [collectionViewMode, dashboardMode]);

  useEffect(() => {
    return () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }

      if (zoomFrameRef.current !== null) {
        window.cancelAnimationFrame(zoomFrameRef.current);
      }

      if (wheelCommitTimerRef.current !== null) {
        window.clearTimeout(wheelCommitTimerRef.current);
      }

      if (zoomSnapshotTimerRef.current !== null) {
        window.clearTimeout(zoomSnapshotTimerRef.current);
      }
    };
  }, []);

  function switchSubject(subjectId: SubjectId) {
    selectSubject(subjectId);
    setDashboardMode("home");
    setCollectionViewMode("list");
    setHomeView(true);
  }

  function goNextChapter() {
    if (chapters.length === 0) {
      return;
    }

    const nextIndex = currentChapterIndex >= 0 ? (currentChapterIndex + 1) % chapters.length : 0;
    selectChapter(chapters[nextIndex].id);
    setDashboardMode("home");
    setHomeView(false);
  }

  function toggleAnswer(questionId: string) {
    setExpandedAnswers((current) => ({
      ...current,
      [questionId]: !current[questionId],
    }));
  }

  function toggleAnalysis(questionId: string) {
    setExpandedAnalysis((current) => ({
      ...current,
      [questionId]: !current[questionId],
    }));
  }

  function toggleWrongState(questionId: string, currentMastery: MasteryState) {
    setQuestionMastery(questionId, currentMastery === "unknown" ? "blurred" : "unknown");
  }

  function toggleMasteredState(questionId: string, currentMastery: MasteryState) {
    setQuestionMastery(questionId, currentMastery === "mastered" ? "blurred" : "mastered");
  }

  function shouldSkipFavoriteRemovalReminder() {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return window.localStorage.getItem(FAVORITE_REMINDER_STORAGE_KEY) === getTodayKey();
    } catch {
      return false;
    }
  }

  function handleFavoriteAction(questionId: string, questionTitle: string, favorite: boolean) {
    if (favorite) {
      if (shouldSkipFavoriteRemovalReminder()) {
        toggleQuestionFavorite(questionId);
        return;
      }

      setFavoriteRemovalConfirm({
        questionId,
        questionTitle,
        skipToday: false,
      });
      return;
    }

    toggleQuestionFavorite(questionId);
  }

  function confirmFavoriteRemoval() {
    if (!favoriteRemovalConfirm) {
      return;
    }

    if (favoriteRemovalConfirm.skipToday && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(FAVORITE_REMINDER_STORAGE_KEY, getTodayKey());
      } catch {
        // The removal itself should still succeed when browser storage is unavailable.
      }
    }

    toggleQuestionFavorite(favoriteRemovalConfirm.questionId);
    setFavoriteRemovalConfirm(null);
  }

  function updateMindMapViewportGrid(offset: { x: number; y: number }, scale: number) {
    const viewport = mindMapViewportRef.current;

    if (!viewport) {
      return;
    }

    const gridSize = clampNumber(28 * Math.sqrt(scale), 18, 56);
    const gridOffsetX = ((offset.x % gridSize) + gridSize) % gridSize;
    const gridOffsetY = ((offset.y % gridSize) + gridSize) % gridSize;

    viewport.style.setProperty("--wiki-mindmap-grid-size", `${gridSize}px`);
    viewport.style.setProperty("--wiki-mindmap-grid-offset-x", `${gridOffsetX}px`);
    viewport.style.setProperty("--wiki-mindmap-grid-offset-y", `${gridOffsetY}px`);
  }

  function beginMindMapZoomSnapshot() {
    setMindMapZoomSnapshot(true);

    if (zoomSnapshotTimerRef.current !== null) {
      window.clearTimeout(zoomSnapshotTimerRef.current);
    }
  }

  function scheduleMindMapZoomSnapshotRelease() {
    if (zoomSnapshotTimerRef.current !== null) {
      window.clearTimeout(zoomSnapshotTimerRef.current);
    }

    zoomSnapshotTimerRef.current = window.setTimeout(() => {
      setMindMapZoomSnapshot(false);
      zoomSnapshotTimerRef.current = null;
    }, 150);
  }

  function commitMindMapScale(nextScale: number) {
    liveScaleRef.current = nextScale;
    setMindMapScale(nextScale);
    setMindMapQuestionRenderMode((currentMode) => getNextMindMapQuestionRenderMode(nextScale, currentMode));
    scheduleMindMapZoomSnapshotRelease();
  }

  function handleMindMapWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    beginMindMapZoomSnapshot();

    const delta = event.deltaY > 0 ? -MINDMAP_SCALE_STEP : MINDMAP_SCALE_STEP;
    const viewportRect = event.currentTarget.getBoundingClientRect();
    const nextScale = Math.min(
      MINDMAP_MAX_SCALE,
      Math.max(MINDMAP_MIN_SCALE, Number((liveScaleRef.current + delta).toFixed(2))),
    );

    if (nextScale === liveScaleRef.current) {
      scheduleMindMapZoomSnapshotRelease();
      return;
    }

    const pointerX = event.clientX - viewportRect.left;
    const pointerY = event.clientY - viewportRect.top;
    const worldX = (pointerX - liveOffsetRef.current.x) / liveScaleRef.current;
    const worldY = (pointerY - liveOffsetRef.current.y) / liveScaleRef.current;
    const nextOffset = {
      x: pointerX - worldX * nextScale,
      y: pointerY - worldY * nextScale,
    };

    liveScaleRef.current = nextScale;
    liveOffsetRef.current = nextOffset;
    pendingOffsetRef.current = nextOffset;

    if (zoomFrameRef.current === null) {
      zoomFrameRef.current = window.requestAnimationFrame(() => {
        zoomFrameRef.current = null;

        if (mindMapCanvasRef.current) {
          mindMapCanvasRef.current.style.transform = `translate(${liveOffsetRef.current.x}px, ${liveOffsetRef.current.y}px) scale(${liveScaleRef.current})`;
        }

        updateMindMapViewportGrid(liveOffsetRef.current, liveScaleRef.current);
      });
    }

    if (wheelCommitTimerRef.current !== null) {
      window.clearTimeout(wheelCommitTimerRef.current);
    }

    wheelCommitTimerRef.current = window.setTimeout(() => {
      setMindMapOffset(liveOffsetRef.current);
      commitMindMapScale(liveScaleRef.current);
      wheelCommitTimerRef.current = null;
    }, 110);
  }

  function handleMindMapPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: liveOffsetRef.current.x,
      originY: liveOffsetRef.current.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMindMapPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState.active || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextX = dragState.originX + (event.clientX - dragState.startX);
    const nextY = dragState.originY + (event.clientY - dragState.startY);
    pendingOffsetRef.current = { x: nextX, y: nextY };

    if (dragFrameRef.current !== null) {
      return;
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;

      if (!pendingOffsetRef.current) {
        return;
      }

      liveOffsetRef.current = pendingOffsetRef.current;

      if (mindMapCanvasRef.current) {
        mindMapCanvasRef.current.style.transform = `translate(${pendingOffsetRef.current.x}px, ${pendingOffsetRef.current.y}px) scale(${liveScaleRef.current})`;
      }

      updateMindMapViewportGrid(pendingOffsetRef.current, liveScaleRef.current);
    });
  }

  function handleMindMapPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current.pointerId === event.pointerId) {
      dragStateRef.current.active = false;
      dragStateRef.current.pointerId = null;

      if (pendingOffsetRef.current) {
        liveOffsetRef.current = pendingOffsetRef.current;
        setMindMapOffset(pendingOffsetRef.current);
        pendingOffsetRef.current = null;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }

  function resetMindMapViewport() {
    const nextOffset = getMindMapInitialOffset(mindMapLayoutMode);
    liveOffsetRef.current = nextOffset;
    setMindMapOffset(nextOffset);
    commitMindMapScale(1);
  }

  function switchMindMapLayout(nextLayoutMode: MindMapLayoutMode) {
    if (nextLayoutMode === mindMapLayoutMode) {
      return;
    }

    previousMindMapTreeRef.current = null;
    mindMapAnchorRef.current = null;
    setMindMapLayoutMode(nextLayoutMode);
    const nextOffset = getMindMapInitialOffset(nextLayoutMode);
    liveOffsetRef.current = nextOffset;
    setMindMapOffset(nextOffset);
    commitMindMapScale(1);
  }

  function toggleMindMapFullscreen() {
    setMindMapFullscreen((current) => !current);
  }

  function openQuestionFromMindMap(questionId: string) {
    jumpToQuestion(questionId);
    setCollectionViewMode("list");
    setMindMapFullscreen(false);

    if (dashboardMode === "home") {
      setHomeView(false);
    }
  }

  function continueLearning() {
    if (lastMasteredRecord) {
      jumpToQuestion(lastMasteredRecord.questionId);
      setCollectionViewMode("list");
      setDashboardMode("home");
      setHomeView(false);
      return;
    }

    if (selectedChapterId) {
      selectChapter(selectedChapterId);
      setDashboardMode("home");
      setHomeView(false);
    }
  }

  function toggleMindMapNode(nodeId: string) {
    setCollapsedMindMapNodes((current) => ({
      ...current,
      [nodeId]: !current[nodeId],
    }));
  }

  function toggleMindMapQuestionDetail(questionId: string) {
    setExpandedMindMapQuestions((current) => ({
      ...current,
      [questionId]: !current[questionId],
    }));
  }

  function renderExpandablePanels(row: QuestionRow, answerOpen: boolean, analysisOpen: boolean) {
    return (
      <>
        {answerOpen ? (
          <div className="mt-6 rounded-[18px] bg-[var(--wiki-subtle)] px-5 py-5">
            <div className="text-[15px] font-semibold text-[var(--wiki-text)]">答案速览</div>
            <MathMarkdown content={row.note} className="mt-3 text-[16px] leading-8 text-[var(--wiki-muted)]" />
          </div>
        ) : null}

        {analysisOpen ? (
          <div className="wiki-analysis-panel mt-6 rounded-[20px] px-7 py-6">
            <div className="text-[15px] font-semibold text-[var(--wiki-text)]">详细解析</div>
            <ul className="mt-4 space-y-2 text-[16px] leading-8 text-[var(--wiki-muted)]">
              {row.strategy.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </>
    );
  }

  function renderQuestionCollection(title: string, subtitle: string) {
    if (visibleQuestionRows.length === 0) {
      return <EmptyShelf title={title} subtitle={subtitle} />;
    }

    if (collectionViewMode === "mindmap" && collectionMindMap && collectionMindMapLayout && visibleMindMapScene) {
      return (
        <section
          key={`collection-${dashboardMode}-mindmap`}
          className="wiki-panel wiki-collection-panel wiki-collection-panel-mindmap"
          data-view-mode="mindmap"
        >
          <div className="wiki-toolbar">
            <div>
              <div className="text-[22px] font-semibold text-[var(--wiki-text)]">{title}导图</div>
              <div className="mt-2 text-[15px] text-[var(--wiki-muted)]">{subtitle}，按章节与知识点自动聚合</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCollectionViewMode("list");
                  setMindMapFullscreen(false);
                }}
                className="wiki-pill-button"
              >
                列表视图
              </button>
              <div className="wiki-mindmap-layout-toggle" aria-label="导图布局">
                <button
                  type="button"
                  onClick={() => switchMindMapLayout("tree")}
                  className={`wiki-mindmap-layout-button ${mindMapLayoutMode === "tree" ? "wiki-mindmap-layout-button-active" : ""}`}
                  aria-pressed={mindMapLayoutMode === "tree"}
                >
                  树形
                </button>
                <button
                  type="button"
                  onClick={() => switchMindMapLayout("framework")}
                  className={`wiki-mindmap-layout-button ${mindMapLayoutMode === "framework" ? "wiki-mindmap-layout-button-active" : ""}`}
                  aria-pressed={mindMapLayoutMode === "framework"}
                >
                  框架
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  beginMindMapZoomSnapshot();
                  commitMindMapScale(Math.max(MINDMAP_MIN_SCALE, mindMapScale - MINDMAP_SCALE_STEP));
                }}
                className="wiki-pill-button"
              >
                缩小
              </button>
              <button
                type="button"
                onClick={() => {
                  beginMindMapZoomSnapshot();
                  commitMindMapScale(Math.min(MINDMAP_MAX_SCALE, mindMapScale + MINDMAP_SCALE_STEP));
                }}
                className="wiki-pill-button"
              >
                放大
              </button>
              <button type="button" onClick={resetMindMapViewport} className="wiki-pill-button">
                重置视角
              </button>
              <div className="rounded-full bg-[var(--wiki-chip-bg)] px-4 py-2 text-[14px] font-semibold text-[var(--wiki-text)]">
                {Math.round(mindMapScale * 100)}%
              </div>
            </div>
          </div>

          <div
            ref={mindMapViewportRef}
            className={`wiki-mindmap-viewport ${mindMapFullscreen ? "wiki-mindmap-viewport-fullscreen" : ""}`}
            onWheel={handleMindMapWheel}
            onPointerDown={handleMindMapPointerDown}
            onPointerMove={handleMindMapPointerMove}
            onPointerUp={handleMindMapPointerUp}
            onPointerCancel={handleMindMapPointerUp}
          >
            <button
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                void toggleMindMapFullscreen();
              }}
              className="wiki-mindmap-fullscreen-button"
              aria-label={mindMapFullscreen ? "退出全屏" : "进入全屏"}
              title={mindMapFullscreen ? "退出全屏" : "进入全屏"}
            >
              <ExpandIcon active={mindMapFullscreen} />
            </button>
            <div
              ref={mindMapCanvasRef}
              className="wiki-mindmap-canvas"
              style={{
                transform: `translate(${mindMapOffset.x}px, ${mindMapOffset.y}px) scale(${mindMapScale})`,
                width: `${collectionMindMapLayout.width}px`,
                height: `${collectionMindMapLayout.height}px`,
              }}
            >
              <svg className="wiki-mindmap-svg" width={collectionMindMapLayout.width} height={collectionMindMapLayout.height}>
                {visibleMindMapScene.connectors.map((connector) => (
                  <path key={connector.id} d={connector.path} className="wiki-mindmap-path" />
                ))}
              </svg>

              {visibleMindMapScene.nodes.map((node) => {
                if (node.kind === "question") {
                  const showMathPreview = mindMapQuestionRenderMode === "math";
                  const showMaskedPreview = mindMapQuestionRenderMode === "compact";
                  const showSummaryPreview = mindMapQuestionRenderMode === "summary";
                  const contentClassName = [
                    "wiki-mindmap-question-excerpt mt-3",
                    node.expandable && !node.expanded ? "wiki-mindmap-question-excerpt-collapsed" : "",
                    node.expanded ? "wiki-mindmap-question-excerpt-expanded" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const previewText = node.previewText ?? "点击进入题目界面";
                  const detailText = node.detailText ?? previewText;
                  const previewMath = node.preview ?? "点击进入题目界面";
                  const detailMath = node.detail ?? previewMath;
                  const snapshotSummaryText = node.expanded ? detailText : previewText;

                  return (
                    <div
                      key={node.id}
                      className={`wiki-mindmap-node wiki-mindmap-question-card ${node.framed ? "wiki-mindmap-question-card-framed" : ""}`}
                      style={{
                        width: `${node.width}px`,
                        minHeight: `${node.height}px`,
                        height: node.framed ? `${node.height}px` : undefined,
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                      }}
                    >
                      <button
                        type="button"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          openQuestionFromMindMap(node.questionId ?? node.id);
                        }}
                        className="block w-full text-left"
                      >
                        <div className="text-[15px] font-semibold leading-6 text-[var(--wiki-text)]">{node.title}</div>
                        <div className="mt-2 text-[12px] text-[var(--wiki-muted)]">{node.meta}</div>
                        {node.framed ? null : mindMapZoomSnapshot ? (
                          <div className={`${contentClassName} wiki-mindmap-snapshot-preview`} aria-hidden="true">
                            <div className="wiki-mindmap-snapshot-chip" />
                            <div className="wiki-mindmap-snapshot-line wiki-mindmap-snapshot-line-wide" />
                            {mindMapQuestionRenderMode === "compact" ? (
                              <div className="wiki-mindmap-mask-block" />
                            ) : (
                              <>
                                <div className="wiki-mindmap-snapshot-line" />
                                <div className="wiki-mindmap-snapshot-text">{snapshotSummaryText}</div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className={contentClassName}>
                            {showMathPreview ? (
                              <MathMarkdown
                                content={node.expanded ? detailMath : previewMath}
                                className={`wiki-mindmap-math-preview ${node.expanded ? "wiki-mindmap-math-preview-expanded" : ""}`}
                              />
                            ) : showSummaryPreview ? (
                              <div
                                className={`wiki-mindmap-plain-preview ${node.expanded ? "wiki-mindmap-plain-preview-expanded" : ""}`}
                              >
                                {node.expanded ? detailText : previewText}
                              </div>
                            ) : (
                              <div
                                className={`wiki-mindmap-mask-preview ${showMaskedPreview ? "wiki-mindmap-mask-preview-compact" : ""}`}
                                aria-hidden="true"
                              >
                                <div className="wiki-mindmap-mask-line wiki-mindmap-mask-line-wide" />
                                <div className="wiki-mindmap-mask-line" />
                                <div className="wiki-mindmap-mask-block" />
                              </div>
                            )}
                          </div>
                        )}
                      </button>

                      {node.expandable && !node.framed ? (
                        <div className="mt-4 flex items-center justify-start gap-3">
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleMindMapQuestionDetail(node.questionId ?? node.id);
                            }}
                            className="wiki-mindmap-inline-button"
                          >
                            {node.expanded ? "收起全文" : "展开全文"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                }

                const cardClassName =
                  node.kind === "root" && node.framed
                    ? "wiki-mindmap-root-frame-card"
                    : node.kind === "root"
                    ? "wiki-mindmap-root-card"
                    : node.kind === "chapter" && node.framed
                      ? "wiki-mindmap-frame-card"
                    : node.kind === "chapter"
                      ? "wiki-mindmap-chapter-card"
                    : node.kind === "knowledge" && node.framed
                      ? "wiki-mindmap-knowledge-frame-card"
                      : "wiki-mindmap-knowledge-card";

                return (
                  <div
                    key={node.id}
                    className={`wiki-mindmap-node ${cardClassName}`}
                    style={{
                      width: `${node.width}px`,
                      minHeight: `${node.height}px`,
                      height: node.framed ? `${node.height}px` : undefined,
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-[var(--wiki-muted)]">
                          {node.kind === "root"
                            ? collectionMindMap.mode === "favorite"
                              ? "收藏本"
                              : "错题本"
                            : node.subtitle}
                        </div>
                        <div
                          className={`mt-2 font-semibold tracking-[-0.03em] text-[var(--wiki-text)] ${node.kind === "root" ? "text-[24px]" : node.kind === "chapter" ? "text-[18px]" : "text-[16px]"}`}
                        >
                          {node.title}
                        </div>
                        {node.kind === "root" ? (
                          <div className="mt-2 text-[14px] text-[var(--wiki-muted)]">{node.subtitle}</div>
                        ) : null}
                      </div>

                      {node.expandable ? (
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleMindMapNode(node.id);
                          }}
                          className="wiki-mindmap-fold-button"
                        >
                          {node.collapsed ? "展开" : "收起"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section
        key={`collection-${dashboardMode}-list`}
        className="wiki-panel wiki-collection-panel wiki-collection-panel-list"
        data-view-mode="list"
      >
        <div className="wiki-toolbar">
          <div>
            <div className="text-[22px] font-semibold text-[var(--wiki-text)]">{title}</div>
            <div className="mt-2 text-[15px] text-[var(--wiki-muted)]">{subtitle}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCollectionViewMode("mindmap");
                setMindMapFullscreen(false);
              }}
              className="wiki-pill-button"
            >
              导图视图
            </button>
            <div className="rounded-full bg-[var(--wiki-chip-bg)] px-4 py-2 text-[15px] font-semibold text-[var(--wiki-text)]">
              {visibleQuestionRows.length} 题
            </div>
          </div>
        </div>

        <div key={`collection-${dashboardMode}-list-items`} className="space-y-6 p-6">
          {visibleQuestionRows.map((row, index) => {
            const mastery = questionMasteryMap[row.questionId] ?? row.mastery;
            const favorite = questionFavoriteMap[row.questionId] === true;
            const answerOpen = expandedAnswers[row.questionId];
            const analysisOpen = expandedAnalysis[row.questionId];
            const activeQuestion = row.questionId === selectedQuestionId;

            return (
              <article
                key={row.rowId}
                ref={(node) => {
                  questionCardRefs.current[row.questionId] = node;
                }}
                className={`wiki-question-card ${activeQuestion ? "wiki-question-card-active" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--wiki-border)] pb-5 text-[15px] text-[var(--wiki-muted)]">
                  <span className="rounded-full bg-[var(--wiki-chip-bg)] px-4 py-2 font-semibold text-[var(--wiki-text)]">
                    #{index + 1}
                  </span>
                  <span className="rounded-[10px] bg-[var(--wiki-chip-bg)] px-4 py-2">
                    {row.year} {row.source}
                  </span>
                  <span className="rounded-[10px] bg-[var(--wiki-chip-bg)] px-4 py-2">
                    {row.subjectName} / {row.chapterName} / {row.knowledgeName} / {row.typeGroupName}
                  </span>
                </div>

                <div className="mt-6 text-[22px] font-semibold tracking-[-0.03em] text-[var(--wiki-text)]">
                  {row.title}
                </div>
                <MathMarkdown content={row.prompt} className="wiki-question-prompt mt-6" />

                <div className="mt-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-4">
                    <button type="button" onClick={() => toggleAnswer(row.questionId)} className="wiki-pill-button">
                      <EyeIcon />
                      <span>{answerOpen ? "隐藏答案" : "查看答案"}</span>
                    </button>
                    <button type="button" onClick={() => toggleAnalysis(row.questionId)} className="wiki-pill-button">
                      <BookIcon />
                      <span>{analysisOpen ? "隐藏解析" : "查看解析"}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-5 xl:gap-6">
                    <QuestionAction icon={<PlayIcon />} label="视频" />
                    <QuestionAction icon={<NoteIcon />} label="笔记" />
                    <QuestionAction icon={<ExclamationIcon />} label="纠错" />
                    <QuestionAction
                      icon={<StarIcon />}
                      label="收藏"
                      active={favorite}
                      tone="favorite"
                      onClick={() => handleFavoriteAction(row.questionId, row.title, favorite)}
                    />
                    <QuestionAction
                      icon={<CircleXIcon />}
                      label="错题"
                      active={mastery === "unknown"}
                      onClick={() => toggleWrongState(row.questionId, mastery)}
                    />
                    <QuestionAction
                      icon={<CheckCircleIcon />}
                      label="掌握"
                      active={mastery === "mastered"}
                      tone="mastered"
                      onClick={() => toggleMasteredState(row.questionId, mastery)}
                    />
                  </div>
                </div>

                {renderExpandablePanels(row, answerOpen, analysisOpen)}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className={`wiki-shell ${isDark ? "wiki-dark" : "wiki-light"}`}>
      <StartupSignalLoader phase={startupLoaderPhase} />
      <div className="grid h-screen grid-cols-1 overflow-hidden xl:grid-cols-[306px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-[var(--wiki-border)] bg-[var(--wiki-panel)]">
          <div className="flex h-[92px] items-center border-b border-[var(--wiki-border)] px-7">
            <div className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--wiki-text)]">
              My Wiki墙
            </div>
          </div>

          <div className="wiki-scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              <NavItem
                active={dashboardMode === "home" && homeView}
                label="首页"
                icon={<HomeIcon />}
                onClick={() => {
                  setDashboardMode("home");
                  setHomeView(true);
                }}
              />
              <NavItem
                active={dashboardMode === "wrongbook"}
                label="错题本"
                icon={<CircleXIcon />}
                onClick={() => {
                  setDashboardMode("wrongbook");
                  setHomeView(false);
                }}
              />
              <NavItem
                active={dashboardMode === "favorite"}
                label="收藏本"
                icon={<StarIcon />}
                onClick={() => {
                  setDashboardMode("favorite");
                  setHomeView(false);
                }}
              />
              <NavItem
                active={dashboardMode === "algorithms"}
                label="算法演示"
                icon={<WaveIcon />}
                onClick={() => {
                  setDashboardMode("algorithms");
                  setHomeView(false);
                }}
              />
            </div>

            <div className="mt-9">
              <button type="button" className="wiki-section-title">
                <span className="flex items-center gap-3">
                  <GridIcon />
                  <span>章节目录</span>
                </span>
                <ChevronIcon expanded={true} />
              </button>
            </div>

            <div className="mt-7">
              <div className="px-2 text-[17px] font-semibold text-[var(--wiki-text)]">
                {selectedSubject?.name ?? "当前科目"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 px-2">
                {subjects.map((subject) => {
                  const active = subject.id === selectedSubjectId;

                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => switchSubject(subject.id)}
                      className={`wiki-chip ${active ? "wiki-chip-active" : ""}`}
                    >
                      {subject.shortName}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-2">
                {chapters.map((chapter, chapterIndex) => {
                  const chapterExpanded = chapter.id === expandedChapterId;
                  const chapterActive = chapter.id === selectedChapterId;

                  return (
                    <div key={chapter.id}>
                      <div
                        className={`wiki-chapter-row ${chapterActive ? "wiki-chapter-row-active" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            selectChapter(chapter.id);
                            setDashboardMode("home");
                            setHomeView(false);
                          }}
                          className="wiki-chapter-button"
                        >
                          <span className="wiki-chapter-index">
                            （{["一", "二", "三", "四", "五", "六"][chapterIndex] ?? chapterIndex + 1}）
                          </span>
                          <span className="truncate text-[16px] font-semibold">{chapter.name}</span>
                        </button>

                        <button type="button" onClick={() => toggleChapter(chapter.id)} className="wiki-tree-toggle">
                          <ChevronIcon expanded={chapterExpanded} />
                        </button>
                      </div>

                      {chapterExpanded ? (
                        <div className="wiki-knowledge-list">
                          {chapter.knowledgeNodes.map((node) => {
                            const active = node.id === selectedKnowledgeId;

                            return (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => {
                                  selectChapter(chapter.id);
                                  selectKnowledge(node.id);
                                  setDashboardMode("home");
                                  setHomeView(false);
                                }}
                                className={`wiki-knowledge-item ${active ? "wiki-knowledge-item-active" : ""}`}
                              >
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--wiki-dot)]" />
                                <span className="truncate">{node.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-[92px] shrink-0 items-center justify-end border-b border-[var(--wiki-border)] bg-[var(--wiki-panel)] px-7 xl:px-8">
            <div className="flex items-center gap-7 text-[var(--wiki-muted)]">
              <button type="button" onClick={() => setThemeMode(isDark ? "light" : "dark")} className="wiki-icon-button">
                {isDark ? <MoonIcon /> : <SunIcon />}
              </button>
              <button type="button" className="wiki-icon-button">
                <BellIcon />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasMultipleSubjects) {
                    return;
                  }

                  const currentIndex = subjects.findIndex((subject) => subject.id === selectedSubjectId);
                  const nextSubject = subjects[(currentIndex + 1) % subjects.length] ?? subjects[0];

                  if (nextSubject) {
                    switchSubject(nextSubject.id);
                  }
                }}
                className="flex items-center gap-3 text-[18px] font-medium text-[var(--wiki-text)]"
                aria-disabled={!hasMultipleSubjects}
              >
                <span>{selectedSubject?.shortName ?? "Conv"}</span>
                {hasMultipleSubjects ? <ChevronIcon expanded={false} /> : null}
              </button>
            </div>
          </header>

          <div className="wiki-scroll-area min-h-0 flex-1 overflow-y-auto p-6 xl:p-7">
            {dashboardMode === "algorithms" ? (
              <SignalAlgorithmLab />
            ) : dashboardMode === "home" && homeView ? (
              <>
                <section className="wiki-panel wiki-home-hero-card border-[#cddaff]">
                  <div className="flex min-h-[156px] flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
                    {hasLoadedPersistedState ? (
                      <>
                        <div>
                          <div className="text-[15px] text-[var(--wiki-muted)]">学习主线</div>
                          <div className="mt-4 text-[28px] font-semibold tracking-[-0.04em] text-[var(--wiki-text)] xl:text-[34px]">
                            {lastMasteredRecord?.subjectId === selectedSubjectId ? "继续上次学习" : "开始当前科目学习"}
                          </div>
                          <div className="mt-5 text-[15px] leading-8 text-[var(--wiki-muted)] xl:text-[16px]">
                            {lastMasteredRecord?.subjectId === selectedSubjectId ? (
                              <>
                                {lastMasteredRecord.subjectName} / {lastMasteredRecord.chapterName} /{" "}
                                {lastMasteredRecord.knowledgeName} · {lastMasteredRow?.title ?? lastMasteredRecord.questionTitle}
                                {" · "}
                                {formatMasteredAt(lastMasteredRecord.masteredAt)}
                              </>
                            ) : (
                              <>
                                {selectedSubject?.name} / {selectedChapter?.name ?? "未选择章节"} /{" "}
                                {selectedKnowledge?.name ?? "全部知识点"} · 还没有掌握记录
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={continueLearning}
                          className="wiki-primary-button min-w-[170px] self-start xl:self-center"
                        >
                          继续学习
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="wiki-skeleton wiki-skeleton-line h-[16px] w-[86px]" />
                          <div className="wiki-skeleton wiki-skeleton-line mt-5 h-[42px] w-[280px] xl:w-[360px]" />
                          <div className="wiki-skeleton wiki-skeleton-line mt-6 h-[18px] w-[78%]" />
                        </div>
                        <div className="wiki-skeleton wiki-skeleton-button min-w-[170px] self-start xl:self-center" />
                      </>
                    )}
                  </div>
                </section>

                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="大观总量"
                    value={totalQuestionCount}
                    description={`${selectedSubject?.name ?? "当前科目"}题库规模`}
                    icon={<GridIcon />}
                    iconClassName="wiki-home-stat-icon-sage"
                    loading={!hasLoadedPersistedState}
                  />
                  <StatCard
                    title="已经掌握"
                    value={masteredCount}
                    description="累计掌握题目"
                    icon={<CheckCircleIcon />}
                    iconClassName="wiki-home-stat-icon-indigo"
                    loading={!hasLoadedPersistedState}
                  />
                  <StatCard
                    title="错题本"
                    value={wrongCount}
                    description="点击进入错题本"
                    icon={<CircleXIcon />}
                    iconClassName="wiki-home-stat-icon-amber"
                    emphasisClassName="wiki-home-stat-card-flow wiki-home-stat-card-flow-amber"
                    loading={!hasLoadedPersistedState}
                    clickable
                    onClick={() => {
                      setDashboardMode("wrongbook");
                      setHomeView(false);
                    }}
                  />
                  <StatCard
                    title="收藏本"
                    value={favoriteCount}
                    description="点击进入收藏本"
                    icon={<StarIcon />}
                    iconClassName="wiki-home-stat-icon-rose"
                    emphasisClassName="wiki-home-stat-card-flow wiki-home-stat-card-flow-rose"
                    loading={!hasLoadedPersistedState}
                    clickable
                    onClick={() => {
                      setDashboardMode("favorite");
                      setHomeView(false);
                    }}
                  />
                </div>

                <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <section className="wiki-panel min-h-[220px]">
                    <h2 className="text-[22px] font-semibold text-[var(--wiki-text)]">我的学习概览</h2>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div className="wiki-summary-card wiki-home-mini-card">
                        <div className="text-[14px] text-[var(--wiki-muted)]">当前章节</div>
                        {hasLoadedPersistedState ? (
                          <div className="mt-3 text-[18px] font-semibold text-[var(--wiki-text)]">
                            {selectedChapter?.name ?? "未选择"}
                          </div>
                        ) : (
                          <div className="wiki-skeleton wiki-skeleton-line mt-3 h-[22px] w-[70%]" />
                        )}
                      </div>
                      <div className="wiki-summary-card wiki-home-mini-card">
                        <div className="text-[14px] text-[var(--wiki-muted)]">当前知识点</div>
                        {hasLoadedPersistedState ? (
                          <div className="mt-3 text-[18px] font-semibold text-[var(--wiki-text)]">
                            {selectedKnowledge?.name ?? "全部"}
                          </div>
                        ) : (
                          <div className="wiki-skeleton wiki-skeleton-line mt-3 h-[22px] w-[62%]" />
                        )}
                      </div>
                      <div className="wiki-summary-card wiki-home-mini-card">
                        <div className="text-[14px] text-[var(--wiki-muted)]">当前题量</div>
                        {hasLoadedPersistedState ? (
                          <div className="mt-3 text-[18px] font-semibold text-[var(--wiki-text)]">
                            {selectedSubjectRows.length} 道
                          </div>
                        ) : (
                          <div className="wiki-skeleton wiki-skeleton-line mt-3 h-[22px] w-[46%]" />
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="wiki-panel min-h-[220px]">
                    <h2 className="text-[22px] font-semibold text-[var(--wiki-text)]">公告看板</h2>
                  </section>
                </div>
              </>
            ) : dashboardMode === "home" ? (
              <section className="wiki-panel">
                <div className="wiki-toolbar">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="text-[18px] font-semibold text-[var(--wiki-text)]">选择章节：</div>
                    <select
                      value={selectedChapterId}
                      onChange={(event) => {
                        selectChapter(event.target.value);
                        setHomeView(false);
                      }}
                      className="wiki-select"
                    >
                      {chapters.map((chapter) => (
                        <option key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-[18px] font-semibold text-[var(--wiki-text)]">
                      0/{visibleQuestionRows.length}
                    </div>
                    <button type="button" onClick={goNextChapter} className="wiki-pill-button">
                      下一节
                    </button>
                  </div>
                </div>

                <div className="space-y-6 p-6">
                  {visibleQuestionRows.map((row, index) => {
                    const mastery = questionMasteryMap[row.questionId] ?? row.mastery;
                    const favorite = questionFavoriteMap[row.questionId] === true;
                    const answerOpen = expandedAnswers[row.questionId];
                    const analysisOpen = expandedAnalysis[row.questionId];
                    const activeQuestion = row.questionId === selectedQuestionId;

                    return (
                      <article
                        key={row.rowId}
                        ref={(node) => {
                          questionCardRefs.current[row.questionId] = node;
                        }}
                        className={`wiki-question-card ${activeQuestion ? "wiki-question-card-active" : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--wiki-border)] pb-5 text-[15px] text-[var(--wiki-muted)]">
                          <span className="rounded-full bg-[var(--wiki-chip-bg)] px-4 py-2 font-semibold text-[var(--wiki-text)]">
                            #{index + 1}
                          </span>
                          <span className="rounded-[10px] bg-[var(--wiki-chip-bg)] px-4 py-2">
                            {row.year} {row.source}
                          </span>
                          <span className="rounded-[10px] bg-[var(--wiki-chip-bg)] px-4 py-2">
                            {row.subjectName} / {row.chapterName} / {row.knowledgeName} / {row.typeGroupName}
                          </span>
                        </div>

                        <div className="mt-6 text-[22px] font-semibold tracking-[-0.03em] text-[var(--wiki-text)]">
                          {row.title}
                        </div>
                        <MathMarkdown content={row.prompt} className="wiki-question-prompt mt-8" />

                        <div className="mt-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                          <div className="flex flex-wrap gap-4">
                            <button type="button" onClick={() => toggleAnswer(row.questionId)} className="wiki-pill-button">
                              <EyeIcon />
                              <span>{answerOpen ? "隐藏答案" : "查看答案"}</span>
                            </button>
                            <button type="button" onClick={() => toggleAnalysis(row.questionId)} className="wiki-pill-button">
                              <BookIcon />
                              <span>{analysisOpen ? "隐藏解析" : "查看解析"}</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-5 xl:gap-6">
                            <QuestionAction icon={<PlayIcon />} label="视频" />
                            <QuestionAction icon={<NoteIcon />} label="笔记" />
                            <QuestionAction icon={<ExclamationIcon />} label="纠错" />
                            <QuestionAction
                              icon={<StarIcon />}
                              label="收藏"
                              active={favorite}
                              tone="favorite"
                              onClick={() => handleFavoriteAction(row.questionId, row.title, favorite)}
                            />
                            <QuestionAction
                              icon={<CircleXIcon />}
                              label="错题"
                              active={mastery === "unknown"}
                              onClick={() => toggleWrongState(row.questionId, mastery)}
                            />
                            <QuestionAction
                              icon={<CheckCircleIcon />}
                              label="掌握"
                              active={mastery === "mastered"}
                              tone="mastered"
                              onClick={() => toggleMasteredState(row.questionId, mastery)}
                            />
                          </div>
                        </div>

                        {renderExpandablePanels(row, answerOpen, analysisOpen)}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              renderQuestionCollection(
                dashboardMode === "favorite" ? "收藏本" : "错题本",
                `${selectedSubject?.name ?? "当前科目"} 共 ${visibleQuestionRows.length} 题`,
              )
            )}

          </div>
        </main>
      </div>

      {favoriteRemovalConfirm ? (
        <div className="wiki-modal-backdrop">
          <div className="wiki-modal-card">
            <div className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--wiki-text)]">确认取消收藏</div>
            <div className="mt-4 text-[15px] leading-7 text-[var(--wiki-muted)]">
              你将把这道题从收藏本中移除：
              <span className="mt-2 block font-medium text-[var(--wiki-text)]">{favoriteRemovalConfirm.questionTitle}</span>
            </div>

            <label className="mt-5 flex items-center gap-3 text-[14px] text-[var(--wiki-muted)]">
              <input
                type="checkbox"
                checked={favoriteRemovalConfirm.skipToday}
                onChange={(event) =>
                  setFavoriteRemovalConfirm((current) =>
                    current
                      ? {
                          ...current,
                          skipToday: event.target.checked,
                        }
                      : null,
                  )
                }
                className="h-4 w-4 rounded border-[var(--wiki-border)]"
              />
              <span>本日之内不再提醒</span>
            </label>

            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setFavoriteRemovalConfirm(null)} className="wiki-pill-button">
                取消
              </button>
              <button type="button" onClick={confirmFavoriteRemoval} className="wiki-primary-button">
                确认取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
