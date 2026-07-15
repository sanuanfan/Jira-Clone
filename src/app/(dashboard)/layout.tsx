"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Plus,
  Briefcase,
  User,
} from "lucide-react";
import CreateIssueModal from "@/components/CreateIssueModal";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100vw",
          backgroundColor: "var(--bg-main)",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid rgba(255, 255, 255, 0.05)",
              borderTop: "4px solid var(--primary-light)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <h3 style={{ fontSize: "16px", fontWeight: 500 }}>Loading workspace...</h3>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Let middleware handle redirection
  }

  // Get initials for avatar
  const initials = user.username ? user.username.slice(0, 2) : "UI";

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Briefcase size={22} color="var(--primary-light)" />
          <span>Jira Clone</span>
        </div>

        <button
          className="btn btn-primary btn-create-task"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={16} />
          <span>Create Issue</span>
        </button>

        <nav className="sidebar-nav">
          <Link
            href="/dashboard"
            className={`sidebar-link ${pathname === "/dashboard" ? "active" : ""}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/projects"
            className={`sidebar-link ${pathname.startsWith("/projects") ? "active" : ""}`}
          >
            <FolderKanban size={18} />
            <span>Projects</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar" style={{ backgroundColor: user.avatarColor }}>
              {initials}
            </div>
            <div className="user-info">
              <div className="username">{user.username}</div>
              <div className="email">{user.email}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">{children}</main>

      {/* Global Create Issue Modal */}
      {isCreateModalOpen && (
        <CreateIssueModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
}
