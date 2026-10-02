import type { StorageFailureRecord } from "./storage-error";

export type RehearsalReport = {
  stage: "storage-adapter-rehearsal";
  cloudIntegrationComplete: false;
  remoteVerification: "not-run" | "executed";
  remoteConnected: boolean;
  scenarioPassed: boolean;
  cleanupPassed: boolean;
  unresolvedObjects: StorageFailureRecord[];
  skippedRemote?: boolean;
  scenarioErrorName?: string;
  reason?: string;
  adapter?: string;
  catalog?: string;
  tenantId?: string;
  documentId?: string;
  versionId?: string;
  sha256?: string;
  steps?: { id: string; ok: boolean; detail: string }[];
  objectRoot?: string;
  keyPrefix?: string;
  bucket?: string;
  region?: string;
};

export function rehearsalExitCode(report: Pick<
  RehearsalReport,
  "scenarioPassed" | "cleanupPassed" | "skippedRemote"
>) {
  if (report.skippedRemote) return 2;
  if (!report.scenarioPassed || !report.cleanupPassed) return 1;
  return 0;
}

export function finishRehearsalReport(
  input: Omit<RehearsalReport, "stage" | "cloudIntegrationComplete" | "cleanupPassed" | "unresolvedObjects"> & {
    cleanupFailures: StorageFailureRecord[];
  },
): RehearsalReport {
  const { cleanupFailures, ...rest } = input;
  return {
    stage: "storage-adapter-rehearsal",
    cloudIntegrationComplete: false,
    cleanupPassed: cleanupFailures.length === 0,
    unresolvedObjects: cleanupFailures,
    ...rest,
  };
}
