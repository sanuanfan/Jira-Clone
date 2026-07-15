import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/auth";

const AVATAR_COLORS = [
  "#0052CC", // Jira Blue
  "#00B8D9", // Teal
  "#36B37E", // Green
  "#FF5252", // Red
  "#6554C0", // Purple
  "#FFAB00", // Yellow
  "#344563", // Dark Grey
];

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    // Check duplicate username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      );
    }

    // Check duplicate email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Pick a random avatar color
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      avatarColor,
    });

    const token = signJWT({
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    const response = NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatarColor: user.avatarColor,
        },
      },
      { status: 201 }
    );

    // Set secure cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Signup failed" }, { status: 500 });
  }
}
