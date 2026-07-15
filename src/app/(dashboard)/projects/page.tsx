"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, FolderKanban, Users, Shield, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface UserProfile {
  _id: string;
  username: string;
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

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!name.trim() || !key.trim()) {
      setModalError("Project name and key are required.");
      return;
    }

    if (key.length < 2 || key.length > 10) {
      setModalError("Key must be between 2 and 10 characters.");
      return;
    }

    setModalLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          key: key.toUpperCase().trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setProjects([data.project, ...projects]);
        setIsModalOpen(false);
        // Clear inputs
        setName("");
        setKey("");
        setDescription("");
      } else {
        setModalError(data.error || "Failed to create project");
      }
    } catch (err) {
      setModalError("An unexpected error occurred.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop navigation to project page
    e.preventDefault();

    if (!confirm("Are you sure you want to delete this project? This will permanently delete all associated tasks.")) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProjects(projects.filter((p) => p._id !== projectId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete project");
      }
    } catch (err) {
      alert("Failed to delete project");
    }
  };

  // Suggest key from project name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!key) {
      // Create suggestion: take first uppercase letters or initials
      const words = val.trim().split(/\s+/);
      let suggestedKey = "";
      if (words.length > 1) {
        suggestedKey = words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
      } else {
        suggestedKey = val.slice(0, 3).toUpperCase();
      }
      // sanitize to alphanumeric only
      suggestedKey = suggestedKey.replace(/[^A-Z0-9]/g, "");
      setKey(suggestedKey);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Create and manage workspace projects for your team
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="board-filters">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={48} color="var(--text-muted-dark)" />
          <h3>No projects found</h3>
          <p>Get started by creating your first agile project board.</p>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Create Project</span>
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project) => {
            const isOwner = project.owner._id === user?.id;
            return (
              <Link href={`/projects/${project._id}`} key={project._id}>
                <div className="project-card">
                  <div className="project-card-header">
                    <div className="project-icon-box">
                      {project.key.slice(0, 2)}
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className="project-key">{project.key}</span>
                      {isOwner && (
                        <button
                          className="btn-icon"
                          style={{ color: "var(--text-muted-dark)" }}
                          onClick={(e) => handleDeleteProject(project._id, e)}
                          title="Delete Project"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="project-card-body">
                    <h3>{project.name}</h3>
                    <p>{project.description || "No description provided."}</p>
                  </div>

                  <div className="project-card-footer">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Shield size={14} color="var(--text-muted)" />
                      <span>{project.owner.username}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Users size={14} color="var(--text-muted)" />
                      <div className="project-card-members">
                        {project.members.slice(0, 3).map((member) => (
                          <div
                            key={member._id}
                            className="avatar avatar-sm"
                            style={{ backgroundColor: member.avatarColor }}
                            title={member.username}
                          >
                            {member.username.slice(0, 2)}
                          </div>
                        ))}
                        {project.members.length > 3 && (
                          <div
                            className="avatar avatar-sm"
                            style={{ backgroundColor: "var(--border-color-light)", fontSize: "9px" }}
                          >
                            +{project.members.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project Details</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="modal-body">
                {modalError && <div className="auth-error">{modalError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="projectName">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    className="form-input"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Acme Website Redesign"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="projectKey">
                    Project Key (Short Code)
                  </label>
                  <input
                    type="text"
                    id="projectKey"
                    className="form-input"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="e.g. ACME"
                    maxLength={10}
                    required
                  />
                  <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                    Used as the prefix for all task keys (e.g. ACME-12). Must be unique, 2-10 alphanumeric characters.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="projectDesc">
                    Description
                  </label>
                  <textarea
                    id="projectDesc"
                    className="form-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly state the goal of this workspace project..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple local X icon wrapper if X is not imported properly
function XIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
