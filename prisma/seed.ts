
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create sample user
  const user = await prisma.user.upsert({
    where: {
      email: "ali@nexora.dev",
    },
    update: {},
    create: {
      name: "Ali",
      email: "ali@nexora.dev",
    },
  });

  // 2. Create sample workspace
  let workspace = await prisma.workspace.findFirst({
    where: {
      name: "Nexora Development",
    },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "Nexora Development",
        description: "Sample workspace for Nexora",
      },
    });
  }

  // 3. Add user to workspace as OWNER
  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "OWNER",
    },
  });

  // 4. Create sample project
  const project = await prisma.project.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: "Nexora Development",
      },
    },
    update: {},
    create: {
      name: "Nexora Development",
      description: "Main development project",
      workspaceId: workspace.id,
      createdById: user.id,
      key: "NEX",
    },
  });

  // 5. Add user to project
  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId: project.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      projectId: project.id,
    },
  });

  // 6. Create sample task if it doesn't exist
  const existingTask = await prisma.task.findFirst({
    where: {
      title: "Build Nexora Dashboard",
      projectId: project.id,
    },
  });

  if (!existingTask) {
    await prisma.task.create({
      data: {
        title: "Build Nexora Dashboard",
        description: "Create the initial project dashboard",
        status: "TODO",
        priority: "HIGH",
        projectId: project.id,
        createdById: user.id,
        assigneeId: user.id,
      },
    });
  }

  console.log("Nexora seed data created successfully!");
}

main()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
