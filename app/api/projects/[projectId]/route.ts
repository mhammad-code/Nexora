
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
        { message: "Project name or key already exists in this workspace." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Something went wrong while updating the project." },
      { status: 500 }
    );
  }
}
