
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

const priorities = [
  { value: "LOW", description: "Minor importance", color: "border-slate-300 bg-slate-50 text-slate-700" },
  { value: "MEDIUM", description: "Normal importance", color: "border-blue-300 bg-blue-50 text-blue-700" },
  { value: "HIGH", description: "High importance", color: "border-orange-300 bg-orange-50 text-orange-700" },
  { value: "URGENT", description: "Needs immediate attention", color: "border-red-300 bg-red-50 text-red-700" },
];

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
    if (saving) return;

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
          body: JSON.stringify({ status, priority }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update task.");
      }

      setTask((current) =>
        current ? { ...current, status, priority } : current
      );

      setIsEditing(false);
      setSuccess("Your task has been updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p className="text-slate-500">Loading task...</p>
      </main>
    );
  }

  if (error && !task) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  if (!task) return <p className="p-6">Task not found.</p>;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Nexora / Task Management
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {task.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              View and manage your task details.
            </p>
          </div>

          <button
            type="button"
            onClick={startEditing}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <span className="mr-2">✎</span>
            Edit Task
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Task Details */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-semibold text-slate-900">Task Overview</h2>
            <p className="mt-1 text-sm text-slate-500">
              General information about this task.
            </p>
          </div>

          <div className="space-y-7 p-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Description
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {task.description || "No description provided."}
              </p>
            </div>

            <div className="grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>
                <p className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                  {task.status.replace("_", " ")}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Priority
                </p>
                <p className="mt-2 inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700">
                  {task.priority}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Assignee
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {task.assignee?.name || "Unassigned"}
                </p>
                {task.assignee?.email && (
                  <p className="mt-1 text-xs text-slate-500">
                    {task.assignee.email}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Created By
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {task.createdBy.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.createdBy.email}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Due Date
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : "No due date"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Task Modal */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelEditing();
            }
          }}
        >
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Edit Task
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update the status and priority of this task.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  aria-label="Close edit dialog"
                  className="rounded-lg p-2 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave}>
              <div className="space-y-6 px-6 py-6">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Task Status
                  </label>

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {item.replace("_", " ")}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-slate-400">
                    Choose the current progress of your task.
                  </p>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-700">
                    Task Priority
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {priorities.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setPriority(item.value)}
                        className={`rounded-xl border p-3 text-left transition ${
                          priority === item.value
                            ? `${item.color} ring-2 ring-blue-500 ring-offset-1`
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          {item.value}
                        </span>
                        <span className="mt-1 block text-xs opacity-75">
                          {item.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
