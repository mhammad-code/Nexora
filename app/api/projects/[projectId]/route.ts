
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getWorkspaceRole,
  canManageWorkspace,
} from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

// GET: Retrieve project overview
export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Verify session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get project ID
    const { projectId } = await params;

    // 3. Find project and workspace
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 }
      );
    }

    // 4. Check workspace membership
    const role = await getWorkspaceRole(
      session.user.id,
      existingProject.workspaceId
    );

    if (!role) {
      return NextResponse.json(
        { message: "You do not have access to this project." },
        { status: 403 }
      );
    }

    // 5. Fetch project details and members
    const [project, taskGroups] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            orderBy: { joinedAt: "asc" },
            select: {
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      }),

      // 6. Count tasks by status
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId },
        _count: {
          _all: true,
        },
      }),
    ]);

    if (!project) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 }
      );
    }

    // 7. Prepare task counts
    const taskCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    for (const group of taskGroups) {
      taskCounts[group.status] = group._count._all;
    }

    // 8. Calculate progress
    const totalTasks = project._count.tasks;

    const progress =
      totalTasks === 0
        ? 0
        : Math.round((taskCounts.DONE / totalTasks) * 100);

    // 9. Return overview data
    return NextResponse.json(
      {
        message: "Project overview retrieved successfully.",
        project,
        statistics: {
          totalTasks,
          totalMembers: project.members.length,
          taskCounts,
          progress,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Project overview error:", error);

    return NextResponse.json(
      {
        message: "Something went wrong while fetching the project overview.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Update project
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Verify session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get project ID
    const { projectId } = await params;

    // 3. Find the project
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 }
      );
    }

    // 4. Check workspace permissions
    const role = await getWorkspaceRole(
      session.user.id,
      existingProject.workspaceId
    );

    if (!canManageWorkspace(role)) {
      return NextResponse.json(
        { message: "You are not allowed to edit this project." },
        { status: 403 }
      );
    }

    // 5. Read and validate update data
    const body = await request.json();

    const data: {
      name?: string;
      key?: string;
      description?: string | null;
    } = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { message: "Project name cannot be empty." },
          { status: 400 }
        );
      }

      data.name = body.name.trim();
    }

    if ("key" in body) {
      if (typeof body.key !== "string" || !body.key.trim()) {
        return NextResponse.json(
          { message: "Project key cannot be empty." },
          { status: 400 }
        );
      }

      data.key = body.key.trim().toUpperCase();
    }

    if ("description" in body) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return NextResponse.json(
          { message: "Invalid project description." },
          { status: 400 }
        );
      }

      data.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    // 6. Update project
    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    return NextResponse.json(
      {
        message: "Project updated successfully.",
        project,
      },
      { status: 200 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message:
            "Project name or key already exists in this workspace.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Something went wrong while updating the project.",
      },
      { status: 500 }
    );
  }
}
