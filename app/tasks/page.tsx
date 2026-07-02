import TaskList from "@/features/tasks/components/TaskList";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function TasksPage({ searchParams }: Props) {
  return <TaskList searchParams={searchParams} />;
}
