import {
  getWorkspaceRole,
  canManageMembers,
} from "@/lib/permissions";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
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

    // 2. Get the project ID
    const { projectId } = await params;

    // 3. Find the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
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

    // 4. Check workspace membership
    const role = await getWorkspaceRole(
      session.user.id,
      project.workspaceId
    );

    if (!role) {
      return NextResponse.json(
        { message: "You are not a member of this workspace." },
        { status: 403 }
      );
    }

    // 5. Retrieve project members
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: {
        id: true,
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
      orderBy: {
        joinedAt: "asc",
      },
    });

    return NextResponse.json(
      {
        message: "Project members retrieved successfully.",
        members,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: "Something went wrong while retrieving project members." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
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

    // 2. Get the project ID
    const { projectId } = await params;

    // 3. Read the target user's email
    const body = await request.json();
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        { message: "A valid email address is required." },
        { status: 400 }
      );
    }

    // 4. Find the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
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

    // 5. Check the requester's permissions
    const role = await getWorkspaceRole(
      session.user.id,
      project.workspaceId
    );

    if (!canManageMembers(role)) {
      return NextResponse.json(
        { message: "You are not allowed to manage project members." },
        { status: 403 }
      );
    }

    // 6. Find the target user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 }
      );
    }

    // 7. Verify that the user belongs to this workspace
    const workspaceMembership =
      await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: project.workspaceId,
          },
        },
      });

    if (!workspaceMembership) {
      return NextResponse.json(
        { message: "User does not belong to this workspace." },
        { status: 400 }
      );
    }

    // 8. Prevent duplicate project membership
    const existingMembership =
      await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId,
          },
        },
      });

    if (existingMembership) {
      return NextResponse.json(
        { message: "User is already a project member." },
        { status: 409 }
      );
    }

    // 9. Create project membership
    const membership = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId,
      },
      select: {
        id: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Project member added successfully.",
        membership,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle a duplicate created by a simultaneous request
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "User is already a project member." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Something went wrong while adding the project member." },
      { status: 500 }
    );
  }
}
