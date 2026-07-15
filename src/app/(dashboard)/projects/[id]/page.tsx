"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  Users,
  Settings,
  List,
  KanbanSquare,
  Plus,
  Send,
  Trash2,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle,
  Info,
  X,
  PlusCircle,
} from "lucide-react";

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  avatarColor: string;
}

interface Project {
  _id: string;
  name: string;
  key: string;
  description: string;
  owner: UserProfile;
  members: UserProfile[];
}

interface Comment {
  _id: string;
  user: UserProfile;
  text: string;
  createdAt: string;
}

interface Issue {
  _id: string;
  title: string;
  description: string;
  key: string;
  type: string;
  priority: string;
  status: string;
  assignee: UserProfile | null;
  reporter: UserProfile;
  project: { _id: string; name: string; key: string };
  dueDate: string | null;
  comments: Comment[];
  createdAt: string;
}

const COLUMNS = ["To Do", "In Progress", "Review", "Done"];

export default function ProjectWorkspace() {
  const { id: projectId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"board" | "list" | "settings">("board");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  // Settings: Invite member
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Task creation local to project
  const [isLocalCreateOpen, setIsLocalCreateOpen] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [localType, setLocalType] = useState("Task");
  const [localPriority, setLocalPriority] = useState("Medium");
  const [localAssigneeId, setLocalAssigneeId] = useState("");

  // Active Issue Details Panel (slide out)
  const activeIssueId = searchParams.get("issue");
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // Drag over column tracking
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchProjectData = async () => {
    try {
      const projRes = await fetch(`/api/projects/${projectId}`);
      if (!projRes.ok) {
        router.push("/projects");
        return;
      }
      const projData = await projRes.json();
      setProject(projData.project);

      const issuesRes = await fetch(`/api/issues?projectId=${projectId}`);
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(issuesData.issues || []);
      }
    } catch (err) {
      console.error("Failed to load workspace", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  // Handle slide out panel fetch
  useEffect(() => {
    if (!activeIssueId) {
      setActiveIssue(null);
      return;
    }

    const fetchIssueDetails = async () => {
      setPanelLoading(true);
      try {
        const res = await fetch(`/api/issues/${activeIssueId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveIssue(data.issue);
          setEditedDesc(data.issue.description);
          setEditedTitle(data.issue.title);
        } else {
          // Clear query param if not found
          closePanel();
        }
      } catch (err) {
        console.error("Failed to load issue details", err);
      } finally {
        setPanelLoading(false);
      }
    };

    fetchIssueDetails();
  }, [activeIssueId]);

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("issue");
    router.push(`/projects/${projectId}?${params.toString()}`);
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData("text/plain", issueId);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, column: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const issueId = e.dataTransfer.getData("text/plain");

    if (!issueId) return;

    // Optimistic Update
    const prevIssues = [...issues];
    setIssues(
      issues.map((issue) =>
        issue._id === issueId ? { ...issue, status: column } : issue
      )
    );

    // If the active panel is open for this task, update status
    if (activeIssue && activeIssue._id === issueId) {
      setActiveIssue({ ...activeIssue, status: column });
    }

    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: column }),
      });

      if (!res.ok) {
        // Rollback
        setIssues(prevIssues);
        if (activeIssue && activeIssue._id === issueId) {
          setActiveIssue(activeIssue);
        }
      }
    } catch (err) {
      setIssues(prevIssues);
    }
  };

  // Update Status Dropdown on Panel
  const handleUpdateStatus = async (issueId: string, status: string) => {
    setIssues(
      issues.map((issue) => (issue._id === issueId ? { ...issue, status } : issue))
    );
    if (activeIssue) setActiveIssue({ ...activeIssue, status });

    try {
      await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Update Priority
  const handleUpdatePriority = async (issueId: string, priority: string) => {
    setIssues(
      issues.map((issue) => (issue._id === issueId ? { ...issue, priority } : issue))
    );
    if (activeIssue) setActiveIssue({ ...activeIssue, priority });

    try {
      await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Update Assignee
  const handleUpdateAssignee = async (issueId: string, assigneeVal: string) => {
    const assigneeId = assigneeVal === "unassigned" ? null : assigneeVal;
    
    // Find assignee user object
    const selectedUser = project?.members.find((m) => m._id === assigneeId) || null;

    setIssues(
      issues.map((issue) =>
        issue._id === issueId ? { ...issue, assignee: selectedUser } : issue
      )
    );
    if (activeIssue) setActiveIssue({ ...activeIssue, assignee: selectedUser });

    try {
      await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: assigneeId }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Save Title edit
  const handleSaveTitle = async () => {
    if (!activeIssue || !editedTitle.trim()) return;
    setIsEditingTitle(false);

    setIssues(
      issues.map((issue) =>
        issue._id === activeIssue._id ? { ...issue, title: editedTitle.trim() } : issue
      )
    );
    setActiveIssue({ ...activeIssue, title: editedTitle.trim() });

    try {
      await fetch(`/api/issues/${activeIssue._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editedTitle.trim() }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Save Description edit
  const handleSaveDescription = async () => {
    if (!activeIssue) return;
    setIsEditingDesc(false);

    setIssues(
      issues.map((issue) =>
        issue._id === activeIssue._id ? { ...issue, description: editedDesc } : issue
      )
    );
    setActiveIssue({ ...activeIssue, description: editedDesc });

    try {
      await fetch(`/api/issues/${activeIssue._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDesc }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Issue
  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm("Are you sure you want to delete this issue?")) return;

    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIssues(issues.filter((issue) => issue._id !== issueId));
        closePanel();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue || !newComment.trim()) return;

    try {
      const res = await fetch(`/api/issues/${activeIssue._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveIssue({ ...activeIssue, comments: data.comments });
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Settings: Invite member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberEmail: inviteEmail.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteSuccess(data.message);
        setProject(data.project);
        setInviteEmail("");
      } else {
        setInviteError(data.error || "Failed to add member");
      }
    } catch (err) {
      setInviteError("An unexpected error occurred.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Local Issue Creation Form Submit
  const handleLocalCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localTitle.trim()) return;

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: localTitle.trim(),
          description: "",
          type: localType,
          priority: localPriority,
          assigneeId: localAssigneeId === "" ? null : localAssigneeId,
          projectId: projectId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIssues([data.issue, ...issues]);
        setIsLocalCreateOpen(false);
        setLocalTitle("");
        setLocalType("Task");
        setLocalPriority("Medium");
        setLocalAssigneeId("");
      }
    } catch (err) {
      console.error("Local create failed", err);
    }
  };

  // Filter Issues
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.key.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "" ? true : issue.type === typeFilter;
    const matchesPriority = priorityFilter === "" ? true : issue.priority === priorityFilter;
    
    const matchesAssignee =
      assigneeFilter === ""
        ? true
        : assigneeFilter === "unassigned"
        ? issue.assignee === null
        : issue.assignee?._id === assigneeFilter;

    return matchesSearch && matchesType && matchesPriority && matchesAssignee;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px", height: "100%" }}>
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
    );
  }

  if (!project) return null;

  return (
    <div className="page-container animate-fade-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "0px" }}>
        <div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Projects / {project.key}
          </span>
          <h1 style={{ marginTop: "4px" }}>{project.name}</h1>
        </div>

        <button className="btn btn-primary" onClick={() => setIsLocalCreateOpen(true)}>
          <Plus size={16} />
          <span>New Task</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === "board" ? "active" : ""}`}
          onClick={() => setActiveTab("board")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <KanbanSquare size={16} />
            Board
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <List size={16} />
            List View
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={16} />
            Team & Invite
          </span>
        </button>
      </div>

      {/* Filters (Except in settings) */}
      {activeTab !== "settings" && (
        <div className="board-filters">
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: "auto", padding: "6px 12px", height: "36px" }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Task">Tasks</option>
            <option value="Story">Stories</option>
            <option value="Bug">Bugs</option>
          </select>

          <select
            className="form-select"
            style={{ width: "auto", padding: "6px 12px", height: "36px" }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Highest">Highest</option>
          </select>

          <select
            className="form-select"
            style={{ width: "auto", padding: "6px 12px", height: "36px" }}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {project.members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.username}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active Tab Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "board" && (
          <div className="board-container">
            {COLUMNS.map((column) => {
              const colIssues = filteredIssues.filter((i) => i.status === column);
              const isOver = dragOverColumn === column;

              return (
                <div
                  key={column}
                  className={`board-column ${isOver ? "drag-over" : ""}`}
                  onDragOver={(e) => handleDragOver(e, column)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column)}
                >
                  <div className="column-header">
                    <span className="column-title">{column}</span>
                    <span className="column-count">{colIssues.length}</span>
                  </div>

                  <div className="column-cards">
                    {colIssues.length === 0 ? (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted-dark)",
                          fontSize: "12px",
                          border: "1px dashed var(--border-color)",
                          borderRadius: "var(--radius-sm)",
                          padding: "16px 0",
                        }}
                      >
                        Drop tasks here
                      </div>
                    ) : (
                      colIssues.map((issue) => (
                        <div
                          key={issue._id}
                          className="task-card"
                          draggable
                          onDragStart={(e) => handleDragStart(e, issue._id)}
                          onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("issue", issue._id);
                            router.push(`/projects/${projectId}?${params.toString()}`);
                          }}
                        >
                          <span className="task-card-title">{issue.title}</span>

                          <div className="task-card-meta">
                            <div className="task-card-left">
                              {/* Type Icon */}
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color:
                                    issue.type === "Bug"
                                      ? "var(--danger)"
                                      : issue.type === "Story"
                                      ? "var(--success)"
                                      : "var(--primary-light)",
                                }}
                              >
                                {issue.type[0]}
                              </span>
                              <span className="task-card-key">{issue.key}</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                                style={{ fontSize: "9px", padding: "1px 4px" }}
                              >
                                {issue.priority[0]}
                              </span>

                              {issue.assignee ? (
                                <div
                                  className="avatar avatar-sm"
                                  style={{
                                    backgroundColor: issue.assignee.avatarColor,
                                    fontSize: "9px",
                                    width: "20px",
                                    height: "20px",
                                  }}
                                  title={issue.assignee.username}
                                >
                                  {issue.assignee.username.slice(0, 2)}
                                </div>
                              ) : (
                                <div
                                  className="avatar avatar-sm"
                                  style={{
                                    backgroundColor: "var(--border-color-light)",
                                    fontSize: "9px",
                                    width: "20px",
                                    height: "20px",
                                  }}
                                  title="Unassigned"
                                >
                                  -
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "list" && (
          <div className="list-view-container">
            {filteredIssues.length === 0 ? (
              <div className="empty-state">
                <Info size={36} color="var(--text-muted-dark)" />
                <h3>No tasks match filters</h3>
                <p>Try resetting your queries or search filters.</p>
              </div>
            ) : (
              <table className="issue-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Summary</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((issue) => (
                    <tr
                      key={issue._id}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("issue", issue._id);
                        router.push(`/projects/${projectId}?${params.toString()}`);
                      }}
                    >
                      <td style={{ fontWeight: 700, color: "var(--text-muted)" }}>{issue.key}</td>
                      <td style={{ fontWeight: 500, color: "#fff" }}>{issue.title}</td>
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
                        {issue.assignee ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div
                              className="avatar avatar-sm"
                              style={{ backgroundColor: issue.assignee.avatarColor }}
                            >
                              {issue.assignee.username.slice(0, 2)}
                            </div>
                            <span>{issue.assignee.username}</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted-dark)" }}>Unassigned</span>
                        )}
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
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", marginTop: "12px" }}>
            {/* Team settings */}
            <div className="chart-card" style={{ minHeight: "auto" }}>
              <h3 style={{ fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={18} color="var(--primary-light)" />
                <span>Project Team Members ({project.members.length})</span>
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <div className="avatar" style={{ backgroundColor: project.owner.avatarColor }}>
                    {project.owner.username.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{project.owner.username} (Lead)</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{project.owner.email}</div>
                  </div>
                </div>

                {project.members
                  .filter((m) => m._id !== project.owner._id)
                  .map((member) => (
                    <div
                      key={member._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      <div className="avatar" style={{ backgroundColor: member.avatarColor }}>
                        {member.username.slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{member.username}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{member.email}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Invite form */}
            <div className="chart-card" style={{ minHeight: "auto" }}>
              <h3 style={{ fontSize: "16px" }}>Invite Collaborator</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                Invite other registered users to join this project by entering their email address.
              </p>

              {inviteSuccess && (
                <div style={{ color: "var(--success)", fontSize: "13px", padding: "8px 0", fontWeight: 600 }}>
                  {inviteSuccess}
                </div>
              )}
              {inviteError && (
                <div style={{ color: "var(--danger)", fontSize: "13px", padding: "8px 0", fontWeight: 600 }}>
                  {inviteError}
                </div>
              )}

              <form onSubmit={handleInviteMember} style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: "0" }}>
                  <label className="form-label" htmlFor="inviteEmailInput">
                    User Email
                  </label>
                  <input
                    type="email"
                    id="inviteEmailInput"
                    className="form-input"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. teammate@example.com"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={inviteLoading} style={{ alignSelf: "flex-start" }}>
                  {inviteLoading ? "Adding..." : "Add Member"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Task Creation Modal inside workspace */}
      {isLocalCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsLocalCreateOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Task for {project.name}</h2>
              <button className="btn-icon" onClick={() => setIsLocalCreateOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLocalCreateIssue}>
              <div className="modal-body">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="localType">
                      Task Type
                    </label>
                    <select
                      id="localType"
                      className="form-select"
                      value={localType}
                      onChange={(e) => setLocalType(e.target.value)}
                    >
                      <option value="Task">Task</option>
                      <option value="Story">Story</option>
                      <option value="Bug">Bug</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="localPriority">
                      Priority
                    </label>
                    <select
                      id="localPriority"
                      className="form-select"
                      value={localPriority}
                      onChange={(e) => setLocalPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Highest">Highest</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="localTitle">
                    Summary (Title)
                  </label>
                  <input
                    type="text"
                    id="localTitle"
                    className="form-input"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    placeholder="Briefly state the task summary..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="localAssignee">
                    Assignee
                  </label>
                  <select
                    id="localAssignee"
                    className="form-select"
                    value={localAssigneeId}
                    onChange={(e) => setLocalAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {project.members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsLocalCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Slide-out Drawer Panel */}
      {activeIssueId && (
        <>
          <div className="panel-backdrop" onClick={closePanel} />
          <div className="panel-container">
            <div className="panel-header">
              <div className="panel-header-left">
                {activeIssue && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color:
                        activeIssue.type === "Bug"
                          ? "var(--danger)"
                          : activeIssue.type === "Story"
                          ? "var(--success)"
                          : "var(--primary-light)",
                    }}
                  >
                    {activeIssue.type.toUpperCase()}
                  </span>
                )}
                {activeIssue && (
                  <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>
                    {activeIssue.key}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {activeIssue && (
                  <button
                    className="btn-icon"
                    onClick={() => handleDeleteIssue(activeIssue._id)}
                    style={{ color: "var(--text-muted-dark)" }}
                    title="Delete Issue"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button className="btn-icon" onClick={closePanel}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {panelLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "60px", flex: 1, alignItems: "center" }}>
                <div
                  style={{
                    width: "25px",
                    height: "25px",
                    border: "3px solid rgba(255, 255, 255, 0.05)",
                    borderTop: "3px solid var(--primary-light)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
            ) : !activeIssue ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                Failed to load task details.
              </div>
            ) : (
              <div className="panel-body">
                {/* Main Content Area: Title, Desc, Comments */}
                <div className="panel-main-content">
                  {/* Title Inline Edit */}
                  <div>
                    {isEditingTitle ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="text"
                          className="form-input"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          style={{ fontSize: "18px", fontWeight: 600 }}
                        />
                        <button className="btn btn-primary" style={{ padding: "6px 12px" }} onClick={handleSaveTitle}>
                          Save
                        </button>
                        <button className="btn btn-secondary" style={{ padding: "6px 12px" }} onClick={() => { setIsEditingTitle(false); setEditedTitle(activeIssue.title); }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <h2
                        onClick={() => setIsEditingTitle(true)}
                        style={{ cursor: "text", padding: "4px 8px", borderRadius: "var(--radius-sm)", border: "1px solid transparent", fontSize: "20px" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      >
                        {activeIssue.title}
                      </h2>
                    )}
                  </div>

                  {/* Description Inline Edit */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h4 style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Description</h4>
                    {isEditingDesc ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <textarea
                          className="form-textarea"
                          value={editedDesc}
                          onChange={(e) => setEditedDesc(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-primary" style={{ padding: "6px 12px" }} onClick={handleSaveDescription}>
                            Save
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px" }}
                            onClick={() => {
                              setIsEditingDesc(false);
                              setEditedDesc(activeIssue.description);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsEditingDesc(true)}
                        style={{
                          cursor: "text",
                          padding: "10px 14px",
                          minHeight: "80px",
                          backgroundColor: "#0b0f19",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-color)",
                          fontSize: "14px",
                          lineHeight: "1.5",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {activeIssue.description || (
                          <span style={{ color: "var(--text-muted-dark)", fontStyle: "italic" }}>
                            Add a description to collaborate with your team...
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                    <h4 style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Comments ({activeIssue.comments?.length || 0})
                    </h4>
                    
                    {/* Add comment */}
                    <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "8px" }}>
                      <div className="avatar" style={{ backgroundColor: currentUser?.avatarColor }}>
                        {currentUser?.username.slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <textarea
                          className="form-textarea"
                          style={{ minHeight: "60px", padding: "8px 12px", fontSize: "13px" }}
                          placeholder="Type a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: "12px" }} disabled={!newComment.trim()}>
                          Comment
                        </button>
                      </div>
                    </form>

                    {/* Comments List */}
                    <div className="comment-list">
                      {activeIssue.comments?.map((comment) => (
                        <div key={comment._id} className="comment-item">
                          <div className="comment-header">
                            <div className="avatar avatar-sm" style={{ backgroundColor: comment.user?.avatarColor }}>
                              {comment.user?.username.slice(0, 2)}
                            </div>
                            <span style={{ color: "#fff" }}>{comment.user?.username}</span>
                            <span style={{ fontSize: "10px", color: "var(--text-muted-dark)", fontWeight: "normal" }}>
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="comment-text">{comment.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar Panel: Meta parameters (status, assignee, priority) */}
                <div className="panel-sidebar-content">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "11px" }}>Status</label>
                    <select
                      className="form-select"
                      style={{ height: "36px", padding: "6px 10px" }}
                      value={activeIssue.status}
                      onChange={(e) => handleUpdateStatus(activeIssue._id, e.target.value)}
                    >
                      {COLUMNS.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "11px" }}>Assignee</label>
                    <select
                      className="form-select"
                      style={{ height: "36px", padding: "6px 10px" }}
                      value={activeIssue.assignee?._id || "unassigned"}
                      onChange={(e) => handleUpdateAssignee(activeIssue._id, e.target.value)}
                    >
                      <option value="unassigned">Unassigned</option>
                      {project.members.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "11px" }}>Priority</label>
                    <select
                      className="form-select"
                      style={{ height: "36px", padding: "6px 10px" }}
                      value={activeIssue.priority}
                      onChange={(e) => handleUpdatePriority(activeIssue._id, e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Highest">Highest</option>
                    </select>
                  </div>

                  <div style={{ marginTop: "24px", fontSize: "11px", color: "var(--text-muted-dark)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <strong>Reporter:</strong> {activeIssue.reporter?.username}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(activeIssue.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
