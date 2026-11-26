
import { Suspense } from "react";
import TaskForm from "@/features/tasks/components/task-form";

type TasksPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

async function TasksPageContent({ params }: TasksPageProps) {
  const { projectId } = await params;

  if (!projectId) {
    return (
      <main className="p-6 text-red-500">
        Project ID is missing. Please open this page from a project.
      </main>
    );
  }

  return (
    <main>
      <TaskForm projectId={projectId} />
    </main>
  );
}

export default function TasksPage({ params }: TasksPageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          Loading task form...
        </main>
      }
    >
      <TasksPageContent params={params} />
    </Suspense>
  );
}
