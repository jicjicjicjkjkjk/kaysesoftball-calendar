// src/SupportersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
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

function getPaymentLabel(entry) {
  const owed = entry.day;
  const methodRaw = entry.paymentMethod || "unpaid";
  const amount = Number(entry.paymentAmount || 0);
  const method =
    methodRaw === "zelle" || methodRaw === "venmo" ? methodRaw : "unpaid";

  const isPaid = method !== "unpaid" && amount > 0;
  const isFullyPaid = isPaid && amount >= owed;

  if (!isPaid) return "Unpaid";
  if (isFullyPaid) return "Paid";
  return `Partial ($${amount} of $${owed})`;
}

export default function SupportersPage() {
  const [entries, setEntries] = useState([]);
  const [pins, setPins] = useState({});
  const [loading, setLoading] = useState(true);

  // player summary state
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [unlockedPlayerId, setUnlockedPlayerId] = useState(null);
  const [summarySort, setSummarySort] = useState({
    key: "date",
    direction: "asc",
  });
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [entriesRes, pinsRes] = await Promise.all([
          supabase
            .from("calendar_entries")
            .select(
              "id, year, month, day, player_id, supporter_name, note, phone, payment_method, payment_amount, created_at"
            )
            .order("year", { ascending: true })
            .order("month", { ascending: true })
            .order("day", { ascending: true }),
          supabase.from("player_pins").select("player_id, pin"),
        ]);

        if (entriesRes.error) throw entriesRes.error;
        if (pinsRes.error) throw pinsRes.error;

        const mappedEntries = (entriesRes.data || []).map((row) => ({
          id: row.id,
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

        const pinsMap = {};
        (pinsRes.data || []).forEach((row) => {
          pinsMap[row.player_id] = row.pin || "";
        });

        setEntries(mappedEntries);
        setPins(pinsMap);
      } catch (err) {
        console.error("Error loading supporters page data", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const allSupporterRows = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        const da = new Date(a.year, a.month - 1, a.day);
        const db = new Date(b.year, b.month - 1, b.day);
        return da - db;
      })
      .map((entry) => {
        const player = PLAYERS.find((p) => p.id === entry.playerId);
        const playerName = player
          ? `${player.firstName} ${player.lastName}`
          : "Unknown";
        const dateLabel = `${MONTH_NAMES[entry.month - 1]} ${
          entry.day
        }, ${entry.year}`;
        return {
          entry,
          dateLabel,
          playerName,
          paymentLabel: getPaymentLabel(entry),
        };
      });
  }, [entries]);

  // ---------- PLAYER SUMMARY UNLOCK ----------
  const handleUnlockSummary = () => {
    setSummaryError("");
    if (!selectedPlayerId) {
      setSummaryError("Please choose a player.");
      return;
    }
    const player = PLAYERS.find((p) => p.id === selectedPlayerId);
    const defaultPin = player?.pin || "";
    const overridePin = pins[selectedPlayerId];
    const effectivePin = overridePin || defaultPin || "";

    if (!effectivePin) {
      setSummaryError(
        "No PIN has been set for this player yet. Please contact the coaches."
      );
      return;
    }

    if (pinInput.trim() !== effectivePin) {
      setSummaryError("Incorrect PIN. Please try again.");
      return;
    }

    setUnlockedPlayerId(selectedPlayerId);
  };

  const playerSummaryRows = useMemo(() => {
    if (!unlockedPlayerId) return [];

    const filtered = entries.filter((e) => e.playerId === unlockedPlayerId);

    const rows = filtered.map((entry) => {
      const dateObj = new Date(entry.year, entry.month - 1, entry.day);
      const dateLabel = `${MONTH_NAMES[entry.month - 1]} ${
        entry.day
      }, ${entry.year}`;
      return {
        entry,
        dateObj,
        dateLabel,
        paymentLabel: getPaymentLabel(entry),
      };
    });

    const dir = summarySort.direction === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
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
          const sa = (a.paymentLabel || "").toLowerCase();
          const sb = (b.paymentLabel || "").toLowerCase();
          if (sa < sb) return -1 * dir;
          if (sa > sb) return 1 * dir;
          return 0;
        }
        default:
          return 0;
      }
    });
  }, [entries, unlockedPlayerId, summarySort]);

  const summaryTotals = useMemo(() => {
    if (!unlockedPlayerId) return { days: 0, sum: 0 };
    const rows = entries.filter((e) => e.playerId === unlockedPlayerId);
    return {
      days: rows.length,
      sum: rows.reduce((acc, e) => acc + e.day, 0),
    };
  }, [entries, unlockedPlayerId]);

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

  const sortIndicator = (key) => {
    if (summarySort.key !== key) return "";
    return summarySort.direction === "asc" ? " ▲" : " ▼";
  };

  const unlockedPlayer = unlockedPlayerId
    ? PLAYERS.find((p) => p.id === unlockedPlayerId)
    : null;

  return (
    <div className="page">
      <header className="header">
        <div className="header-bottom-row">
          <div className="header-links">
            <Link to="/" className="nav-link">
              ← Back to Calendar
            </Link>
          </div>
        </div>
      </header>

      <main className="supporters-main">
        <section className="how-it-works">
          <h2>Supporters</h2>
          <p>
            This page shows all claimed dates and whether the team has marked
            the payment as received. If you see anything that looks incorrect,
            please reach out to the coaches.
          </p>
        </section>

        {loading ? (
          <p style={{ padding: "1rem" }}>Loading supporters…</p>
        ) : allSupporterRows.length === 0 ? (
          <p style={{ padding: "1rem" }}>No dates have been claimed yet.</p>
        ) : (
          <section className="admin-panel">
            <h3>All Supporters – Public View</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Supporter</th>
                    <th>Player</th>
                    <th>Note</th>
                    <th>Payment status</th>
                  </tr>
                </thead>
                <tbody>
                  {allSupporterRows.map(
                    ({ entry, dateLabel, playerName, paymentLabel }) => (
                      <tr key={entry.id}>
                        <td>{dateLabel}</td>
                        <td>{entry.supporterName}</td>
                        <td>{playerName}</td>
                        <td>{entry.note}</td>
                        <td>{paymentLabel}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* PLAYER SUMMARY */}
        <section className="admin-panel" style={{ marginTop: "2rem" }}>
          <h3>Player Fundraising Summary (Families Only)</h3>
          <p className="admin-note">
            Players and families can view a summary of the dates sold for a
            specific player. Choose your player, enter their 4-digit PIN, and
            click <strong>Show My Summary</strong>.
          </p>

          <div
            className="admin-filters"
            style={{ alignItems: "flex-end", flexWrap: "wrap" }}
          >
            <div style={{ minWidth: "200px" }}>
              <label>
                Player
                <select
                  value={selectedPlayerId}
                  onChange={(e) => {
                    setSelectedPlayerId(e.target.value);
                    setSummaryError("");
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
            </div>
            <div style={{ minWidth: "150px", marginLeft: "1rem" }}>
              <label>
                PIN
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) =>
                    setPinInput(
                      e.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="filter-button"
              style={{ marginLeft: "1rem", marginTop: "0.5rem" }}
              onClick={handleUnlockSummary}
            >
              Show My Summary
            </button>
          </div>
          {summaryError && (
            <p style={{ color: "crimson", marginTop: "0.5rem" }}>
              {summaryError}
            </p>
          )}

          {unlockedPlayer && (
            <>
              <h4 style={{ marginTop: "1.5rem" }}>
                {unlockedPlayer.firstName} {unlockedPlayer.lastName} #
                {unlockedPlayer.number}
              </h4>
              <p className="admin-note">
                Total days sold: <strong>{summaryTotals.days}</strong>, Sum of
                date numbers: <strong>{summaryTotals.sum}</strong>
              </p>

              {playerSummaryRows.length === 0 ? (
                <p>No dates sold yet for this player.</p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th
                          className="sortable-col"
                          onClick={() => handleSummarySort("date")}
                        >
                          Date{sortIndicator("date")}
                        </th>
                        <th
                          className="sortable-col"
                          onClick={() => handleSummarySort("supporter")}
                        >
                          Supporter{sortIndicator("supporter")}
                        </th>
                        <th>Note</th>
                        <th
                          className="sortable-col"
                          onClick={() => handleSummarySort("status")}
                        >
                          Payment{sortIndicator("status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerSummaryRows.map(
                        ({ entry, dateLabel, paymentLabel }) => (
                          <tr key={entry.id}>
                            <td>{dateLabel}</td>
                            <td>{entry.supporterName}</td>
                            <td>{entry.note}</td>
                            <td>{paymentLabel}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
