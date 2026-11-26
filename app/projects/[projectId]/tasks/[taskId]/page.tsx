
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SubtaskForm from "@/features/tasks/components/subtask-form";

type RelatedTask = {
  id: string;
  key: string | null;
  title: string;
  status: string;
  priority: string;
};

type Subtask = RelatedTask & {
  dueDate: string | null;
  createdAt: string;
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type Task = {
  id: string;
  key: string | null;
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
  parent: RelatedTask | null;
  subtasks: Subtask[];
};

const statuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const priorities = [
  {
    value: "LOW",
    description: "Minor importance",
    color: "border-slate-300 bg-slate-50 text-slate-700",
  },
  {
    value: "MEDIUM",
    description: "Normal importance",
    color: "border-blue-300 bg-blue-50 text-blue-700",
  },
  {
    value: "HIGH",
    description: "High importance",
    color: "border-orange-300 bg-orange-50 text-orange-700",
  },
  {
    value: "URGENT",
    description: "Needs immediate attention",
    color: "border-red-300 bg-red-50 text-red-700",
  },
];

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const [showArchiveConfirmation, setShowArchiveConfirmation] =
    useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTask() {
      try {
        const route = await params;

        if (cancelled) return;

        setProjectId(route.projectId);

        const response = await fetch(
          `/api/tasks/${encodeURIComponent(route.taskId)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load task.");
        }

        if (!cancelled) {
          setTask(data.task);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Something went wrong."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTask();

    return () => {
      cancelled = true;
    };
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

  async function handleArchive() {
    if (!task || archiving) return;

    setArchiving(true);
    setError("");

    try {
      const { taskId } = await params;

      const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to archive task.");
      }

      // Redirect to the Kanban task list, not the Add Task page.
      router.push(
        `/projects/${encodeURIComponent(projectId)}/tasks/list`
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setArchiving(false);
      setShowArchiveConfirmation(false);
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

  if (!task) {
    return <p className="p-6">Task not found.</p>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Nexora / Task Management
            </p>

            {task.key && (
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {task.key}
              </p>
            )}

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {task.title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View and manage your task details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startEditing}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Edit Task
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setShowArchiveConfirmation(true);
              }}
              disabled={archiving}
              className="rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Archive Task
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Task Overview */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-semibold text-slate-900">
              Task Overview
            </h2>
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

        {/* Parent Task */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Parent Task
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            The task this subtask belongs to.
          </p>

          {task.parent ? (
            <Link
              href={`/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.parent.id)}`}
              className="mt-4 block rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="text-xs font-semibold text-blue-600">
                {task.parent.key || "Parent Task"}
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {task.parent.title}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {task.parent.status.replace("_", " ")} · {task.parent.priority}
              </p>
            </Link>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              This task does not have a parent task.
            </p>
          )}
        </section>

        {/* Subtasks */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">
                Subtasks
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Smaller tasks associated with this task.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              {task.subtasks.length}
            </span>
          </div>

          <SubtaskForm
            projectId={projectId}
            parentId={task.id}
          />

          {task.subtasks.length > 0 ? (
            <div className="mt-5 divide-y divide-slate-100">
              {task.subtasks.map((subtask) => (
                <Link
                  key={subtask.id}
                  href={`/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(subtask.id)}`}
                  className="block rounded-lg px-3 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-blue-600">
                        {subtask.key || "Subtask"}
                      </p>

                      <p className="mt-1 font-medium text-slate-900">
                        {subtask.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Assignee: {subtask.assignee?.name || "Unassigned"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-600">
                        {subtask.status.replace("_", " ")}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {subtask.priority}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No subtasks have been created yet.
            </p>
          )}
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

      {/* Archive Confirmation Dialog */}
      {showArchiveConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
              !
            </div>

            <h2
              id="archive-title"
              className="mt-4 text-xl font-bold text-slate-900"
            >
              Archive this task?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to archive{" "}
              <strong>{task.title}</strong>? It will disappear from the
              active task board, but its data will remain محفوظ in the
              database.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={archiving}
                onClick={() => setShowArchiveConfirmation(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={archiving}
                onClick={handleArchive}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {archiving ? "Archiving..." : "Yes, Archive Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
