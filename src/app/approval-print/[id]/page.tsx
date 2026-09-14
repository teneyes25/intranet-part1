import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { RichTextContent } from "@/features/board/components/rich-text-content";
import { PrintButton } from "@/features/approval/components/print-button";
import { OfficialDocumentFrame } from "@/features/approval/components/official-document-frame";
import { getDocument } from "@/features/approval/queries";

export const metadata: Metadata = { title: "기안서 출력" };

export default async function ApprovalPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <style>{`@media print { @page { margin: 18mm; } body { background: #fff; } }`}</style>

      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <OfficialDocumentFrame
        kind={doc.kind}
        title={doc.title}
        documentNumber={doc.documentNumber}
        status={doc.status}
        drafterName={doc.drafter.name}
        drafterRole={doc.drafter.role}
        draftedAt={doc.submittedAt ?? doc.createdAt}
        approvedAt={doc.completedAt}
        executedAt={doc.executedAt}
        registeredAt={doc.registeredAt}
        steps={doc.steps}
        sealSrc={doc.sealStorageKey ? `/api/approval/${doc.id}/media?type=seal` : null}
        signatureSrc={
          doc.signatureStorageKey
            ? `/api/approval/${doc.id}/media?type=signature`
            : null
        }
      >
        <RichTextContent html={doc.content} className="text-black" />
      </OfficialDocumentFrame>

      {doc.attachments.length > 0 && (
        <p className="mt-6 text-xs text-neutral-500">
          첨부 {doc.attachments.length}건:{" "}
          {doc.attachments.map((a) => a.filename).join(", ")}
        </p>
      )}
    </div>
  );
}
