"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function hideOperationalQueueItem(signalId: string) {
  const user = await requireUser();
  const normalizedSignalId = signalId.trim();
  if (!normalizedSignalId) throw new Error("숨길 운영 큐 항목을 찾을 수 없습니다.");

  await prisma.$executeRaw`
    INSERT INTO "OperationalQueueAcknowledgement" ("id", "academyId", "signalId", "acknowledgedById", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${user.academyId}, ${normalizedSignalId}, ${user.id}, CURRENT_TIMESTAMP)
    ON CONFLICT("academyId", "signalId") DO UPDATE SET
      "acknowledgedById" = excluded."acknowledgedById",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  revalidatePath("/dashboard");
}
