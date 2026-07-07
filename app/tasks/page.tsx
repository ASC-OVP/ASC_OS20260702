import TaskWorkspace from "@/features/tasks/components/TaskWorkspace";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function TasksPage({ searchParams }: Props) {
  return <TaskWorkspace searchParams={searchParams} />;
}
