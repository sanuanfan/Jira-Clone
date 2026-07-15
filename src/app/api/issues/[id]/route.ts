import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Issue from "@/models/Issue";
import { getUserIdFromRequest } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/issues/[id] - Fetch details of an issue
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const issue = await Issue.findById(id)
      .populate("assignee", "username email avatarColor")
      .populate("reporter", "username email avatarColor")
      .populate("project", "name key")
      .populate("comments.user", "username email avatarColor");

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json({ issue }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch issue" },
      { status: 500 }
    );
  }
}

// PATCH /api/issues/[id] - Update fields of an issue (Status, Assignee, Priority, Title, Description, etc.)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, status, priority, type, assignee, dueDate } = body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Update fields if provided in request body
    if (title !== undefined) issue.title = title;
    if (description !== undefined) issue.description = description;
    if (status !== undefined) issue.status = status;
    if (priority !== undefined) issue.priority = priority;
    if (type !== undefined) issue.type = type;
    
    if (assignee !== undefined) {
      issue.assignee = assignee === "unassigned" || assignee === null ? null : assignee;
    }
    
    if (dueDate !== undefined) {
      issue.dueDate = dueDate || null;
    }

    await issue.save();

    const updatedIssue = await Issue.findById(id)
      .populate("assignee", "username email avatarColor")
      .populate("reporter", "username email avatarColor")
      .populate("project", "name key")
      .populate("comments.user", "username email avatarColor");

    return NextResponse.json({ issue: updatedIssue }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update issue" },
      { status: 500 }
    );
  }
}

// DELETE /api/issues/[id] - Delete an issue
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const issue = await Issue.findById(id);
    
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    await Issue.findByIdAndDelete(id);

    return NextResponse.json({ message: "Issue deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete issue" },
      { status: 500 }
    );
  }
}
