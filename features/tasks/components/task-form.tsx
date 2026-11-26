
"use client";

import { useState } from "react";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const isEditing = Boolean(task?.id);

    const response = await fetch(
        isEditing ? `/api/tasks/${task!.id}` : "/api/tasks",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(isEditing ? {} : { projectId }),
            title,
            description,
            status,
            priority,
            dueDate: dueDate || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Something went wrong.");
        return;
      }

      setMessage(
        isEditing
          ? "Task updated successfully!"
          : "Task created successfully!"
      );

      if (!isEditing) {
        setTitle("");
        setDescription("");
        setStatus("TODO");
        setPriority("MEDIUM");
        setDueDate("");
      }
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label htmlFor="title" className="block mb-1 font-medium">
          Task Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="w-full rounded border p-2"
          placeholder="Enter task title"
        />
      </div>

      <div>
        <label htmlFor="description" className="block mb-1 font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded border p-2"
          rows={4}
          placeholder="Describe your task"
        />
      </div>

      <div>
        <label htmlFor="status" className="block mb-1 font-medium">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as TaskStatus)
          }
          className="w-full rounded border p-2"
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>
      </div>

      <div>
        <label htmlFor="priority" className="block mb-1 font-medium">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as TaskPriority)
          }
          className="w-full rounded border p-2"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      <div>
        <label htmlFor="dueDate" className="block mb-1 font-medium">
          Due Date
        </label>
        <input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="w-full rounded border p-2"
        />
      </div>

      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading
          ? "Saving..."
          : task
            ? "Update Task"
            : "Create Task"}
      </button>
    </form>
  );
}
