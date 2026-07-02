
import { MemoType, StudentStatus } from "@prisma/client";

export const STUDENT_STATUS_OPTIONS = Object.values(StudentStatus);
export const STUDENT_MEMO_TYPE_OPTIONS = Object.values(MemoType);
export const STUDENT_DEFAULT_PAGE_SIZE = 50;
