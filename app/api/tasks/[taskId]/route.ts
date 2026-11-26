
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getWorkspaceRole,
  isProjectMember,
  canAccessProject,
} from "@/lib/permissions";
import {
  TaskPriority,
  TaskStatus,
} from "@/lib/generated/prisma/enums";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { taskId } = await params;

    if (!taskId?.trim()) {
      return NextResponse.json(
        { message: "Task ID is required." },
        { status: 400 }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, workspaceId: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { message: "Task not found." },
        { status: 404 }
      );
    }

    const role = await getWorkspaceRole(
      session.user.id,
      task.project.workspaceId
    );

    const isMember = await isProjectMember(
      session.user.id,
      task.projectId
    );

    if (!canAccessProject(role, isMember)) {
      return NextResponse.json(
        { message: "You are not allowed to view this task." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        message: "Task retrieved successfully.",
        task,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Task retrieval error:", error);

    return NextResponse.json(
      { message: "Something went wrong while retrieving the task." },
      { status: 500 }
    );
  }
}


// PATCH: Update an existing task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 1. Authenticate the user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { taskId } = await params;

    if (!taskId?.trim()) {
      return NextResponse.json(
        { message: "Task ID is required." },
        { status: 400 }
      );
    }

    // 2. Read request body
    let body: Record<string, unknown>;

    try {
      const parsed = await request.json();

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return NextResponse.json(
          { message: "Invalid request body." },
          { status: 400 }
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // 3. Allow only editable fields
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "assigneeId",
    ];

    const unknownFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (unknownFields.length > 0) {
      return NextResponse.json(
        {
          message: "Request contains unsupported fields.",
          errors: Object.fromEntries(
            unknownFields.map((field) => [
              field,
              "This field cannot be updated.",
            ])
          ),
        },
        { status: 400 }
      );
    }

    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { message: "At least one field is required." },
        { status: 400 }
      );
    }

    // 4. Validate supplied fields
    const errors: Record<string, string> = {};

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assigneeId,
    } = body;

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        errors.title = "Task title cannot be empty.";
      } else if (title.trim().length > 200) {
        errors.title = "Task title cannot exceed 200 characters.";
      }
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      errors.description = "Description must be a string.";
    }

    if (
      typeof description === "string" &&
      description.length > 5000
    ) {
      errors.description = "Description cannot exceed 5000 characters.";
    }

    if (
      status !== undefined &&
      !Object.values(TaskStatus).some((value) => value === status)
    ) {
      errors.status = "Invalid task status.";
    }

    if (
      priority !== undefined &&
      !Object.values(TaskPriority).some((value) => value === priority)
    ) {
      errors.priority = "Invalid task priority.";
    }

    if (
      assigneeId !== undefined &&
      assigneeId !== null &&
      (typeof assigneeId !== "string" || !assigneeId.trim())
    ) {
      errors.assigneeId = "Invalid assignee ID.";
    }

    let parsedDueDate: Date | null = null;

    if (dueDate !== undefined && dueDate !== null) {
      if (
        typeof dueDate !== "string" ||
        !dueDate.trim() ||
        Number.isNaN(Date.parse(dueDate))
      ) {
        errors.dueDate = "A valid due date is required.";
      } else {
        parsedDueDate = new Date(dueDate);
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          message: "Validation failed.",
          errors,
        },
        { status: 400 }
      );
    }

    // 5. Find the task and its project
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        project: {
          select: {
            id: true,
            workspaceId: true,
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { message: "Task not found." },
        { status: 404 }
      );
    }

    // 6. Check project access
    const role = await getWorkspaceRole(
      session.user.id,
      existingTask.project.workspaceId
    );

    const isMember = await isProjectMember(
      session.user.id,
      existingTask.project.id
    );

    if (!canAccessProject(role, isMember)) {
      return NextResponse.json(
        { message: "You are not allowed to update this task." },
        { status: 403 }
      );
    }

    // 7. Verify the new assignee belongs to this project
    if (typeof assigneeId === "string") {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: assigneeId,
            projectId: existingTask.project.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          {
            message: "Assignee must be a member of this project.",
            errors: {
              assigneeId: "Selected user is not a project member.",
            },
          },
          { status: 400 }
        );
      }
    }

    // 8. Update only the supplied fields
    const data = {
      ...(title !== undefined
        ? { title: (title as string).trim() }
        : {}),
      ...(description !== undefined
        ? {
            description:
              typeof description === "string"
                ? description.trim() || null
                : null,
          }
        : {}),
      ...(status !== undefined
        ? { status: status as TaskStatus }
        : {}),
      ...(priority !== undefined
        ? { priority: priority as TaskPriority }
        : {}),
      ...(dueDate !== undefined
        ? { dueDate: parsedDueDate }
        : {}),
      ...(assigneeId !== undefined
        ? {
            assigneeId:
              typeof assigneeId === "string" ? assigneeId : null,
          }
        : {}),
    };

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
    });

    return NextResponse.json(
      {
        message: "Task updated successfully.",
        task: updatedTask,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Task update error:", error);

    return NextResponse.json(
      { message: "Something went wrong while updating the task." },
      { status: 500 }
    );
  }
}
