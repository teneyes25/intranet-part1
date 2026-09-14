import type { MindmapNode, NewsMindmapPayload } from "@/lib/news/mindmap-types";

export function sanitizeMindmapLabel(raw: string, max = 48) {
  return raw
    .replace(/[\[\](){}<>]/g, "")
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function treeToMarkdown(node: MindmapNode, depth = 0): string {
  const pad = "  ".repeat(depth);
  const src = node.source ? ` [${node.source}]` : "";
  const line = `${pad}- ${node.label}${src}`;
  const kids = (node.children ?? []).map((c) => treeToMarkdown(c, depth + 1));
  return [line, ...kids].join("\n");
}

export function treeToMermaid(node: MindmapNode): string {
  const lines = ["mindmap"];
  const walk = (n: MindmapNode, depth: number) => {
    const indent = "  ".repeat(depth + 1);
    const label = sanitizeMindmapLabel(n.label, 40);
    if (depth === 0) {
      lines.push(`${indent}root((${label || "뉴스"}))`);
    } else {
      lines.push(`${indent}${label || "항목"}`);
    }
    for (const c of n.children ?? []) walk(c, depth + 1);
  };
  walk(node, 0);
  return lines.join("\n");
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function treeToOpml(title: string, node: MindmapNode): string {
  const walk = (n: MindmapNode): string => {
    const text = escapeXml(n.label);
    const kids = n.children ?? [];
    if (kids.length === 0) {
      return `<outline text="${text}" />`;
    }
    return `<outline text="${text}">${kids.map(walk).join("")}</outline>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
  </head>
  <body>
    ${walk(node)}
  </body>
</opml>
`;
}

export function assembleMindmapPayload(opts: {
  title: string;
  periodLabel: string;
  from: Date;
  to: Date;
  articleCount: number;
  tree: MindmapNode;
}): NewsMindmapPayload {
  const tree = opts.tree.label
    ? opts.tree
    : { ...opts.tree, label: opts.title };
  return {
    title: opts.title,
    periodLabel: opts.periodLabel,
    from: opts.from.toISOString(),
    to: opts.to.toISOString(),
    articleCount: opts.articleCount,
    tree,
    mermaid: treeToMermaid(tree),
    markdown: `# ${opts.title}\n\n기간: ${opts.periodLabel} · ${opts.articleCount}건\n\n${treeToMarkdown(tree)}\n`,
    opml: treeToOpml(opts.title, tree),
  };
}
