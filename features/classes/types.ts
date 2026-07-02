export type { ClassGroup, ClassGroupStatus, ClassLesson, ClassMemo, StudentClass } from "@prisma/client";
export type ClassFilters = { q: string; grade: string; subject: string; teacherId: string; status: string };
