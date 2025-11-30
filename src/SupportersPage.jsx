import React, { useEffect, useState } from "react";
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

function getPaymentMeta(entry) {
  const owed = entry.day;
  const methodRaw = entry.paymentMethod || "unpaid";
  const amount = Number(entry.paymentAmount || 0);

  const method =
    methodRaw === "zelle" || methodRaw === "venmo" ? methodRaw : "unpaid";

  const isPaid = method !== "unpaid" && amount > 0;
  const isFullyPaid = isPaid && amount >= owed;

  let label;
  if (!isPaid) {
    label = "Unpaid";
  } else {
    const base = method === "zelle" ? "Paid via Zelle" : "Paid via Venmo";
    if (isFullyPaid) {
      label = `${base} (full $${amount})`;
    } else {
      label = `${base} (partial $${amount} of $${owed})`;
    }
  }

  return { owed, amount, method, isPaid, isFullyPaid, label };
}

function mapEntryFromRow(row) {
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    day: row.day,
    supporterName: row.supporter_name,
    playerId: row.player_id,
    note: row.note || "",
    phone: row.phone || "",
    paymentMethod: row.payment_method || "unpaid",
    paymentAmount: Number(row.payment_amount || 0),
    createdAt: row.created_at,
  };
}

export default function SupportersPage() {
  const [entries, setEntries] = useState([]);
  const [playerPins, setPlayerPins] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedPlayerId, setSelectedPlayerId] = useState(null); // for supporters table
  const [expandedSupporter, setExpandedSupporter] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    key: "supporter", // supporter | days
    direction: "asc",
  });

  // For "FOR THUNDER PLAYERS" summary button
  const [summaryPlayerId, setSummaryPlayerId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [entriesRes, pinsRes] = await Promise.all([
          supabase
            .from("calendar_entries")
            .select("*")
            .eq("year", CURRENT_YEAR)
            .order("month", { ascending: true })
            .order("day", { ascending: true }),
          supabase.from("player_pins").select("*"),
        ]);

        if (entriesRes.error) throw entriesRes.error;
        if (pinsRes.error) throw pinsRes.error;

        setEntries((entriesRes.data || []).map(mapEntryFromRow));

        const pinMap = {};
        (pinsRes.data || []).forEach((row) => {
          pinMap[row.player_id] = row.pin || "";
        });
        setPlayerPins(pinMap);
      } catch (err) {
        console.error("Error loading supporter data from Supabase", err);
        alert(
          "There was a problem loading the supporter view from the shared database."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- COMMON DERIVED DATA ---------- */

  const selectedPlayer =
    PLAYERS.find((p) => p.id === selectedPlayerId) || null;

  const playerEntries = selectedPlayer
    ? entries.filter((e) => e.playerId === selectedPlayer.id)
    : [];

  // Build supporter summary for the selected player
  const supporterMap = new Map();
  for (const e of playerEntries) {
    const key = e.supporterName || "Unknown supporter";
    if (!supporterMap.has(key)) {
      supporterMap.set(key, {
        supporterName: key,
        dates: [],
        totalDays: 0,
        phones: [],
        hasPaid: false,
        hasUnpaid: false,
      });
    }
    const rec = supporterMap.get(key);
    rec.dates.push(e);
    rec.totalDays += 1;
    if (e.phone) rec.phones.push(e.phone);
    const meta = getPaymentMeta(e);
    if (meta.isPaid) rec.hasPaid = true;
    if (!meta.isPaid) rec.hasUnpaid = true;
  }

  let supporterRows = Array.from(supporterMap.values());

  // Sort supporters (by name or number of dates)
  supporterRows.sort((a, b) => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    switch (sortConfig.key) {
      case "supporter": {
        const sa = a.supporterName.toLowerCase();
        const sb = b.supporterName.toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
      }
      case "days":
        return (a.totalDays - b.totalDays) * dir;
      default:
        return 0;
    }
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
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
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const handleSupporterClick = (row) => {
    if (!selectedPlayer) return;

    const entered = window.prompt(
      `Enter the 4-digit player PIN or the last 4 digits of the phone number for ${row.supporterName} to view their dates:`
    );
    if (entered == null) return;

    const code = entered.trim();
    const playerPin = (playerPins[selectedPlayer.id] || "").trim();

    const phoneMatch = row.dates.some((d) =>
      (d.phone || "").endsWith(code)
    );

    if (code && (code === playerPin || phoneMatch)) {
      setExpandedSupporter((prev) =>
        prev === row.supporterName ? null : row.supporterName
      );
    } else {
      alert(
        "PIN did not match this player or any supporter phone on file. Please try again."
      );
    }
  };

  /* ---------- PLAYER SUMMARY (FOR THUNDER PLAYERS BUTTON) ---------- */

  const handlePlayerSummaryButton = () => {
    const entered = window.prompt(
      "FOR THUNDER PLAYERS: enter your 4-digit player PIN to view your personal fundraising summary."
    );
    if (entered == null) return;
    const code = entered.trim();

    if (!code) {
      alert("Please enter a 4-digit PIN.");
      return;
    }

    // Find which player this PIN belongs to
    const match = Object.entries(playerPins).find(
      ([playerId, pin]) => (pin || "").trim() === code
    );

    if (!match) {
      alert("No player found with that PIN. Check with your coach.");
      return;
    }

    const [playerId] = match;
    setSummaryPlayerId(playerId);
  };

  const summaryPlayer =
    PLAYERS.find((p) => p.id === summaryPlayerId) || null;

  const summaryEntries = summaryPlayer
    ? entries.filter((e) => e.playerId === summaryPlayer.id)
    : [];

  const summaryDays = summaryEntries.length;
  const summarySumDates = summaryEntries.reduce((sum, e) => sum + e.day, 0);

  return (
    <div className="page supporters-page">
      <header className="header">
        <div className="header-top-row">
          <h1>Thunder 12U Teal – Supporters</h1>
          <Link to="/" className="nav-link">
            ← Back to Calendar
          </Link>
        </div>
        <p className="supporter-intro">
          Pick a player below to see who has supported them and how many dates
          each supporter purchased. Supporters can unlock their detailed dates
          with a PIN, and Thunder players can view their own overall summary.
        </p>
      </header>

      {loading ? (
        <main style={{ padding: "2rem", textAlign: "center" }}>
          Loading supporter data…
        </main>
      ) : (
        <main className="supporters-main">
          {/* TOP: Player supporters table (what you described) */}
          <section className="supporters-player-list">
            <h2>Supporters by Player</h2>
            <div className="player-pill-row">
              {PLAYERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={
                    selectedPlayerId === p.id
                      ? "player-pill selected"
                      : "player-pill"
                  }
                  onClick={() => {
                    setSelectedPlayerId(p.id);
                    setExpandedSupporter(null);
                  }}
                >
                  #{p.number} {p.firstName}
                </button>
              ))}
            </div>
          </section>

          {selectedPlayer ? (
            <section className="supporters-table-section">
              <h3>
                Supporters for {selectedPlayer.firstName}{" "}
                {selectedPlayer.lastName}
              </h3>
              {supporterRows.length === 0 ? (
                <p>No dates have been sold yet for this player.</p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th
                          className="sortable-col"
                          onClick={() => handleSort("supporter")}
                        >
                          Supporter{sortIndicator("supporter")}
                        </th>
                        <th
                          className="sortable-col"
                          onClick={() => handleSort("days")}
                        >
                          Number of dates{sortIndicator("days")}
                        </th>
                        <th>Payment status (overall)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supporterRows.map((row) => {
                        let paymentSummary = "Unpaid";
                        if (row.hasPaid && row.hasUnpaid) {
                          paymentSummary = "Some dates paid, some unpaid";
                        } else if (row.hasPaid) {
                          paymentSummary = "All paid";
                        }

                        const isExpanded =
                          expandedSupporter === row.supporterName;

                        return (
                          <React.Fragment key={row.supporterName}>
                            <tr
                              className="clickable-row"
                              onClick={() => handleSupporterClick(row)}
                            >
                              <td>{row.supporterName}</td>
                              <td>{row.totalDays}</td>
                              <td>{paymentSummary}</td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={3}>
                                  <div className="supporter-detail">
                                    <strong>
                                      Detailed dates for {row.supporterName}
                                    </strong>
                                    <table className="nested-table">
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th>Phone (private)</th>
                                          <th>Payment status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {row.dates.map((d) => {
                                          const meta = getPaymentMeta(d);
                                          const dateStr = `${
                                            MONTH_NAMES[d.month - 1]
                                          } ${d.day}, ${d.year}`;
                                          return (
                                            <tr key={d.id}>
                                              <td>{dateStr}</td>
                                              <td>{d.phone}</td>
                                              <td>{meta.label}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section style={{ padding: "1.5rem" }}>
              <p>Select a player above to see their supporters.</p>
            </section>
          )}

          {/* SECOND: FOR THUNDER PLAYERS button + personal summary */}
          <section className="supporters-summary-section">
            <h2>For Thunder Players</h2>
            <p>
              Players can view their personal fundraising summary (total dates
              sold and sum of date numbers). You&apos;ll need your 4-digit
              player PIN from Coach Justin.
            </p>
            <button
              type="button"
              className="admin-toggle"
              onClick={handlePlayerSummaryButton}
            >
              FOR THUNDER PLAYERS – View My Summary
            </button>

            {summaryPlayer && (
              <div className="supporters-summary">
                <h3>
                  Fundraising Summary – {summaryPlayer.firstName}{" "}
                  {summaryPlayer.lastName}
                </h3>
                <p>
                  <strong>Total days sold:</strong> {summaryDays}
                </p>
                <p>
                  <strong>Sum of date numbers:</strong> {summarySumDates}
                </p>
                <p className="supporter-note">
                  Example: December 12 + August 27 = 12 + 27 = 39.
                </p>
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
