
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading project overview...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="rounded-xl bg-white p-8 text-center">
          <p className="text-red-600">
            {error || "Project not found."}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { project, statistics } = data;

  const taskStatuses = [
    { label: "To Do", count: statistics.taskCounts.TODO },
    { label: "In Progress", count: statistics.taskCounts.IN_PROGRESS },
    { label: "In Review", count: statistics.taskCounts.IN_REVIEW },
    { label: "Done", count: statistics.taskCounts.DONE },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-medium text-blue-400">
              {project.key}
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              {project.name}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              {project.description || "No project description provided."}
            </p>
          </div>

          <span className="w-fit rounded-full bg-blue-500/15 px-4 py-2 text-sm text-blue-300">
            {project.status.replaceAll("_", " ")}
          </span>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Total Tasks</p>
            <h2 className="mt-3 text-3xl font-bold">
              {statistics.totalTasks}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Project Members</p>
            <h2 className="mt-3 text-3xl font-bold">
              {statistics.totalMembers}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Completed Tasks</p>
            <h2 className="mt-3 text-3xl font-bold">
              {statistics.taskCounts.DONE}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Progress</p>
            <h2 className="mt-3 text-3xl font-bold">
              {statistics.progress}%
            </h2>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Project Progress</h2>
            <span className="text-sm text-blue-400">
              {statistics.progress}%
            </span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${statistics.progress}%` }}
            />
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Task Status</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {taskStatuses.map((status) => (
              <div
                key={status.label}
                className="rounded-lg bg-slate-800 p-4"
              >
                <p className="text-sm text-slate-400">{status.label}</p>
                <p className="mt-2 text-2xl font-bold">{status.count}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Project Details</h2>

            <div className="mt-5 space-y-5">
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

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Project Members ({statistics.totalMembers})
            </h2>

            <div className="mt-5 space-y-4">
              {project.members.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No members added yet.
                </p>
              ) : (
                project.members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 font-semibold text-blue-300">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-sm text-slate-400">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function ProjectOverviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading project overview...
        </main>
      }
    >
      <ProjectOverviewContent />
    </Suspense>
  );
}
