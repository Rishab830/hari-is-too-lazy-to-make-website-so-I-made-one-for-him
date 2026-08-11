"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const REQUIRED_CLICKS = 5;
const WINDOW_MS = 5000;

export default function MastheadUnlock() {
  const router = useRouter();
  const clicksRef = useRef([]);
  const passwordRef = useRef(null);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const closeGate = useCallback(() => {
    if (isChecking) {
      return;
    }

    setIsGateOpen(false);
    setPassword("");
    setError("");
  }, [isChecking]);

  useEffect(() => {
    if (!isGateOpen) {
      return undefined;
    }

    passwordRef.current?.focus();

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        closeGate();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeGate, isGateOpen]);

  function openGate() {
    setPassword("");
    setError("");
    setIsGateOpen(true);
  }

  async function unlock(event) {
    event.preventDefault();
    setError("");
    setIsChecking(true);

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ passcode: password })
      });

      if (!response.ok) {
        setError("Password did not match.");
        return;
      }

      router.push("/publish");
      setIsGateOpen(false);
    } finally {
      setIsChecking(false);
    }
  }

  function handleTitleClick() {
    if (isChecking) {
      return;
    }

    const now = Date.now();
    clicksRef.current = [...clicksRef.current.filter((time) => now - time <= WINDOW_MS), now];

    if (clicksRef.current.length >= REQUIRED_CLICKS) {
      clicksRef.current = [];
      openGate();
    }
  }

  return (
    <>
      <h1>
        <button className="masthead-title-button" type="button" onClick={handleTitleClick} disabled={isChecking}>
          The Hari Herald
        </button>
      </h1>

      {isGateOpen && (
        <div className="admin-gate-backdrop" role="presentation" onMouseDown={closeGate}>
          <section
            aria-labelledby="admin-gate-title"
            aria-modal="true"
            className="admin-gate"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="admin-gate-close" type="button" onClick={closeGate} aria-label="Close admin gate">
              x
            </button>
            <p className="kicker">Editor Access</p>
            <h2 id="admin-gate-title">Enter Admin Password</h2>
            <form className="admin-gate-form" onSubmit={unlock}>
              <label>
                Password
                <input
                  ref={passwordRef}
                  name="adminPassword"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="button" type="submit" disabled={isChecking}>
                {isChecking ? "Checking..." : "Open publish desk"}
              </button>
              {error && (
                <p className="form-status error" role="status">
                  {error}
                </p>
              )}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
