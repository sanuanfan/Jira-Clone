"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface Project {
  _id: string;
  name: string;
  key: string;
  members: Array<{
    _id: string;
    username: string;
    avatarColor: string;
  }>;
}

export default function CreateIssueModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Task");
  const [priority, setPriority] = useState("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);
  const [error, setError] = useState("");

  // Fetch all projects for the dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
          if (data.projects && data.projects.length > 0) {
            setSelectedProjectId(data.projects[0]._id);
          }
        }
      } catch (err) {
        console.error("Error fetching projects", err);
      } finally {
        setFetchingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch project details (for member assignments) when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      return;
    }
    const fetchProjectDetails = async () => {
      try {
        const res = await fetch(`/api/projects/${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedProject(data.project);
          // Reset assignee when project changes
          setAssigneeId("");
        }
      } catch (err) {
        console.error("Error fetching project details", err);
      }
    };
    fetchProjectDetails();
  }, [selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          assigneeId: assigneeId === "" ? null : assigneeId,
          projectId: selectedProjectId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onClose();
        // Redirect to the project details page
        router.push(`/projects/${selectedProjectId}`);
        router.refresh();
      } else {
        setError(data.error || "Failed to create issue");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Issue</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="projectSelect">
                Project
              </label>
              {fetchingProjects ? (
                <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading projects...</div>
              ) : projects.length === 0 ? (
                <div style={{ color: "var(--danger)", fontSize: "14px" }}>
                  No projects found. Please create a project first!
                </div>
              ) : (
                <select
                  id="projectSelect"
                  className="form-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                >
                  {projects.map((proj) => (
                    <option key={proj._id} value={proj._id}>
                      {proj.name} ({proj.key})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="issueType">
                  Issue Type
                </label>
                <select
                  id="issueType"
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="Task">Task</option>
                  <option value="Story">Story</option>
                  <option value="Bug">Bug</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="issuePriority">
                  Priority
                </label>
                <select
                  id="issuePriority"
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Highest">Highest</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="issueTitle">
                Summary (Title)
              </label>
              <input
                type="text"
                id="issueTitle"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement OAuth logic"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="issueDesc">
                Description
              </label>
              <textarea
                id="issueDesc"
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the details of this task..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="issueAssignee">
                Assignee
              </label>
              <select
                id="issueAssignee"
                className="form-select"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {selectedProject?.members?.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || projects.length === 0}
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
