
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Task = {
  id: string;
  key?: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: {
    name: string;
    email: string;
  } | null;
};

type TaskListProps = {
  projectId: string;
};

const columns = [
  {
    status: "TODO",
    title: "To Do",
    color: "bg-slate-400",
    badge: "bg-slate-500/10 text-slate-300",
  },
  {
    status: "IN_PROGRESS",
    title: "In Progress",
    color: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-400",
  },
  {
    status: "IN_REVIEW",
    title: "In Review",
    color: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-400",
  },
  {
    status: "DONE",
    title: "Done",
    color: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400",
  },
];

function getPriorityStyle(priority: string) {
  switch (priority) {
    case "URGENT":
      return "bg-red-500/10 text-red-400";
    case "HIGH":
      return "bg-orange-500/10 text-orange-400";
    case "MEDIUM":
      return "bg-amber-500/10 text-amber-400";
    default:
      return "bg-slate-500/10 text-slate-400";
  }
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function TaskList({ projectId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/tasks?projectId=${encodeURIComponent(projectId)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load tasks.");
        }

        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [projectId, refresh]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.key ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const completedTasks = tasks.filter(
    (task) => task.status === "DONE"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "IN_PROGRESS"
  ).length;

  const todoTasks = tasks.filter(
    (task) => task.status === "TODO"
  ).length;

  const reviewTasks = tasks.filter(
    (task) => task.status === "IN_REVIEW"
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#080e1c] text-slate-400">
        Loading your tasks...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080e1c] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-[1600px]">

        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link
              href={`/projects/${projectId}`}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              ← Back to Project
            </Link>

            <h1 className="mt-5 text-3xl font-bold tracking-tight">
              Kanban Board
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Organize and track your project tasks across different stages.
            </p>
          </div>

          <Link
            href={`/projects/${projectId}/tasks`}
            className="w-fit rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            + Create Task
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>

            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
              className="rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Tasks",
              count: tasks.length,
              color: "text-white",
            },
            {
              label: "To Do",
              count: todoTasks,
              color: "text-slate-300",
            },
            {
              label: "In Progress",
              count: inProgressTasks,
              color: "text-blue-400",
            },
            {
              label: "Completed",
              count: completedTasks,
              color: "text-emerald-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <h2 className={`mt-3 text-3xl font-bold ${item.color}`}>
                {item.count}
              </h2>
            </div>
          ))}
        </section>

        {/* Search and Filter */}
        <section className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Project Board</h2>
            <p className="mt-1 text-sm text-slate-400">
              {filteredTasks.length} of {tasks.length} tasks displayed
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        </section>

        {/* Kanban Columns */}
        <section className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(
              (task) => task.status === column.status
            );

            return (
              <div
                key={column.status}
                className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
              >
                {/* Column Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${column.color}`}
                    />

                    <h3 className="font-semibold">
                      {column.title}
                    </h3>
                  </div>

                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${column.badge}`}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task Cards */}
                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${projectId}/tasks/${task.id}`}
                      className="block rounded-xl border border-slate-800 bg-[#111b2d] p-4 transition hover:-translate-y-0.5 hover:border-blue-500/50 hover:bg-slate-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500">
                          {task.key || `#${task.id.slice(0, 8)}`}
                        </span>

                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${getPriorityStyle(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      <h4 className="mt-3 text-sm font-semibold leading-6 text-slate-100">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                        {/* Assignee */}
                        {task.assignee ? (
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
                              {task.assignee.name.charAt(0).toUpperCase()}
                            </div>

                            <span className="truncate text-xs text-slate-400">
                              {task.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Unassigned
                          </span>
                        )}

                        {/* Due Date */}
                        {task.dueDate && (
                          <span className="text-[11px] text-slate-500">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}

                  {/* Empty Column */}
                  {columnTasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center">
                      <p className="text-2xl text-slate-700">▤</p>
                      <p className="mt-3 text-xs font-medium text-slate-500">
                        No tasks here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <footer className="mt-10 text-center text-xs text-slate-600">
          Nexora · Project Task Management
        </footer>
      </div>
    </main>
  );
}
