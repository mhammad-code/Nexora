
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ProjectOverviewData = {
  project: {
    id: string;
    name: string;
    key: string;
    description: string | null;
    status: string;
    startDate: string | null;
    dueDate: string | null;
    members: {
      joinedAt: string;
      user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
      };
    }[];
    _count: {
      tasks: number;
    };
  };
  statistics: {
    totalTasks: number;
    totalMembers: number;
    taskCounts: {
      TODO: number;
      IN_PROGRESS: number;
      IN_REVIEW: number;
      DONE: number;
    };
    progress: number;
  };
};

function formatDate(date: string | null) {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString();
}

function ProjectOverviewContent() {
  const { projectId } = useParams<{ projectId: string }>();

  const [data, setData] = useState<ProjectOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOverview() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to load project.");
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, [projectId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading project overview...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-red-400">{error || "Project not found."}</p>
          <Link
            href="/dashboard"
            className="mt-5 inline-block text-blue-400 hover:text-blue-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { project, statistics } = data;

  const taskStatuses = [
    {
      label: "To Do",
      count: statistics.taskCounts.TODO,
      color: "bg-slate-400",
    },
    {
      label: "In Progress",
      count: statistics.taskCounts.IN_PROGRESS,
      color: "bg-blue-500",
    },
    {
      label: "In Review",
      count: statistics.taskCounts.IN_REVIEW,
      color: "bg-amber-500",
    },
    {
      label: "Done",
      count: statistics.taskCounts.DONE,
      color: "bg-emerald-500",
    },
  ];

  return (
    <main className="min-h-screen bg-[#080e1c] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← Back to Dashboard
          </Link>

          <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300">
            NEXORA WORKSPACE
          </span>
        </div>

        {/* Project Header */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#111d35] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-blue-500/15 px-3 py-1 text-sm font-bold text-blue-400">
                  {project.key}
                </span>

                <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-300">
                  {project.status.replaceAll("_", " ")}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                {project.name}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                {project.description || "No project description provided."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/projects/${project.id}/tasks/list`}
                className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View Tasks
              </Link>

              <Link
                href={`/projects/${project.id}/tasks`}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500"
              >
                + Create Task
              </Link>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Tasks",
              value: statistics.totalTasks,
              icon: "▤",
              color: "text-blue-400",
            },
            {
              label: "Project Members",
              value: statistics.totalMembers,
              icon: "♙",
              color: "text-purple-400",
            },
            {
              label: "Completed Tasks",
              value: statistics.taskCounts.DONE,
              icon: "✓",
              color: "text-emerald-400",
            },
            {
              label: "Project Progress",
              value: `${statistics.progress}%`,
              icon: "↗",
              color: "text-amber-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-slate-600"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{item.label}</p>
                <span className={`text-xl ${item.color}`}>{item.icon}</span>
              </div>
              <h2 className="mt-4 text-3xl font-bold">{item.value}</h2>
            </div>
          ))}
        </section>

        {/* Tasks Section */}
        <section className="mt-8 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-slate-900 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-xl text-blue-400">
                  ▤
                </div>
                <div>
                  <h2 className="text-xl font-bold">Task Management</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Organize, track and manage your project tasks.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300">
                  {statistics.totalTasks} Total Tasks
                </span>
                <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                  {statistics.taskCounts.DONE} Completed
                </span>
                <span className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
                  {statistics.taskCounts.IN_PROGRESS} In Progress
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/projects/${project.id}/tasks/list`}
                className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold transition hover:bg-slate-800"
              >
                View All Tasks →
              </Link>

              <Link
                href={`/projects/${project.id}/tasks`}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                + New Task
              </Link>
            </div>
          </div>
        </section>

        {/* Project Progress */}
        <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Project Progress</h2>
              <p className="mt-1 text-sm text-slate-400">
                Overall task completion
              </p>
            </div>
            <span className="text-2xl font-bold text-blue-400">
              {statistics.progress}%
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, statistics.progress))}%`,
              }}
            />
          </div>
        </section>

        {/* Task Status */}
        <section className="mt-7">
          <h2 className="text-lg font-bold">Task Status Overview</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {taskStatuses.map((status) => (
              <div
                key={status.label}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                  <p className="text-sm text-slate-400">{status.label}</p>
                </div>
                <p className="mt-4 text-2xl font-bold">{status.count}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Details and Members */}
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-bold">Project Details</h2>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-slate-400">Project Name</p>
                <p className="mt-1 font-medium">{project.name}</p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Project Key</p>
                <p className="mt-1 font-medium">{project.key}</p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Start Date</p>
                <p className="mt-1 font-medium">
                  {formatDate(project.startDate)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Due Date</p>
                <p className="mt-1 font-medium">
                  {formatDate(project.dueDate)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Project Members
              </h2>
              <span className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-300">
                {statistics.totalMembers}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {project.members.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No members added yet.
                </p>
              ) : (
                project.members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center gap-3 rounded-xl bg-slate-800/60 p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 font-bold text-blue-300">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="font-medium">{member.user.name}</p>
                      <p className="truncate text-sm text-slate-400">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 py-6 text-center text-sm text-slate-500">
          Nexora Project Management
        </footer>
      </div>
    </main>
  );
}

export default function ProjectOverviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#080e1c] text-slate-300">
          Loading project overview...
        </main>
      }
    >
      <ProjectOverviewContent />
    </Suspense>
  );
}
