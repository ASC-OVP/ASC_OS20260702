
import type { TaskPriority } from "@prisma/client";
import { taskPriorityLabel, taskPriorityTone } from "@/features/tasks/lib/taskPriority";

type Props = { priority: TaskPriority | string };

export default function TaskPriorityBadge({ priority }: Props) {
  return <span data-tone={taskPriorityTone(priority)}>{taskPriorityLabel(priority)}</span>;
}
