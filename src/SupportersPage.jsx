import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { PLAYERS } from "./players";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "kaysesoftball_calendar_entries_v1";
const PIN_STORAGE_KEY = "kaysesoftball_player_pins_v1";

// Helper to build payment meta (Paid / Unpaid only)
function getPaymentMeta(entry) {
  const owed = entry.day;
  const methodRaw = entry.paymentMethod || "unpaid";
  const amount = Number(entry.paymentAmount || 0);
  const method =
    methodRaw === "zelle" || methodRaw === "venmo" ? methodRaw : "unpaid";

  const isPaid = method !== "unpaid" && amount > 0 && amount >= owed;
  return { isPaid };
}

export default function SupportersPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // PINs loaded from Supabase + localStorage
  const [pinOverrides, setPinOverrides] = useState({});

  // Player summary state
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [unlockedPlayerId, setUnlockedPlayerId] = useState(null);
  const [pinError, setPinError] = useState("");
  const [summarySort, setSummarySort] = useState({
    key: "date", // "date" | "supporter" | "status"
    direction: "asc",
  });

  // All supporters table sort
  const [supportersSort, setSupportersSort] = useState({
    key: "date", // "date" | "supporter" | "player" | "status"
    direction: "asc",
  });

  // -------- Load entries --------
  useEffect(() => {
    const loadEntries = async () => {
      // 1) Fast localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setEntries(JSON.parse(raw));
        }
      } catch (e) {
        console.error("Failed to load entries from localStorage", e);
      }

      // 2) Supabase (source of truth)
      try {
        const { data, error } = await supabase
          .from("calendar_entries")
          .select(
            `
            year,
            month,
            day,
            player_id,
            supporter_name,
            note,
            phone,
            payment_method,
            payment_amount,
            created_at
          `
          )
          .order("year", { ascending: true })
          .order("month", { ascending: true })
          .order("day", { ascending: true });

        if (error) throw error;

        const normalized = (data || []).map((row) => ({
          // Use a simple composite key so it stays stable
          id: `${row.year}-${row.month}-${row.day}-${row.player_id || "na"}`,
          year: row.year,
          month: row.month,
          day: row.day,
          playerId: row.player_id,
          supporterName: row.supporter_name,
          note: row.note || "",
          phone: row.phone || "",
          paymentMethod: row.payment_method || "unpaid",
          paymentAmount: Number(row.payment_amount || 0),
          createdAt: row.created_at,
        }));

        setEntries(normalized);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error("Failed to load entries from Supabase", err);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  // -------- Load PINs --------
  useEffect(() => {
    const loadPins = async () => {
      // localStorage first
      try {
        const raw = localStorage.getItem(PIN_STORAGE_KEY);
        if (raw) {
          setPinOverrides(JSON.parse(raw));
        }
      } catch (e) {
        console.error("Failed to load pin overrides from localStorage", e);
      }

      // Supabase next
      try {
        const { data, error } = await supabase
          .from("player_pins")
          .select("player_id, pin");
        if (error) throw error;

        const map = {};
        (data || []).forEach((row) => {
          map[row.player_id] = row.pin || "";
        });
        setPinOverrides(map);
        try {
          localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(map));
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error("Failed to load player pins from Supabase", err);
      }
    };

    loadPins();
  }, []);

  // -------- All supporters table (simple view) --------

  const baseSortedSupporters = [...entries].sort((a, b) => {
    const da = new Date(a.year, a.month - 1, a.day);
    const db = new Date(b.year, b.month - 1, b.day);
    return da - db;
  });

  const supportersRows = baseSortedSupporters.map((e) => {
    const player = PLAYERS.find((p) => p.id === e.playerId);
    const playerName = player
      ? `${player.firstName} ${player.lastName}`
      : "Unknown";
    const dateObj = new Date(e.year, e.month - 1, e.day);
    const meta = getPaymentMeta(e);
    return { entry: e, playerName, dateObj, meta };
  });

  const sortedSupportersRows = [...supportersRows].sort((a, b) => {
    const dir = supportersSort.direction === "asc" ? 1 : -1;
    switch (supportersSort.key) {
      case "date":
        if (a.dateObj < b.dateObj) return -1 * dir;
        if (a.dateObj > b.dateObj) return 1 * dir;
        return 0;
      case "supporter": {
        const sa = (a.entry.supporterName || "").toLowerCase();
        const sb = (b.entry.supporterName || "").toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
      }
      case "player": {
        const pa = (a.playerName || "").toLowerCase();
        const pb = (b.playerName || "").toLowerCase();
        if (pa < pb) return -1 * dir;
        if (pa > pb) return 1 * dir;
        return 0;
      }
      case "status": {
        const sa = a.meta.isPaid ? "paid" : "unpaid";
        const sb = b.meta.isPaid ? "paid" : "unpaid";
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
      }
      default:
        return 0;
    }
  });

  const handleSupportersSort = (key) => {
    setSupportersSort((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const supportersSortIndicator = (key) => {
    if (supportersSort.key !== key) return "";
    return supportersSort.direction === "asc" ? " ▲" : " ▼";
  };

  // -------- Player summary PIN check --------

  const handleUnlockSummary = () => {
    setPinError("");
    if (!selectedPlayerId) {
      setPinError("Please select a player.");
      return;
    }

    const player = PLAYERS.find((p) => p.id === selectedPlayerId);
    const fallbackPin = player?.pin || "";
    const storedPin = pinOverrides[selectedPlayerId] ?? fallbackPin ?? "";

    // If there is a PIN configured, enforce it.
    if (storedPin && pinInput !== storedPin) {
      setPinError("Incorrect PIN. Please try again.");
      setUnlockedPlayerId(null);
      return;
    }

    // No PIN configured or correct PIN
    setUnlockedPlayerId(selectedPlayerId);
    setPinError("");
  };

  // Rows for unlocked player
  const playerEntries = unlockedPlayerId
    ? entries.filter((e) => e.playerId === unlockedPlayerId)
    : [];

  const playerRows = playerEntries
    .map((e) => {
      const dateObj = new Date(e.year, e.month - 1, e.day);
      const meta = getPaymentMeta(e);
      return { entry: e, dateObj, meta };
    })
    .sort((a, b) => a.dateObj - b.dateObj);

  const totalDaysSold = playerRows.length;
  const sumOfDates = playerRows.reduce((sum, row) => sum + row.entry.day, 0);

  const sortedPlayerRows = [...playerRows].sort((a, b) => {
    const dir = summarySort.direction === "asc" ? 1 : -1;
    switch (summarySort.key) {
      case "date":
        if (a.dateObj < b.dateObj) return -1 * dir;
        if (a.dateObj > b.dateObj) return 1 * dir;
        return 0;
      case "supporter": {
        const sa = (a.entry.supporterName || "").toLowerCase();
        const sb = (b.entry.supporterName || "").toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
      }
      case "status": {
        const sa = a.meta.isPaid ? "paid" : "unpaid";
        const sb = b.meta.isPaid ? "paid" : "unpaid";
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
      }
      default:
        return 0;
    }
  });

  const handleSummarySort = (key) => {
    setSummarySort((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const summarySortIndicator = (key) => {
    if (summarySort.key !== key) return "";
    return summarySort.direction === "asc" ? " ▲" : " ▼";
  };

  // ---------------- RENDER ----------------

  return (
    <div className="page supporters-page">
      <header className="header">
        <div className="header-inner">
          <h1>Thunder 12U Teal – Supporters</h1>
          <p>
            Thank you to every supporter who has purchased a calendar date! This
            page lets you verify your entry and, for families, see a private
            summary of fundraising for your player.
          </p>
          <div className="header-links">
            <Link to="/" className="nav-link">
              ← Back to Calendar
            </Link>
          </div>
        </div>
      </header>

      <main className="supporters-main">
        {/* ALL SUPPORTERS TABLE – similar to the simple page you had before */}
        <section className="supporters-section">
          <h2>All Supporters</h2>
          {loading ? (
            <p>Loading supporters…</p>
          ) : sortedSupportersRows.length === 0 ? (
            <p>No calendar dates have been claimed yet.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSupportersSort("date")}
                      className="sortable-col"
                    >
                      Date{supportersSortIndicator("date")}
                    </th>
                    <th
                      onClick={() => handleSupportersSort("supporter")}
                      className="sortable-col"
                    >
                      Supporter{supportersSortIndicator("supporter")}
                    </th>
                    <th
                      onClick={() => handleSupportersSort("player")}
                      className="sortable-col"
                    >
                      Player{supportersSortIndicator("player")}
                    </th>
                    <th>Note</th>
                    <th
                      onClick={() => handleSupportersSort("status")}
                      className="sortable-col"
                    >
                      Payment status{supportersSortIndicator("status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSupportersRows.map(({ entry, playerName, meta }) => (
                    <tr key={entry.id}>
                      <td>
                        {MONTH_NAMES[entry.month - 1]} {entry.day},{" "}
                        {entry.year}
                      </td>
                      <td>{entry.supporterName}</td>
                      <td>{playerName}</td>
                      <td>{entry.note}</td>
                      <td>{meta.isPaid ? "Paid" : "Unpaid"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* PLAYER SUMMARY – PIN gated, similar to admin summary but per player */}
        <section className="supporters-section">
          <h2>Player Fundraising Summary</h2>
          <p className="supporters-note">
            Families can see a private summary of their player&apos;s
            fundraising. Select your player, enter their 4-digit PIN, and then
            view your entries. This view only shows dates sold and payment
            status for your player.
          </p>

          <div className="player-summary-controls">
            <label>
              Player
              <select
                value={selectedPlayerId}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  setPinError("");
                  setUnlockedPlayerId(null);
                }}
              >
                <option value="">Select a player…</option>
                {PLAYERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} #{p.number}
                  </option>
                ))}
              </select>
            </label>

            <label>
              PIN
              <input
                type="password"
                value={pinInput}
                onChange={(e) =>
                  setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                maxLength={4}
                placeholder="4 digits"
              />
            </label>

            <button
              type="button"
              className="admin-toggle"
              onClick={handleUnlockSummary}
            >
              View My Player Summary
            </button>
          </div>

          {pinError && <p className="error-text">{pinError}</p>}

          {unlockedPlayerId && (
            <div className="player-summary-results">
              <h3>
                Summary for{" "}
                {
                  PLAYERS.find((p) => p.id === unlockedPlayerId)?.firstName
                }{" "}
                {
                  PLAYERS.find((p) => p.id === unlockedPlayerId)?.lastName
                }
              </h3>
              <p className="supporters-note">
                <strong>Total days sold:</strong> {totalDaysSold} &nbsp;•&nbsp;
                <strong>Sum of date numbers:</strong> {sumOfDates}
              </p>

              {sortedPlayerRows.length === 0 ? (
                <p>No dates have been sold yet for this player.</p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th
                          onClick={() => handleSummarySort("date")}
                          className="sortable-col"
                        >
                          Date{summarySortIndicator("date")}
                        </th>
                        <th
                          onClick={() => handleSummarySort("supporter")}
                          className="sortable-col"
                        >
                          Supporter{summarySortIndicator("supporter")}
                        </th>
                        <th>Note</th>
                        <th
                          onClick={() => handleSummarySort("status")}
                          className="sortable-col"
                        >
                          Payment status{summarySortIndicator("status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayerRows.map(({ entry, meta }) => (
                        <tr key={entry.id}>
                          <td>
                            {MONTH_NAMES[entry.month - 1]} {entry.day},{" "}
                            {entry.year}
                          </td>
                          <td>{entry.supporterName}</td>
                          <td>{entry.note}</td>
                          <td>{meta.isPaid ? "Paid" : "Unpaid"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <small>© {CURRENT_YEAR} Kayse Softball • kaysesoftball.com</small>
      </footer>
    </div>
  );
}
