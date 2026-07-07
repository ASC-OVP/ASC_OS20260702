
import { prisma } from "@/lib/prisma";
import { canManageOmr, getStaffPermissionSet } from "@/lib/staffPermissions";

type OmrPermissionUser = {
  id: string;
  academyId: string;
  role: string;
};

export function canManageExam(role: string) {
  return role === "ADMIN" || role === "MANAGER" || role === "TEACHER";
}

export async function canManageExamForUser(user: OmrPermissionUser) {
  const permissions = await getStaffPermissionSet(user.academyId, user.id);
  return canManageOmr(user.role, permissions);
}

export async function findExamForUser(examId: string, academyId: string) {
  return prisma.exam.findFirst({
    where: { id: examId, academyId },
    include: { answerKeys: true },
  });
}
