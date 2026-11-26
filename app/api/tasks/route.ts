
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

// ============================================
// GET: Retrieve filtered and paginated tasks
// ============================================

export async function GET(request: Request) {
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

    // 2. Read query parameters
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("projectId");
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const dueDateFilter = searchParams.get("dueDate");

    const pageValue = searchParams.get("page") ?? "1";
    const limitValue = searchParams.get("limit") ?? "10";

    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";

    // 3. Validate project ID
    if (!projectId?.trim()) {
      return NextResponse.json(
        { message: "Project ID is required." },
        { status: 400 }
      );
    }

    // 4. Validate status
    if (
      status &&
      !Object.values(TaskStatus).some((value) => value === status)
    ) {
      return NextResponse.json(
        { message: "Invalid task status filter." },
        { status: 400 }
      );
    }

    // 5. Validate priority
    if (
      priority &&
      !Object.values(TaskPriority).some((value) => value === priority)
    ) {
      return NextResponse.json(
        { message: "Invalid task priority filter." },
        { status: 400 }
      );
    }

    // 6. Validate search
    if (search.length > 100) {
      return NextResponse.json(
        { message: "Search cannot exceed 100 characters." },
        { status: 400 }
      );
    }

    // 7. Validate pagination
    if (
      !/^\d+$/.test(pageValue) ||
      !/^\d+$/.test(limitValue)
    ) {
      return NextResponse.json(
        { message: "Page and limit must be positive integers." },
        { status: 400 }
      );
    }

    const page = Number(pageValue);
    const limit = Number(limitValue);

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid pagination values. Limit must be between 1 and 100.",
        },
        { status: 400 }
      );
    }

    // 8. Validate sorting
    const allowedSortFields = [
      "title",
      "priority",
      "dueDate",
      "createdAt",
    ];

    if (
      !allowedSortFields.includes(sortBy) ||
      !["asc", "desc"].includes(sortOrder)
    ) {
      return NextResponse.json(
        { message: "Invalid sorting parameters." },
        { status: 400 }
      );
    }

    // 9. Validate due-date filter
    const allowedDueDateFilters = [
      "OVERDUE",
      "TODAY",
      "UPCOMING",
      "NO_DATE",
    ];

    if (
      dueDateFilter &&
      !allowedDueDateFilters.includes(dueDateFilter)
    ) {
      return NextResponse.json(
        { message: "Invalid due-date filter." },
        { status: 400 }
      );
    }

    // 10. Find project
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 }
      );
    }

    // 11. Check project access
    const role = await getWorkspaceRole(
      session.user.id,
      project.workspaceId
    );

    const isMember = await isProjectMember(
      session.user.id,
      project.id
    );

    if (!canAccessProject(role, isMember)) {
      return NextResponse.json(
        {
          message: "You are not allowed to view this project's tasks.",
        },
        { status: 403 }
      );
    }

    // 12. Verify assignee belongs to this project
    if (assigneeId) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: assigneeId,
            projectId: project.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          {
            message: "Selected assignee is not a project member.",
          },
          { status: 400 }
        );
      }
    }

    // 13. Prepare due-date boundaries (UTC)
    const now = new Date();

    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

    const tomorrowStart = new Date(
      todayStart.getTime() + 24 * 60 * 60 * 1000
    );

    // 14. Build database filters
    const where = {
      projectId: project.id,

      // Exclude archived tasks from active task lists
      archivedAt: null,

      ...(status
        ? { status: status as TaskStatus }
        : {}),

      ...(priority
        ? { priority: priority as TaskPriority }
        : {}),

      ...(assigneeId
        ? { assigneeId }
        : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                key: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(dueDateFilter === "OVERDUE"
        ? {
            dueDate: {
              lt: todayStart,
            },
          }
        : {}),

      ...(dueDateFilter === "TODAY"
        ? {
            dueDate: {
              gte: todayStart,
              lt: tomorrowStart,
            },
          }
        : {}),

      ...(dueDateFilter === "UPCOMING"
        ? {
            dueDate: {
              gte: tomorrowStart,
            },
          }
        : {}),

      ...(dueDateFilter === "NO_DATE"
        ? {
            dueDate: null,
          }
        : {}),
    };

    // 15. Prepare sorting
    let orderBy;

    switch (sortBy) {
      case "title":
        orderBy = { title: sortOrder as "asc" | "desc" };
        break;

      case "priority":
        orderBy = { priority: sortOrder as "asc" | "desc" };
        break;

      case "dueDate":
        orderBy = { dueDate: sortOrder as "asc" | "desc" };
        break;

      default:
        orderBy = { createdAt: sortOrder as "asc" | "desc" };
    }

    // 16. Count matching tasks and retrieve current page
    const [total, tasks] = await Promise.all([
      prisma.task.count({
        where,
      }),

      prisma.task.findMany({
        where,
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
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // 17. Return results
    return NextResponse.json(
      {
        message: "Tasks retrieved successfully.",
        total,
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Task retrieval error:", error);

    return NextResponse.json(
      {
        message: "Something went wrong while retrieving tasks.",
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Create a task or subtask with automatic key
// ============================================

export async function POST(request: Request) {
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

    // 2. Read and validate request body
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

    const {
      projectId,
      title,
      description,
      status,
      priority,
      dueDate,
      assigneeId,
      parentId,
    } = body;

    // 3. Validate fields
    const errors: Record<string, string> = {};

    if (typeof projectId !== "string" || !projectId.trim()) {
      errors.projectId = "Project ID is required.";
    }

    if (typeof title !== "string" || !title.trim()) {
      errors.title = "Task title is required.";
    }

    if (typeof title === "string" && title.trim().length > 200) {
      errors.title = "Task title cannot exceed 200 characters.";
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
      errors.description =
        "Description cannot exceed 5000 characters.";
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

    // Normalize optional IDs
    const normalizedAssigneeId =
      typeof assigneeId === "string" ? assigneeId.trim() : null;

    const normalizedParentId =
      typeof parentId === "string" ? parentId.trim() : null;

    // 4. Find project
    const project = await prisma.project.findUnique({
      where: {
        id: (projectId as string).trim(),
      },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 }
      );
    }

    // 5. Check project permissions
    const role = await getWorkspaceRole(
      session.user.id,
      project.workspaceId
    );

    const isMember = await isProjectMember(
      session.user.id,
      project.id
    );

    if (!canAccessProject(role, isMember)) {
      return NextResponse.json(
        {
          message: "You are not allowed to create tasks in this project.",
        },
        { status: 403 }
      );
    }

    // 6. Verify assignee belongs to this project
    if (normalizedAssigneeId) {
      const assigneeMembership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: normalizedAssigneeId,
            projectId: project.id,
          },
        },
      });

      if (!assigneeMembership) {
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

    // 7. Verify parent task belongs to the same project
    if (normalizedParentId) {
      const parentTask = await prisma.task.findUnique({
        where: {
          id: normalizedParentId,
        },
        select: {
          id: true,
          projectId: true,
          archivedAt: true,
        },
      });

      if (
        !parentTask ||
        parentTask.projectId !== project.id ||
        parentTask.archivedAt !== null
      ) {
        return NextResponse.json(
          {
            message:
              "Parent task must be active and belong to the same project.",
            errors: {
              parentId: "Invalid parent task for this project.",
            },
          },
          { status: 400 }
        );
      }
    }

    // 8. Generate task key and create task atomically
    const task = await prisma.$transaction(async (tx) => {
      // Atomically increment the project's task counter
      const updatedProject = await tx.project.update({
        where: {
          id: project.id,
        },
        data: {
          nextTaskNumber: {
            increment: 1,
          },
        },
        select: {
          key: true,
          nextTaskNumber: true,
        },
      });

      // Reserve the generated number
      const taskNumber = updatedProject.nextTaskNumber - 1;

      // Generate project-specific task key
      const generatedKey = `${updatedProject.key}-${taskNumber}`;

      // Create task or subtask
      return tx.task.create({
        data: {
          key: generatedKey,
          title: (title as string).trim(),
          description:
            typeof description === "string"
              ? description.trim() || null
              : null,
          status:
            (status as TaskStatus | undefined) ?? TaskStatus.TODO,
          priority:
            (priority as TaskPriority | undefined) ?? TaskPriority.MEDIUM,
          dueDate: parsedDueDate,
          projectId: project.id,
          createdById: session.user.id,
          assigneeId: normalizedAssigneeId,
          parentId: normalizedParentId,
        },
      });
    });

    // 9. Return created task
    return NextResponse.json(
      {
        message: normalizedParentId
          ? "Subtask created successfully."
          : "Task created successfully.",
        task,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Task creation error:", error);

    return NextResponse.json(
      {
        message: "Something went wrong while creating the task.",
      },
      { status: 500 }
    );
  }
}
