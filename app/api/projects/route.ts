
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getWorkspaceRole,
  canCreateProjects,
} from "@/lib/permissions";

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
        { message: "A project with this name or key already exists in this workspace." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Something went wrong while creating the project." },
      { status: 500 }
    );
  }
}
