"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

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
        {/* Loading Spinner */}
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
        <h3 style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "0.5px" }}>Loading Jira Clone...</h3>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
