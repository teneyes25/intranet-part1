import "server-only";

import { prisma } from "@/lib/prisma";

/** SNS 연동 UI에 노출하지 않는 내부 provider */
const INTERNAL_PROVIDERS = new Set(["news_auto_collect"]);

export function listIntegrations() {
  return prisma.integrationSetting.findMany({
    where: { provider: { notIn: [...INTERNAL_PROVIDERS] } },
    orderBy: { provider: "asc" },
  });
}

export async function updateIntegration(
  provider: string,
  data: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    webhookUrl?: string;
    isEnabled?: boolean;
  },
) {
  return prisma.integrationSetting.update({
    where: { provider },
    data: {
      ...(data.apiKey !== undefined && { apiKey: data.apiKey || null }),
      ...(data.apiSecret !== undefined && { apiSecret: data.apiSecret || null }),
      ...(data.accessToken !== undefined && {
        accessToken: data.accessToken || null,
      }),
      ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl || null }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
    },
  });
}
