import "server-only";

import { prisma } from "@/lib/prisma";

export function listIntegrations() {
  return prisma.integrationSetting.findMany({ orderBy: { provider: "asc" } });
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
