
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

// GET: Retrieve one active task with its parent and active subtasks
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

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        archivedAt: null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            workspaceId: true,
          },
        },
        parent: {
          select: {
            id: true,
            key: true,
            title: true,
            status: true,
            priority: true,
            archivedAt: true,
          },
        },
        subtasks: {
          where: {
            archivedAt: null,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            key: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
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
      {
        message: "Something went wrong while retrieving the task.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing active task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 1. Authenticate user
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
      const parsed: unknown = await request.json();

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

    // 3. Allow only supported fields
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "assigneeId",
      "parentId",
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
      parentId,
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

    if (
      parentId !== undefined &&
      parentId !== null &&
      (typeof parentId !== "string" || !parentId.trim())
    ) {
      errors.parentId = "Invalid parent task ID.";
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

    // 5. Find existing task and project
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        archivedAt: true,
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

    // 6. Prevent updates to archived tasks
    if (existingTask.archivedAt) {
      return NextResponse.json(
        { message: "Archived tasks cannot be updated." },
        { status: 409 }
      );
    }

    // 7. Check project permissions
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

    // 8. Verify assignee belongs to this project
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

    // 9. Validate parent task and prevent circular relationships
    if (typeof parentId === "string") {
      if (parentId === taskId) {
        return NextResponse.json(
          {
            message: "A task cannot be its own parent.",
            errors: {
              parentId: "A task cannot be its own parent.",
            },
          },
          { status: 400 }
        );
      }

      let currentParentId: string | null = parentId;
      const visited = new Set<string>();

      while (currentParentId !== null) {
        if (currentParentId === taskId) {
          return NextResponse.json(
            {
              message:
                "This parent relationship would create a circular relationship.",
              errors: {
                parentId:
                  "Circular parent-child relationships are not allowed.",
              },
            },
            { status: 400 }
          );
        }

        if (visited.has(currentParentId)) {
          return NextResponse.json(
            {
              message:
                "The proposed parent hierarchy contains a circular relationship.",
            },
            { status: 400 }
          );
        }

        visited.add(currentParentId);

        const parentTask: {
  id: string;
  projectId: string;
  parentId: string | null;
  archivedAt: Date | null;
} | null = await prisma.task.findUnique({
  where: {
    id: currentParentId,
  },
  select: {
    id: true,
    projectId: true,
    parentId: true,
    archivedAt: true,
  },
});
        if (!parentTask) {
          return NextResponse.json(
            {
              message: "Parent task not found.",
              errors: {
                parentId: "The selected parent task does not exist.",
              },
            },
            { status: 400 }
          );
        }

        if (parentTask.archivedAt) {
          return NextResponse.json(
            {
              message: "An archived task cannot be selected as a parent.",
              errors: {
                parentId: "The selected parent task is archived.",
              },
            },
            { status: 400 }
          );
        }

        if (parentTask.projectId !== existingTask.project.id) {
          return NextResponse.json(
            {
              message: "Parent task must belong to the same project.",
              errors: {
                parentId:
                  "Cross-project parent relationships are not allowed.",
              },
            },
            { status: 400 }
          );
        }

        currentParentId = parentTask.parentId;
      }
    }

    // 10. Build update data
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
      ...(parentId !== undefined
        ? {
            parentId:
              typeof parentId === "string" ? parentId : null,
          }
        : {}),
    };

    // 11. Update task
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
      {
        message: "Something went wrong while updating the task.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Archive a task and all its subtasks
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get and validate task ID
    const { taskId } = await params;

    if (!taskId?.trim()) {
      return NextResponse.json(
        { message: "Task ID is required." },
        { status: 400 }
      );
    }

    // 3. Find task and its workspace
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        archivedAt: true,
        project: {
          select: {
            id: true,
            workspaceId: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { message: "Task not found." },
        { status: 404 }
      );
    }

    // 4. Check permissions
    const role = await getWorkspaceRole(
      session.user.id,
      task.project.workspaceId
    );

    const isMember = await isProjectMember(
      session.user.id,
      task.project.id
    );

    if (!canAccessProject(role, isMember)) {
      return NextResponse.json(
        { message: "You are not allowed to archive this task." },
        { status: 403 }
      );
    }

    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json(
        {
          message: "Only workspace owners and admins can archive tasks.",
        },
        { status: 403 }
      );
    }

    // 5. Prevent archiving an already archived task
    if (task.archivedAt) {
      return NextResponse.json(
        { message: "This task is already archived." },
        { status: 409 }
      );
    }

    // 6. Find all subtasks recursively
    const descendantIds: string[] = [];
    let parentIds = [taskId];

    while (parentIds.length > 0) {
      const children = await prisma.task.findMany({
        where: {
          projectId: task.project.id,
          parentId: { in: parentIds },
        },
        select: {
          id: true,
        },
      });

      const childIds = children.map((child) => child.id);

      if (childIds.length === 0) {
        break;
      }

      descendantIds.push(...childIds);
      parentIds = childIds;
    }

    // 7. Archive parent and all descendants together
    const archivedAt = new Date();

    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: { archivedAt },
      }),

      prisma.task.updateMany({
        where: {
          id: { in: descendantIds },
          archivedAt: null,
        },
        data: { archivedAt },
      }),
    ]);

    return NextResponse.json(
      {
        message: "Task and its subtasks archived successfully.",
        archivedTaskId: taskId,
        archivedSubtasksCount: descendantIds.length,
        archivedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Task archive error:", error);

    return NextResponse.json(
      {
        message: "Something went wrong while archiving the task.",
      },
      { status: 500 }
    );
  }
}
