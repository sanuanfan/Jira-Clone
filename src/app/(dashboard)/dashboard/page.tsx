"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  UserCheck,
  Briefcase,
  AlertTriangle,
  Flame,
  ArrowRight,
} from "lucide-react";

interface UserProfile {
  _id: string;
  username: string;
  avatarColor: string;
}

interface Project {
  _id: string;
  name: string;
  key: string;
}

interface Issue {
  _id: string;
  title: string;
  key: string;
  type: string;
  priority: string;
  status: string;
  assignee: UserProfile | null;
  reporter: UserProfile;
  project: Project;
  updatedAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch projects first
        const projectsRes = await fetch("/api/projects");
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData.projects || []);
        }

        // Fetch issues across all projects
        const issuesRes = await fetch("/api/issues");
        if (issuesRes.ok) {
          const issuesData = await issuesRes.json();
          setIssues(issuesData.issues || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Compute metrics
  const totalProjects = projects.length;
  const totalIssues = issues.length;
  
  const todoIssues = issues.filter((i) => i.status === "To Do").length;
  const progressIssues = issues.filter((i) => i.status === "In Progress").length;
  const reviewIssues = issues.filter((i) => i.status === "Review").length;
  const doneIssues = issues.filter((i) => i.status === "Done").length;
  const pendingIssues = todoIssues + progressIssues + reviewIssues;

  const myAssignedIssues = issues.filter(
    (i) => i.assignee && i.assignee._id === user?.id
  );
  
  const highPriorityIssues = issues.filter(
    (i) => i.priority === "High" || i.priority === "Highest"
  ).length;

  // Pie chart computations
  const totalDistribution = totalIssues || 1;
  const todoPercent = (todoIssues / totalDistribution) * 100;
  const progressPercent = (progressIssues / totalDistribution) * 100;
  const reviewPercent = (reviewIssues / totalDistribution) * 100;
  const donePercent = (doneIssues / totalDistribution) * 100;

  // Donut SVG constants
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  const strokeTodo = (todoPercent / 100) * circumference;
  const strokeProgress = (progressPercent / 100) * circumference;
  const strokeReview = (reviewPercent / 100) * circumference;
  const strokeDone = (donePercent / 100) * circumference;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.username}!</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Here is a summary of what's happening in your workspaces today.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              border: "3px solid rgba(255, 255, 255, 0.05)",
              borderTop: "3px solid var(--primary-light)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "rgba(38, 132, 255, 0.1)", color: "var(--primary-light)" }}>
                <FolderKanban size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{totalProjects}</span>
                <span className="stat-label">Total Projects</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "rgba(255, 171, 0, 0.1)", color: "var(--warning)" }}>
                <Clock size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{pendingIssues}</span>
                <span className="stat-label">Active (To Do/Progress)</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "rgba(54, 179, 126, 0.1)", color: "var(--success)" }}>
                <CheckCircle2 size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{doneIssues}</span>
                <span className="stat-label">Done Tasks</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "rgba(101, 84, 192, 0.1)", color: "#b9a6ff" }}>
                <UserCheck size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{myAssignedIssues.length}</span>
                <span className="stat-label">Assigned to Me</span>
              </div>
            </div>
          </div>

          {/* Charts & Graphs Row */}
          <div className="dashboard-charts">
            {/* Doughnut distribution chart */}
            <div className="chart-card">
              <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Task Status Distribution</h3>
              {totalIssues === 0 ? (
                <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                  Create issues in a project to see data.
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flex: 1, flexWrap: "wrap", gap: "20px" }}>
                  {/* Doughnut SVG */}
                  <div style={{ position: "relative", width: "140px", height: "140px" }}>
                    <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="70" cy="70" r="50" fill="transparent" stroke="var(--border-color)" strokeWidth="18" />
                      {/* Done */}
                      <circle
                        cx="70"
                        cy="70"
                        r="50"
                        fill="transparent"
                        stroke="var(--success)"
                        strokeWidth="18"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - strokeDone}
                      />
                      {/* Review */}
                      <circle
                        cx="70"
                        cy="70"
                        r="50"
                        fill="transparent"
                        stroke="#8b5cf6"
                        strokeWidth="18"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - strokeReview}
                        style={{ transform: `rotate(${((doneIssues) / totalDistribution) * 360}deg)`, transformOrigin: "70px 70px" }}
                      />
                      {/* In Progress */}
                      <circle
                        cx="70"
                        cy="70"
                        r="50"
                        fill="transparent"
                        stroke="var(--primary-light)"
                        strokeWidth="18"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - strokeProgress}
                        style={{ transform: `rotate(${((doneIssues + reviewIssues) / totalDistribution) * 360}deg)`, transformOrigin: "70px 70px" }}
                      />
                      {/* To Do */}
                      <circle
                        cx="70"
                        cy="70"
                        r="50"
                        fill="transparent"
                        stroke="#475569"
                        strokeWidth="18"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - strokeTodo}
                        style={{ transform: `rotate(${((doneIssues + reviewIssues + progressIssues) / totalDistribution) * 360}deg)`, transformOrigin: "70px 70px" }}
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                      }}
                    >
                      <span style={{ fontSize: "20px", fontWeight: 700 }}>{totalIssues}</span>
                      <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Issues</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "120px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#475569" }} />
                      <span style={{ color: "var(--text-muted)" }}>To Do:</span>
                      <span style={{ fontWeight: 600 }}>{todoIssues}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "var(--primary-light)" }} />
                      <span style={{ color: "var(--text-muted)" }}>In Progress:</span>
                      <span style={{ fontWeight: 600 }}>{progressIssues}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#8b5cf6" }} />
                      <span style={{ color: "var(--text-muted)" }}>In Review:</span>
                      <span style={{ fontWeight: 600 }}>{reviewIssues}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "var(--success)" }} />
                      <span style={{ color: "var(--text-muted)" }}>Done:</span>
                      <span style={{ fontWeight: 600 }}>{doneIssues}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick overview of high priorities */}
            <div className="chart-card">
              <h3 style={{ fontSize: "16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Flame size={18} color="var(--danger)" />
                <span>Urgent Issues ({highPriorityIssues})</span>
              </h3>
              <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                {issues.filter((i) => (i.priority === "High" || i.priority === "Highest") && i.status !== "Done").length === 0 ? (
                  <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                    No pending high-priority tasks. Good job!
                  </div>
                ) : (
                  issues
                    .filter((i) => (i.priority === "High" || i.priority === "Highest") && i.status !== "Done")
                    .slice(0, 4)
                    .map((issue) => (
                      <Link href={`/projects/${issue.project._id}?issue=${issue._id}`} key={issue._id}>
                        <div
                          style={{
                            padding: "12px",
                            backgroundColor: "rgba(255, 86, 48, 0.05)",
                            border: "1px solid rgba(255, 86, 48, 0.2)",
                            borderRadius: "var(--radius-sm)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "border-color var(--transition-fast)",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--danger)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 86, 48, 0.2)")}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)" }}>{issue.key}</span>
                            <span style={{ fontSize: "14px", fontWeight: 500, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {issue.title}
                            </span>
                          </div>
                          <span className={`badge ${issue.priority === "Highest" ? "badge-highest" : "badge-high"}`}>
                            {issue.priority}
                          </span>
                        </div>
                      </Link>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Assigned To Me Section */}
          <div className="dashboard-section">
            <h2 style={{ fontSize: "18px" }}>Assigned to Me</h2>
            {myAssignedIssues.length === 0 ? (
              <div className="empty-state" style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <CheckCircle2 size={36} color="var(--success)" />
                <h3>All caught up!</h3>
                <p>You don't have any tasks currently assigned to you.</p>
              </div>
            ) : (
              <div className="list-view-container">
                <table className="issue-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Summary</th>
                      <th>Project</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAssignedIssues.map((issue) => (
                      <tr key={issue._id}>
                        <td>
                          <Link href={`/projects/${issue.project._id}?issue=${issue._id}`} style={{ fontWeight: 700, color: "var(--text-muted)" }}>
                            {issue.key}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/projects/${issue.project._id}?issue=${issue._id}`} style={{ fontWeight: 500, color: "#fff" }}>
                            {issue.title}
                          </Link>
                        </td>
                        <td>{issue.project.name}</td>
                        <td>{issue.type}</td>
                        <td>
                          <span
                            className={`badge ${
                              issue.priority === "Highest"
                                ? "badge-highest"
                                : issue.priority === "High"
                                ? "badge-high"
                                : issue.priority === "Medium"
                                ? "badge-medium"
                                : "badge-low"
                            }`}
                          >
                            {issue.priority}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              issue.status === "To Do"
                                ? "badge-todo"
                                : issue.status === "In Progress"
                                ? "badge-progress"
                                : issue.status === "Review"
                                ? "badge-review"
                                : "badge-done"
                            }`}
                          >
                            {issue.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
