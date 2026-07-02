
import type { StudentStatus } from "@prisma/client";
import { studentStatusLabel, studentStatusTone } from "@/features/students/lib/studentStatus";

type Props = { status: StudentStatus | string };

export default function StudentStatusBadge({ status }: Props) {
  return <span data-tone={studentStatusTone(status)}>{studentStatusLabel(status)}</span>;
}
