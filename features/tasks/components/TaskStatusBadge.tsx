
import type { TaskStatus } from "@prisma/client";
import { taskStatusLabel, taskStatusTone } from "@/features/tasks/lib/taskStatus";

type Props = { status: TaskStatus | string };

export default function TaskStatusBadge({ status }: Props) {
  return <span data-tone={taskStatusTone(status)}>{taskStatusLabel(status)}</span>;
}
