import mongoose, { Schema } from "mongoose";

const ProjectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    key: {
      type: String,
      required: [true, "Project key is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, "Project key must be at least 2 characters"],
      maxlength: [10, "Project key must not exceed 10 characters"],
    },
    description: {
      type: String,
      default: "",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    issueCounter: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);
