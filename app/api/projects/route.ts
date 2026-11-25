
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getWorkspaceRole,
  canCreateProjects,
} from "@/lib/permissions";
import { WorkspaceRole } from "@/lib/generated/prisma/enums";

// POST: Create a new project
export async function POST(request: Request) {
  try {
    // 1. Verify the user's session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Read project details
    const body = await request.json();

    const { name, key, description, workspaceId } = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof key !== "string" ||
      !key.trim() ||
      typeof workspaceId !== "string" ||
      !workspaceId.trim()
    ) {
      return NextResponse.json(
        { message: "Name, key and workspace ID are required." },
        { status: 400 }
      );
    }

    // 3. Check workspace permissions
    const role = await getWorkspaceRole(
      session.user.id,
      workspaceId
    );

    if (!canCreateProjects(role)) {
      return NextResponse.json(
        { message: "You are not allowed to create projects." },
        { status: 403 }
      );
    }

    // 4. Create the project
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description:
          typeof description === "string"
            ? description.trim() || null
            : null,
        workspaceId,
        createdById: session.user.id,
      },
    });

    // 5. Return the created project
    return NextResponse.json(
      {
        message: "Project created successfully.",
        project,
      },
      { status: 201 }
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
            "A project with this name or key already exists in this workspace.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Something went wrong while creating the project." },
      { status: 500 }
    );
  }
}

// GET: Retrieve projects in a workspace
export async function GET(request: Request) {
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

    // 2. Read query parameters
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const search = searchParams.get("search")?.trim();

    if (!workspaceId) {
      return NextResponse.json(
        { message: "Workspace ID is required." },
        { status: 400 }
      );
    }

    // 3. Check workspace membership
    const role = await getWorkspaceRole(
      session.user.id,
      workspaceId
    );

    if (!role) {
      return NextResponse.json(
        { message: "You are not a member of this workspace." },
        { status: 403 }
      );
    }

    // 4. Retrieve only the projects the user can access
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,

        // OWNER and ADMIN can see all workspace projects.
        // MEMBER can see only assigned projects.
        ...(role === WorkspaceRole.OWNER ||
        role === WorkspaceRole.ADMIN
          ? {}
          : {
              members: {
                some: {
                  userId: session.user.id,
                },
              },
            }),

        // Optional project name/key search
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  key: {
                    contains: search.toUpperCase(),
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        message: "Projects retrieved successfully.",
        projects,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Project listing error:", error);

    return NextResponse.json(
      { message: "Something went wrong while retrieving projects." },
      { status: 500 }
    );
  }
}
