"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
}

const FONTS = [
  { label: "본고딕", value: '"Noto Sans KR", "Malgun Gothic", sans-serif' },
  { label: "맑은 고딕", value: '"Malgun Gothic", sans-serif' },
  { label: "바탕", value: '"Batang", "Times New Roman", serif' },
  { label: "궁서", value: '"Gungsuh", "Batang", serif' },
  { label: "돋움", value: '"Dotum", sans-serif' },
];

const SIZES = ["12px", "13px", "14px", "15px", "16px", "18px", "20px", "24px", "28px"];
const LETTER_SPACINGS = [
  { label: "자간 기본", value: "" },
  { label: "자간 -1", value: "-1px" },
  { label: "자간 0", value: "0px" },
  { label: "자간 1", value: "1px" },
  { label: "자간 2", value: "2px" },
  { label: "자간 4", value: "4px" },
];
const STRETCHES = [
  { label: "자평 100%", value: "" },
  { label: "자평 80%", value: "80%" },
  { label: "자평 90%", value: "90%" },
  { label: "자평 110%", value: "110%" },
  { label: "자평 120%", value: "120%" },
];
const PARA_GAPS = [
  { label: "문단 기본", value: "" },
  { label: "문단 4pt", value: "4px" },
  { label: "문단 8pt", value: "8px" },
  { label: "문단 12pt", value: "12px" },
  { label: "문단 16pt", value: "16px" },
  { label: "문단 24pt", value: "24px" },
];

const TextStyleMark = Mark.create({
  name: "textStyle",
  addOptions() {
    return { HTMLAttributes: {} };
  },
  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (el) =>
          (el as HTMLElement).hasAttribute("style") ? {} : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (el) => el.style.fontFamily || null,
        renderHTML: (a) => (a.fontFamily ? { style: `font-family: ${a.fontFamily}` } : {}),
      },
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: (a) => (a.fontSize ? { style: `font-size: ${a.fontSize}` } : {}),
      },
      color: {
        default: null,
        parseHTML: (el) => el.style.color || null,
        renderHTML: (a) => (a.color ? { style: `color: ${a.color}` } : {}),
      },
      letterSpacing: {
        default: null,
        parseHTML: (el) => el.style.letterSpacing || null,
        renderHTML: (a) =>
          a.letterSpacing ? { style: `letter-spacing: ${a.letterSpacing}` } : {},
      },
      fontStretch: {
        default: null,
        parseHTML: (el) => el.style.fontStretch || null,
        renderHTML: (a) =>
          a.fontStretch ? { style: `font-stretch: ${a.fontStretch}` } : {},
      },
    };
  },
});

const ParagraphStyle = Extension.create({
  name: "paragraphStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (el) => el.style.textAlign || null,
            renderHTML: (a) => (a.textAlign ? { style: `text-align: ${a.textAlign}` } : {}),
          },
          paragraphSpacing: {
            default: null,
            parseHTML: (el) => el.style.marginBottom || null,
            renderHTML: (a) =>
              a.paragraphSpacing ? { style: `margin-bottom: ${a.paragraphSpacing}` } : {},
          },
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (a) =>
              a.lineHeight ? { style: `line-height: ${a.lineHeight}` } : {},
          },
        },
      },
    ];
  },
});

const PROSE_CLASSES =
  "[&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-relaxed [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1";

export function RichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  minHeightClass,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      TextStyleMark,
      ParagraphStyle,
    ],
    content: value,
    editorProps: {
      attributes: { class: "focus:outline-none" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return (
      <div className="min-h-[300px] rounded-md border border-input bg-muted/20" />
    );
  }

  return (
    <div className={cn("rounded-md border border-input bg-background", PROSE_CLASSES, minHeightClass)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  const btn = (active: boolean) =>
    cn(
      "inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      active && "bg-accent text-foreground",
    );

  const style = editor.getAttributes("textStyle") as {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
    letterSpacing?: string;
    fontStretch?: string;
  };
  const para = editor.getAttributes("paragraph") as {
    textAlign?: string;
    paragraphSpacing?: string;
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
      <select
        className="h-8 max-w-[7.5rem] rounded border border-input bg-transparent px-1 text-xs"
        value={style.fontFamily ?? ""}
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .setMark("textStyle", { fontFamily: e.target.value || null })
            .run()
        }
        aria-label="글꼴"
      >
        <option value="">글꼴</option>
        {FONTS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        className="h-8 w-[4.2rem] rounded border border-input bg-transparent px-1 text-xs"
        value={style.fontSize ?? ""}
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .setMark("textStyle", { fontSize: e.target.value || null })
            .run()
        }
        aria-label="글자 크기"
      >
        <option value="">크기</option>
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s.replace("px", "pt")}
          </option>
        ))}
      </select>
      <label className="inline-flex h-8 w-8 items-center justify-center" title="글자색">
        <input
          type="color"
          className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
          value={toColorInput(style.color)}
          onChange={(e) =>
            editor.chain().focus().setMark("textStyle", { color: e.target.value }).run()
          }
          aria-label="글자색"
        />
      </label>
      <select
        className="h-8 max-w-[5.5rem] rounded border border-input bg-transparent px-1 text-xs"
        value={style.letterSpacing ?? ""}
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .setMark("textStyle", { letterSpacing: e.target.value || null })
            .run()
        }
        aria-label="자간"
      >
        {LETTER_SPACINGS.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        className="h-8 max-w-[5.5rem] rounded border border-input bg-transparent px-1 text-xs"
        value={style.fontStretch ?? ""}
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .setMark("textStyle", { fontStretch: e.target.value || null })
            .run()
        }
        aria-label="자평"
      >
        {STRETCHES.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        className="h-8 max-w-[5.8rem] rounded border border-input bg-transparent px-1 text-xs"
        value={para.paragraphSpacing ?? ""}
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .updateAttributes("paragraph", {
              paragraphSpacing: e.target.value || null,
            })
            .run()
        }
        aria-label="문단 간격"
      >
        {PARA_GAPS.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={btn(para.textAlign === "left")} onClick={() => editor.chain().focus().updateAttributes("paragraph", { textAlign: "left" }).run()} aria-label="왼쪽 정렬">
        <AlignLeft className="h-4 w-4" />
      </button>
      <button type="button" className={btn(para.textAlign === "center")} onClick={() => editor.chain().focus().updateAttributes("paragraph", { textAlign: "center" }).run()} aria-label="가운데 정렬">
        <AlignCenter className="h-4 w-4" />
      </button>
      <button type="button" className={btn(para.textAlign === "right")} onClick={() => editor.chain().focus().updateAttributes("paragraph", { textAlign: "right" }).run()} aria-label="오른쪽 정렬">
        <AlignRight className="h-4 w-4" />
      </button>
      <button type="button" className={btn(para.textAlign === "justify")} onClick={() => editor.chain().focus().updateAttributes("paragraph", { textAlign: "justify" }).run()} aria-label="양쪽 정렬">
        <AlignJustify className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="굵게">
        <Bold className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="기울임">
        <Italic className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="취소선">
        <Strikethrough className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="제목2">
        <Heading2 className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="제목3">
        <Heading3 className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="목록">
        <List className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="번호 목록">
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="인용">
        <Quote className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-label="코드">
        <Code className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("link"))} onClick={setLink} aria-label="링크">
        <LinkIcon className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} aria-label="실행 취소">
        <Undo2 className="h-4 w-4" />
      </button>
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} aria-label="다시 실행">
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function toColorInput(color?: string) {
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return "#222222";
}
