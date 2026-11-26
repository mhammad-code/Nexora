
"use client";

import { useEffect, useState, type FormEvent } from "react";

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

const statuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

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

  function startEditing() {
    if (!task) return;

    setStatus(task.status);
    setPriority(task.priority);
    setError("");
    setSuccess("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setError("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!task) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { taskId } = await params;

      const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            priority,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update task.");
      }

      setTask((currentTask) =>
        currentTask
          ? {
              ...currentTask,
              status,
              priority,
            }
          : currentTask
      );

      setIsEditing(false);
      setSuccess("Task updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6">Loading task...</p>;

  if (error && !task) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  if (!task) return <p className="p-6">Task not found.</p>;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Task Details</p>
          <h1 className="mt-2 text-3xl font-bold">{task.title}</h1>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit Task
          </button>
        )}
      </div>

      {success && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="font-semibold">Description</h2>
          <p className="mt-2 text-gray-600">
            {task.description || "No description provided."}
          </p>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block font-semibold"
                >
                  Status
                </label>

                <select
                  id="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-lg border bg-white p-3"
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="mb-2 block font-semibold"
                >
                  Priority
                </label>

                <select
                  id="priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="w-full rounded-lg border bg-white p-3"
                >
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold">Status</h2>
              <p className="mt-1">{task.status.replace("_", " ")}</p>
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
        )}
      </section>
    </main>
  );
}
