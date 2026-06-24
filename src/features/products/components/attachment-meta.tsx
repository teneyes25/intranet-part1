import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/board/utils";

export async function AttachmentMeta({
  attachmentId,
  currentVersion,
}: {
  attachmentId: string;
  currentVersion: number;
}) {
  const [downloadCount, versions] = await Promise.all([
    prisma.downloadLog.count({ where: { attachmentId } }),
    prisma.attachmentVersion.count({ where: { attachmentId } }),
  ]);

  return (
    <span className="ml-2 inline-flex flex-wrap items-center gap-1">
      {currentVersion > 1 || versions > 0 ? (
        <Badge variant="outline" className="text-[10px]">
          v{currentVersion}
        </Badge>
      ) : null}
      {downloadCount > 0 && (
        <Badge variant="secondary" className="text-[10px]">
          ↓ {downloadCount}
        </Badge>
      )}
    </span>
  );
}

export async function AttachmentVersionList({
  attachmentId,
}: {
  attachmentId: string;
}) {
  const versions = await prisma.attachmentVersion.findMany({
    where: { attachmentId },
    orderBy: { version: "desc" },
    include: { uploadedBy: { select: { name: true } } },
    take: 5,
  });

  if (versions.length <= 1) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/30 p-2 text-xs">
      <p className="mb-1 font-medium text-muted-foreground">버전 이력</p>
      <ul className="space-y-1">
        {versions.map((v) => (
          <li key={v.id} className="flex justify-between gap-2">
            <span>
              v{v.version} · {v.filename}
            </span>
            <span className="text-muted-foreground">
              {v.uploadedBy.name} · {formatDateTime(v.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
