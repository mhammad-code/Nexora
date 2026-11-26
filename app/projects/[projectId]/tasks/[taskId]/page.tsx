
"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: {
    name: string;
    email: string;
  } | null;
  createdBy: {
    name: string;
    email: string;
  };
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTask() {
      try {
        const { taskId } = await params;

        const response = await fetch(
          `/api/tasks/${encodeURIComponent(taskId)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load task.");
        }

        setTask(data.task);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTask();
  }, [params]);

  if (loading) return <p className="p-6">Loading task...</p>;

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  if (!task) return <p className="p-6">Task not found.</p>;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <p className="text-sm text-gray-500">Task Details</p>
        <h1 className="mt-2 text-3xl font-bold">{task.title}</h1>
      </div>

      <section className="space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="font-semibold">Description</h2>
          <p className="mt-2 text-gray-600">
            {task.description || "No description provided."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="font-semibold">Status</h2>
            <p className="mt-1">{task.status}</p>
          </div>

          <div>
            <h2 className="font-semibold">Priority</h2>
            <p className="mt-1">{task.priority}</p>
          </div>

          <div>
            <h2 className="font-semibold">Assignee</h2>
            <p className="mt-1">
              {task.assignee?.name || "Unassigned"}
            </p>
          </div>

          <div>
            <h2 className="font-semibold">Created By</h2>
            <p className="mt-1">{task.createdBy.name}</p>
          </div>

          <div>
            <h2 className="font-semibold">Due Date</h2>
            <p className="mt-1">
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "No due date"}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
