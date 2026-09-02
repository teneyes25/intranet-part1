"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  loadRoomMessagesAction,
  openDmAction,
  pingMessengerPresenceAction,
  refreshMessengerStateAction,
  sendMessengerMessageAction,
} from "@/features/messenger/actions";
import {
  MESSENGER_MAX_FILE_SIZE,
  MESSENGER_MAX_FILES,
} from "@/features/messenger/constants";
import { formatPeerLabel } from "@/features/messenger/display";

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  jobs: string[];
  workplace: string | null;
  title: string | null;
  rank: string | null;
  hiredAt: Date | string | null;
  photoStorageKey: string | null;
  online: boolean;
};

export type RoomSummary = {
  id: string;
  title: string;
  peers: {
    id: string;
    name: string;
    online: boolean;
    photoStorageKey: string | null;
    title: string | null;
    jobs?: string[];
  }[];
  lastBody: string;
  lastAt: Date | string;
};

type ChatMsg = {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date | string;
  sender: { id: string; name: string };
  attachments: { id: string; filename: string; mimeType: string; size: number }[];
};

function Avatar({
  userId,
  name,
  photo,
  online,
  size = 36,
}: {
  userId: string;
  name: string;
  photo?: string | null;
  online?: boolean;
  size?: number;
}) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/messenger/photo/${userId}`}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[#E6EAE6] text-xs font-semibold">
          {name.slice(0, 1)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white",
            online ? "bg-emerald-500" : "bg-zinc-300",
          )}
          title={online ? "로그인 중" : "오프라인"}
        />
      )}
    </span>
  );
}

export function MessengerApp({
  meId,
  directory: initialDirectory,
  rooms: initialRooms,
  compact,
  variant = "page",
}: {
  meId: string;
  directory: DirectoryUser[];
  rooms: RoomSummary[];
  compact?: boolean;
  variant?: "page" | "window";
}) {
  const [tab, setTab] = useState<"chat" | "people">("people");
  const [rooms, setRooms] = useState(initialRooms);
  const [directory, setDirectory] = useState(initialDirectory);
  const [roomId, setRoomId] = useState<string | null>(initialRooms[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isWindow = variant === "window";
  const stacked = compact && !isWindow;

  const activeRoom = rooms.find((r) => r.id === roomId) ?? null;

  useEffect(() => {
    const t = setInterval(() => {
      void pingMessengerPresenceAction();
    }, 25000);
    void pingMessengerPresenceAction();
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const r = await refreshMessengerStateAction();
      if (cancelled || !("ok" in r) || !r.ok) return;
      setDirectory(r.directory);
      setRooms(r.rooms);
    }
    void refresh();
    const t = setInterval(() => void refresh(), 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    async function pull() {
      const r = await loadRoomMessagesAction(roomId!);
      if (cancelled) return;
      if ("ok" in r && r.ok) setMessages(r.messages as ChatMsg[]);
    }
    void pull();
    const t = setInterval(() => void pull(), 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, roomId]);

  const onlineCount = useMemo(
    () => directory.filter((d) => d.online).length,
    [directory],
  );

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((u) => {
      const hay = [u.name, u.title, u.rank, u.workplace, ...(u.jobs ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [directory, query]);

  function openPeer(peerId: string) {
    start(async () => {
      const r = await openDmAction(peerId);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      setRoomId(r.roomId);
      setTab("chat");
      const peer = directory.find((d) => d.id === peerId);
      setRooms((prev) => {
        if (prev.some((x) => x.id === r.roomId)) return prev;
        return [
          {
            id: r.roomId,
            title: peer?.name ?? "대화",
            peers: peer
              ? [
                  {
                    id: peer.id,
                    name: peer.name,
                    online: peer.online,
                    photoStorageKey: peer.photoStorageKey,
                    title: peer.title,
                    jobs: peer.jobs,
                  },
                ]
              : [],
            lastBody: "",
            lastAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    });
  }

  function send() {
    if (!roomId || pending) return;
    const text = body.trim();
    if (!text && files.length === 0) return;
    const fd = new FormData();
    fd.set("roomId", roomId);
    fd.set("body", text);
    files.forEach((f) => fd.append("files", f));
    start(async () => {
      const r = await sendMessengerMessageAction(fd);
      if ("error" in r) toast.error(r.error);
      else {
        setBody("");
        setFiles([]);
        const loaded = await loadRoomMessagesAction(roomId);
        if ("ok" in loaded && loaded.ok) setMessages(loaded.messages as ChatMsg[]);
      }
    });
  }

  return (
    <div className={cn("flex h-full min-h-0", stacked ? "flex-col" : "flex-row")}>
      <aside
        className={cn(
          "flex flex-col border-r bg-[#F7F8F6]",
          stacked
            ? "h-40 shrink-0 border-b border-r-0"
            : isWindow
              ? "w-[168px] shrink-0"
              : "w-64",
        )}
      >
        <div className="flex items-center gap-1 border-b p-1.5 text-[11px]">
          <button
            type="button"
            className={cn(
              "rounded-full px-2 py-1",
              tab === "people" ? "bg-white shadow" : "text-muted-foreground",
            )}
            onClick={() => setTab("people")}
          >
            회원 {onlineCount}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-2 py-1",
              tab === "chat" ? "bg-white shadow" : "text-muted-foreground",
            )}
            onClick={() => setTab("chat")}
          >
            대화
          </button>
          <Link
            href={isWindow ? "/messenger/pop/profile" : "/messenger/profile"}
            className="ml-auto p-1"
            title="회원 설정"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
        {tab === "people" && (
          <div className="border-b p-1.5">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름·직책·업무"
              className="h-7 text-xs"
            />
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {tab === "people"
            ? filteredPeople.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="flex w-full items-start gap-1.5 px-2 py-1.5 text-left hover:bg-white"
                  onClick={() => openPeer(u.id)}
                >
                  <Avatar
                    userId={u.id}
                    name={u.name}
                    photo={u.photoStorageKey}
                    online={u.online}
                    size={isWindow ? 28 : 36}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium leading-tight">
                      {formatPeerLabel(u)}
                    </span>
                    {u.online && (
                      <span className="text-[10px] font-normal text-emerald-600">
                        로그인
                      </span>
                    )}
                  </span>
                </button>
              ))
            : rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-1.5 px-2 py-1.5 text-left hover:bg-white",
                    r.id === roomId && "bg-white",
                  )}
                  onClick={() => {
                    setRoomId(r.id);
                    setTab("chat");
                  }}
                >
                  <Avatar
                    userId={r.peers[0]?.id ?? "x"}
                    name={r.title}
                    photo={r.peers[0]?.photoStorageKey}
                    online={r.peers[0]?.online}
                    size={isWindow ? 28 : 36}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium leading-tight">
                      {r.peers[0]
                        ? formatPeerLabel(r.peers[0])
                        : r.title}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {r.lastBody || "새 대화"}
                    </span>
                  </span>
                </button>
              ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-3 py-2">
          <p className="truncate text-sm font-semibold">
            {activeRoom?.peers[0]
              ? formatPeerLabel(activeRoom.peers[0])
              : (activeRoom?.title ?? "상대를 선택하세요")}
          </p>
          {activeRoom?.peers[0] && (
            <p className="text-[11px] text-muted-foreground">
              {activeRoom.peers[0].online ? "로그인 중" : "오프라인"}
            </p>
          )}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                m.senderId === meId
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-[#EEF1ED]",
              )}
            >
              {m.senderId !== meId && (
                <p className="mb-0.5 text-[11px] opacity-70">{m.sender.name}</p>
              )}
              {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
              {m.attachments.map((a) => (
                <a
                  key={a.id}
                  href={`/api/messenger/files/${a.id}`}
                  className="mt-1 flex items-center gap-1 text-xs underline"
                >
                  <Paperclip className="h-3 w-3" />
                  {a.filename}
                </a>
              ))}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form
          className="space-y-1 border-t p-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {files.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              첨부 {files.length}개 (최대 {MESSENGER_MAX_FILES}개 · 각 10MB)
            </p>
          )}
          <div className="flex gap-1">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                const next = [...files, ...list].slice(0, MESSENGER_MAX_FILES);
                if (list.some((f) => f.size > MESSENGER_MAX_FILE_SIZE)) {
                  toast.error("파일당 최대 10MB입니다.");
                }
                setFiles(next.filter((f) => f.size <= MESSENGER_MAX_FILE_SIZE));
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={!roomId}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="메시지 입력"
              disabled={!roomId || pending}
            />
            <Button type="submit" disabled={!roomId || pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function MessengerLauncherIcon() {
  return <MessageSquare className="h-4 w-4" />;
}

export function MessengerEmptyHint() {
  return (
    <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
      <Users className="h-4 w-4" /> 회원을 선택해 대화를 시작하세요.
    </p>
  );
}
