
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

function getStatusStyle(status: string) {
  switch (status) {
    case "DONE":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "IN_PROGRESS":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "IN_REVIEW":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case "URGENT":
      return "text-red-400";
    case "HIGH":
      return "text-orange-400";
    case "MEDIUM":
      return "text-amber-400";
    default:
      return "text-slate-400";
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
    const matchesSearch = task.title
      .toLowerCase()
      .includes(search.toLowerCase());

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

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading your tasks...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080e1c] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link
              href={`/projects/${projectId}`}
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Back to Project
            </Link>

            <h1 className="mt-5 text-3xl font-bold tracking-tight">
              Tasks
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage and track all tasks in this project.
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
              onClick={() => setRefresh((value) => value + 1)}
              className="rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Task Table */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          {/* Table Header */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">All Tasks</h2>
              <p className="mt-1 text-sm text-slate-400">
                {filteredTasks.length} tasks displayed
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          {/* Empty State */}
          {filteredTasks.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                ▤
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                {tasks.length === 0
                  ? "No tasks yet"
                  : "No matching tasks"}
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                {tasks.length === 0
                  ? "Create your first task to start managing this project."
                  : "Try changing your search or status filter."}
              </p>

              {tasks.length === 0 && (
                <Link
                  href={`/projects/${projectId}/tasks`}
                  className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
                >
                  + Create Your First Task
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Task</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Assignee</th>
                    <th className="px-6 py-4">Due Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="transition hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-5">
                        <Link
                          href={`/projects/${projectId}/tasks/${task.id}`}
                          className="font-medium text-white transition hover:text-blue-400"
                        >
                          {task.title}
                        </Link>

                        <p className="mt-1 text-xs text-slate-500">
                          {task.key || `ID: ${task.id.slice(0, 8)}`}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusStyle(task.status)}`}
                        >
                          {formatLabel(task.status)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className={`text-sm font-semibold ${getPriorityStyle(task.priority)}`}>
                          {formatLabel(task.priority)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {task.assignee ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
                              {task.assignee.name.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <p className="text-sm font-medium">
                                {task.assignee.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {task.assignee.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-400">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : "No due date"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-slate-600">
          Nexora · Project Task Management
        </footer>
      </div>
    </main>
  );
}
