"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const REQUIRED_CLICKS = 5;
const WINDOW_MS = 5000;

export default function MastheadUnlock() {
  const router = useRouter();
  const clicksRef = useRef([]);
  const [isChecking, setIsChecking] = useState(false);

  async function unlock() {
    const passcode = window.prompt("Admin password");

    if (!passcode) {
      return;
    }

    setIsChecking(true);

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ passcode })
      });

      if (!response.ok) {
        window.alert("Incorrect admin password.");
        return;
      }

      router.push("/publish");
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
      unlock();
    }
  }

  return (
    <h1>
      <button className="masthead-title-button" type="button" onClick={handleTitleClick} disabled={isChecking}>
        The Hari Herald
      </button>
    </h1>
  );
}
