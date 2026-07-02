
import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";

export const TASK_STATUS_OPTIONS = Object.values(TaskStatus);
export const TASK_PRIORITY_OPTIONS = Object.values(TaskPriority);
export const TASK_TYPE_OPTIONS = Object.values(TaskType);
export const TASK_DEFAULT_TAB = "open";
