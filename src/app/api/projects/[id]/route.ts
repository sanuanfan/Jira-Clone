import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import Issue from "@/models/Issue";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id] - Get details of a specific project
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await Project.findById(id)
      .populate("owner", "username email avatarColor")
      .populate("members", "username email avatarColor");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify user is owner or member
    const isMember = project.members.some((m: any) => m._id.toString() === userId) || project.owner._id.toString() === userId;
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden: You are not a member of this project" }, { status: 403 });
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project (Only owner)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify ownership
    if (project.owner.toString() !== userId) {
      return NextResponse.json({ error: "Forbidden: Only the project lead can delete a project" }, { status: 403 });
    }

    // Delete the project
    await Project.findByIdAndDelete(id);
    
    // Also delete all issues under this project
    await Issue.deleteMany({ project: id });

    return NextResponse.json({ message: "Project and all associated issues deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete project" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project details or invite member
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify user is a member or owner to edit
    const isMemberOrOwner = project.members.some((m: any) => m.toString() === userId) || project.owner.toString() === userId;
    if (!isMemberOrOwner) {
      return NextResponse.json({ error: "Forbidden: You do not have edit rights" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, memberEmail } = body;

    // Handle adding member by email
    if (memberEmail) {
      const emailToFind = memberEmail.toLowerCase().trim();
      const userToInvite = await User.findOne({ email: emailToFind });

      if (!userToInvite) {
        return NextResponse.json({ error: "No user found with this email address" }, { status: 404 });
      }

      // Check if already member
      const alreadyMember = project.members.some(
        (m: any) => m.toString() === userToInvite._id.toString()
      ) || project.owner.toString() === userToInvite._id.toString();

      if (alreadyMember) {
        return NextResponse.json({ error: "User is already a member of this project" }, { status: 400 });
      }

      project.members.push(userToInvite._id);
      await project.save();

      const updatedProject = await Project.findById(id)
        .populate("owner", "username email avatarColor")
        .populate("members", "username email avatarColor");

      return NextResponse.json({
        message: `Added ${userToInvite.username} to the project!`,
        project: updatedProject,
      }, { status: 200 });
    }

    // Otherwise, handle name and description updates
    if (name) project.name = name;
    if (description !== undefined) project.description = description;

    await project.save();

    const updatedProject = await Project.findById(id)
      .populate("owner", "username email avatarColor")
      .populate("members", "username email avatarColor");

    return NextResponse.json({ project: updatedProject }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update project" },
      { status: 500 }
    );
  }
}
