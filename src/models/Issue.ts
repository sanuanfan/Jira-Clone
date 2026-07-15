import mongoose, { Schema } from "mongoose";

const CommentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const IssueSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    key: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["Task", "Bug", "Story"],
      default: "Task",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Highest"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Review", "Done"],
      default: "To Do",
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    comments: [CommentSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Issue || mongoose.model("Issue", IssueSchema);
