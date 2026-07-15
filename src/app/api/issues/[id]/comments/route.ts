import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Issue from "@/models/Issue";
import { getUserIdFromRequest } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/issues/[id]/comments - Add a comment to an issue
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Add comment to comments array
    issue.comments.push({
      user: userId,
      text: text.trim(),
    });

    await issue.save();

    // Fetch the issue again and populate comments
    const updatedIssue = await Issue.findById(id)
      .populate("comments.user", "username email avatarColor");

    return NextResponse.json({ comments: updatedIssue.comments }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add comment" },
      { status: 500 }
    );
  }
}
