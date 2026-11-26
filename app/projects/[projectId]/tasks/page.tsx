
"use client";

import { useState, type FormEvent } from "react";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
};

type TaskFormProps = {
  projectId: string;
  task?: Task;
};

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function TaskForm({ projectId, task }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "MEDIUM"
  );
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? task.dueDate.slice(0, 10) : ""
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const taskId = task?.id;

      const response = await fetch(
        taskId ? `/api/tasks/${taskId}` : "/api/tasks",
        {
          method: taskId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(taskId ? {} : { projectId }),
            title: title.trim(),
            description: description.trim(),
            status,
            priority,
            dueDate: dueDate || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to save task.");
        return;
      }

      setSuccess(true);
      setMessage(
        taskId
          ? "Task updated successfully."
          : "Task created successfully."
      );

      if (!taskId) {
        setTitle("");
        setDescription("");
        setStatus("TODO");
        setPriority("MEDIUM");
        setDueDate("");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#172B4D]">
      <header className="flex h-16 items-center justify-between border-b border-slate-700 bg-[#172B4D] px-5 text-white sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-lg font-bold">
            N
          </div>
          <span className="text-xl font-bold tracking-tight">Nexora</span>
          <span className="hidden text-sm text-slate-400 sm:inline">
            / Project Management
          </span>
        </div>

        <span className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
          Workspace
        </span>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-7">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
            <span>Projects</span>
            <span>/</span>
            <span>Tasks</span>
            <span>/</span>
            <span className="font-medium text-blue-700">
              {task ? "Edit task" : "Create task"}
            </span>
          </div>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                Task management
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
                {task ? "Edit task" : "Create an issue"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {task
                  ? "Update the details and keep your project moving."
                  : "Add a new task and organize your team's work."}
              </p>
            </div>

            <span className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              {task ? "EDIT MODE" : "NEW TASK"}
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(9,30,66,0.07)]"
        >
          <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
            <h2 className="text-base font-bold text-[#172B4D]">
              Task details
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter the information needed to create this task.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_290px]">
            <section className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-semibold text-[#172B4D]"
                >
                  Summary <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={150}
                  placeholder="What needs to be done?"
                  className={fieldClass}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Keep the title short and easy to understand.
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-semibold text-[#172B4D]"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  maxLength={5000}
                  placeholder="Add a detailed description, requirements or acceptance criteria..."
                  className={`${fieldClass} resize-y leading-6`}
                />
              </div>

              <div>
                <label
                  htmlFor="dueDate"
                  className="mb-2 block text-sm font-semibold text-[#172B4D]"
                >
                  Due date
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={fieldClass}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  When should this task be completed?
                </p>
              </div>
            </section>

            <aside className="space-y-5 rounded-xl border border-slate-200 bg-[#F8F9FB] p-4 sm:p-5">
              <div>
                <h3 className="mb-4 text-sm font-bold text-[#172B4D]">
                  Task configuration
                </h3>
                <div className="mb-5 h-px bg-slate-200" />

                <label
                  htmlFor="status"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Status
                </label>

                <select
                  id="status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as TaskStatus)
                  }
                  className={fieldClass}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Priority
                </label>

                <select
                  id="priority"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as TaskPriority)
                  }
                  className={fieldClass}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { value: "LOW", color: "bg-slate-200 text-slate-700" },
                    { value: "MEDIUM", color: "bg-blue-100 text-blue-700" },
                    { value: "HIGH", color: "bg-orange-100 text-orange-700" },
                    { value: "URGENT", color: "bg-red-100 text-red-700" },
                  ].map((item) => (
                    <span
                      key={item.value}
                      className={`rounded px-2 py-1 text-[10px] font-bold ${item.color}`}
                    >
                      {item.value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-800">
                  Keep your team aligned
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Set a clear status, priority and deadline to make work easier
                  to track.
                </p>
              </div>
            </aside>
          </div>

          {message && (
            <div
              role="status"
              className={`mx-5 mb-5 rounded-lg border px-4 py-3 text-sm sm:mx-8 ${
                success
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-[#FAFBFC] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-xs text-slate-400">
              <span className="text-red-500">*</span> Required field
            </p>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#0C66E4] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0055CC] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : task
                  ? "Save changes"
                  : "Create task"}
            </button>
          </footer>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Powered by Nexora · Project Management
        </p>
      </main>
    </div>
  );
}
