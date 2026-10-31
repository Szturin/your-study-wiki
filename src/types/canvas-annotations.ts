export type CanvasAnnotation = {
  nodeId: string;
  title: string;
  text: string;
  tags: string[];
  deepLink: string;
  images: { path: string; label: string }[];
};

export type CanvasAnnotationBank = {
  version: 1;
  source: string;
  years: string[];
  records: Record<string, CanvasAnnotation[]>;
  yearNotes: Record<string, CanvasAnnotation[]>;
};
