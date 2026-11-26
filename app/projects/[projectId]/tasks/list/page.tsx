
import { Suspense } from "react";
import TaskList from "@/features/tasks/components/task-list";

type Props = {
  params: Promise<{ projectId: string }>;
};

async function TaskListContent({ params }: Props) {
  const { projectId } = await params;

  return (
    <main className="p-6">
      <TaskList projectId={projectId} />
    </main>
  );
}

export default function TaskListPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-6">Loading tasks...</p>}>
      <TaskListContent params={params} />
    </Suspense>
  );
}
