import type { Prisma } from "@prisma/client";

export type ScopedUser = {
  id: string;
  academyId: string;
  role: string;
};

export function studentWhereForUser(user: ScopedUser): Prisma.StudentWhereInput {
  if (user.role === "TEACHER") {
    return {
      academyId: user.academyId,
      OR: [
        { teacherId: user.id },
        { studentClasses: { some: { classGroup: { teacherId: user.id } } } },
      ],
    };
  }

  return { academyId: user.academyId };
}

export function canExportFullAcademy(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}
