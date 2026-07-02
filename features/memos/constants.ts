
import { MemoType } from "@prisma/client";

export const MEMO_TYPE_OPTIONS = Object.values(MemoType);
export const MEMO_SOURCE_OPTIONS = ["student", "class", "task", "calendar-private", "calendar-event"] as const;
