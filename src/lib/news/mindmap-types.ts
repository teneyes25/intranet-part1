export type MindmapNode = {
  label: string;
  source?: number;
  children?: MindmapNode[];
};

export type NewsMindmapPayload = {
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  articleCount: number;
  tree: MindmapNode;
  mermaid: string;
  markdown: string;
  opml: string;
};

export type NewsPeriod = {
  from: Date;
  to: Date;
  label: string;
};
