import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Issue from "@/models/Issue";
import Project from "@/models/Project";
import { getUserIdFromRequest } from "@/lib/auth";

// GET /api/issues - Get issues with filters
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const type = searchParams.get("type");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");

    // Build filter query
    const query: any = {};

    if (projectId) {
      query.project = projectId;
    } else {
      // If no projectId, get issues from all projects user is member of
      const userProjects = await Project.find({
        $or: [{ owner: userId }, { members: userId }],
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);
      query.project = { $in: projectIds };
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.type = type;
    
    if (assigneeId) {
      if (assigneeId === "unassigned") {
        query.assignee = null;
      } else {
        query.assignee = assigneeId;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { key: { $regex: search, $options: "i" } },
      ];
    }

    const issues = await Issue.find(query)
      .populate("assignee", "username email avatarColor")
      .populate("reporter", "username email avatarColor")
      .populate("project", "name key")
      .sort({ updatedAt: -1 });

    return NextResponse.json({ issues }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch issues" },
      { status: 500 }
    );
  }
}

// POST /api/issues - Create a new issue
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, type, priority, status, assigneeId, projectId, dueDate } = body;

    if (!title || !projectId) {
      return NextResponse.json(
        { error: "Title and Project ID are required" },
        { status: 400 }
      );
    }

    // Atomically increment project issueCounter to generate unique sequential key
    const project = await Project.findByIdAndUpdate(
      projectId,
      { $inc: { issueCounter: 1 } },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const issueKey = `${project.key}-${project.issueCounter}`;

    const issue = await Issue.create({
      title,
      description: description || "",
      key: issueKey,
      type: type || "Task",
      priority: priority || "Medium",
      status: status || "To Do",
      assignee: assigneeId || null,
      reporter: userId,
      project: projectId,
      dueDate: dueDate || null,
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate("assignee", "username email avatarColor")
      .populate("reporter", "username email avatarColor")
      .populate("project", "name key");

    return NextResponse.json({ issue: populatedIssue }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create issue" },
      { status: 500 }
    );
  }
}
