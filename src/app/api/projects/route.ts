import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import { getUserIdFromRequest } from "@/lib/auth";

// GET /api/projects - Get all projects for current user
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find projects where user is owner OR in the members array
    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    })
      .populate("owner", "username email avatarColor")
      .populate("members", "username email avatarColor")
      .sort({ createdAt: -1 });

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, key, description } = await req.json();

    if (!name || !key) {
      return NextResponse.json(
        { error: "Project name and key are required" },
        { status: 400 }
      );
    }

    const projectKey = key.toUpperCase().trim();

    // Key validation: length & alphanumeric
    if (projectKey.length < 2 || projectKey.length > 10) {
      return NextResponse.json(
        { error: "Project key must be between 2 and 10 characters" },
        { status: 400 }
      );
    }

    // Check duplicate key
    const existingProject = await Project.findOne({ key: projectKey });
    if (existingProject) {
      return NextResponse.json(
        { error: `Project key "${projectKey}" is already taken` },
        { status: 400 }
      );
    }

    const project = await Project.create({
      name,
      key: projectKey,
      description: description || "",
      owner: userId,
      members: [userId], // Owner is also a member
      issueCounter: 0,
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "username email avatarColor")
      .populate("members", "username email avatarColor");

    return NextResponse.json({ project: populatedProject }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create project" },
      { status: 500 }
    );
  }
}
