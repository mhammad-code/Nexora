# Nexora — Database Schema Design

**Task:** PF-201 — Design Database Schema & Relationships  
**Phase:** Phase 2 — Database & Authentication Foundation  
**Status:** Completed

---

## 1. Overview

Nexora is a project management application inspired by Jira and ClickUp.

This document defines the initial database structure, entities, relationships, constraints, and business rules for Nexora.

### Database entities

1. User
2. Workspace
3. WorkspaceMember
4. Project
5. ProjectMember
6. Task

---

## 2. Database Tables

### 2.1 User

Stores user account information.

| Column | Type | Constraints |
|---|---|---|
| id | String | Primary Key |
| name | String | Required |
| email | String | Unique, Required |
| createdAt | DateTime | Automatic |
| updatedAt | DateTime | Automatic |

Authentication-specific fields will be determined when selecting the authentication solution in PF-204.

### 2.2 Workspace

Stores workspaces where users collaborate.

| Column | Type | Constraints |
|---|---|---|
| id | String | Primary Key |
| name | String | Required |
| description | String | Optional |
| createdAt | DateTime | Automatic |
| updatedAt | DateTime | Automatic |

**Rules:**
- A workspace can have multiple users.
- A workspace can contain multiple projects.
- Multiple owners are allowed.
- Every workspace must have at least one owner.

### 2.3 WorkspaceMember

Connects users with workspaces.

| Column | Type | Constraints |
|---|---|---|
| id | String | Primary Key |
| userId | String | Foreign Key → User |
| workspaceId | String | Foreign Key → Workspace |
| role | WorkspaceRole | Required |
| joinedAt | DateTime | Automatic |

**Workspace roles:**
- OWNER
- ADMIN
- MEMBER

**Rules:**
- A user can belong to multiple workspaces.
- A workspace can have multiple users.
- A user cannot join the same workspace twice.
- Multiple owners are allowed.

### 2.4 Project

Stores projects belonging to workspaces.

| Column | Type | Constraints |
|---|---|---|
| id | String | Primary Key |
| name | String | Required |
| description | String | Optional |
| workspaceId | String | Foreign Key → Workspace |
| createdById | String | Foreign Key → User |
| createdAt | DateTime | Automatic |
| updatedAt | DateTime | Automatic |

**Rules:**
- Each project belongs to exactly one workspace.
- A workspace can contain multiple projects.
- Project names must be unique within the same workspace.
- The project creator automatically becomes a project member.

### 2.5 ProjectMember

Controls which users can access individual projects.

| Column | Type | Constraints |
|---|---|---|
| id | String | Primary Key |
| userId | String | Foreign Key → User |
| projectId | String | Foreign Key → Project |
| joinedAt | DateTime | Automatic |

**Rules:**
- A user can join multiple projects.
- A project can have multiple members.
- A user cannot join the same project twice.
- Only workspace members can become project members.
- Every project must have at least one member.
- Project creator automatically becomes a member.

### 2.6 Task

Stores tasks inside projects.

| Column | Type | Constraints |
|---|---|---|
| id | String | Primary Key |
| title | String | Required |
| description | String | Optional |
| status | TaskStatus | Default: TODO |
| priority | TaskPriority | Default: MEDIUM |
| dueDate | DateTime | Optional |
| projectId | String | Foreign Key → Project |
| createdById | String | Foreign Key → User |
| assigneeId | String | Optional Foreign Key → User |
| createdAt | DateTime | Automatic |
| updatedAt | DateTime | Automatic |

**Task statuses:**
- TODO
- IN_PROGRESS
- IN_REVIEW
- DONE

**Task priorities:**
- LOW
- MEDIUM
- HIGH
- URGENT

**Rules:**
- Each task belongs to exactly one project.
- Each task has exactly one creator.
- Each task can have zero or one assignee.
- Task creator and assignee can be different users.
- Only project members can create tasks.
- Only project members can be assigned tasks.
- Duplicate task titles are allowed.
- Every task has a priority, defaulting to MEDIUM.

---

## 3. Database Relationships

| Relationship | Type |
|---|---|
| User ↔ Workspace | Many-to-Many |
| Workspace → Project | One-to-Many |
| User ↔ Project | Many-to-Many |
| Project → Task | One-to-Many |
| User → Project (creator) | One-to-Many |
| User → Task (creator) | One-to-Many |
| User → Task (assignee) | One-to-Many, optional |

### Relationship explanation

- WorkspaceMember connects User and Workspace.
- ProjectMember connects User and Project.
- Each Project belongs to one Workspace.
- Each Task belongs to one Project.
- Users can create multiple Projects and Tasks.
- Users can be assigned multiple Tasks.

---

## 4. Database Constraints

| Constraint | Purpose |
|---|---|
| Unique User email | Prevent duplicate accounts |
| Unique (userId, workspaceId) | Prevent duplicate workspace membership |
| Unique (workspaceId, name) | Prevent duplicate project names within a workspace |
| Unique (userId, projectId) | Prevent duplicate project membership |
| Required projectId | Every task must belong to a project |
| Required createdById | Every task must have a creator |
| Optional assigneeId | Tasks can remain unassigned |

---

## 5. Business Rules

1. A workspace must have at least one OWNER.
2. A workspace can have multiple OWNERs.
3. A project must belong to a workspace.
4. A project must have at least one member.
5. Project members must belong to the parent workspace.
6. The project creator automatically becomes a project member.
7. Only project members can create tasks.
8. Only project members can be assigned tasks.
9. Tasks can have optional due dates.
10. Task priority defaults to MEDIUM.
11. Task status defaults to TODO.

Some business rules require application-level validation or additional database constraints. Foreign keys alone cannot enforce all of them.

---

## 6. Implementation Plan

The database design will be implemented using:

- PostgreSQL
- Prisma ORM
- Next.js
- TypeScript

### Related tasks

| Task | Description |
|---|---|
| PF-201 | Design Database Schema & Relationships |
| PF-202 | Implement Prisma Models |
| PF-203 | Create Database Migrations & Seed Data |
| PF-204 | Select and Configure Authentication |

---

**Document:** Nexora Database Schema Design  
**Task:** PF-201  
**Status:** Completed