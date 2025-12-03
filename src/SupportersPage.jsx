import React, { useState, useEffect, useMemo } from "react";
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

// Always use players sorted by first name
const SORTED_PLAYERS = [...PLAYERS].sort((a, b) =>
  a.firstName.localeCompare(b.firstName)
);

// Map DB row -> app entry (same shape as App.jsx)
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

function getPaymentMeta(entry) {
  const owed = entry.day;
  const methodRaw = entry.paymentMethod || "unpaid";
  const amount = Number(entry.paymentAmount || 0);

  const method =
    methodRaw === "zelle" || methodRaw === "venmo" ? methodRaw : "unpaid";

  const isPaid = method !== "unpaid" && amount > 0;
  const isFullyPaid = isPaid && amount >= owed;

  return { owed, amount, method, isPaid, isFullyPaid };
}

// Helper to sort by first name (assumes "First Last")
function getFirstNameFromFull(name) {
  if (!name) return "Unknown";
  const trimmed = name.trim();
  if (!trimmed) return "Unknown";
  return trimmed.split(/\s+/)[0];
}

export default function SupportersPage() {
  const [entries, setEntries] = useState([]);
  const [playerPins, setPlayerPins] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Public supporters view (no player selection)
  const [selectedSupporterName, setSelectedSupporterName] = useState("");
  const [supporterPinInput, setSupporterPinInput] = useState("");
  const [supporterPinError, setSupporterPinError] = useState("");
  const [supporterUnlocked, setSupporterUnlocked] = useState(false);

  // Thunder players summary
  const [summaryPlayerId, setSummaryPlayerId] = useState(
    SORTED_PLAYERS[0]?.id || ""
  );
  const [summaryPinInput, setSummaryPinInput] = useState("");
  const [summaryPinError, setSummaryPinError] = useState("");
  const [summaryUnlocked, setSummaryUnlocked] = useState(false);

  // Sorting for Thunder-player supporter summary table
  const [summarySortKey, setSummarySortKey] = useState("supporter");
  const [summarySortDir, setSummarySortDir] = useState("asc");

  // Sorting for Thunder-player entry-level table
  const [detailSortKey, setDetailSortKey] = useState("date"); // "date" | "supporter" | "status"
  const [detailSortDir, setDetailSortDir] = useState("asc");

  useEffect(() => {
    loadSupportersData();
  }, []);

  async function loadSupportersData() {
    setIsLoading(true);
    try {
      const [entriesRes, pinsRes] = await Promise.all([
        supabase
          .from("calendar_entries")
          .select("*")
          .order("year", { ascending: true })
          .order("month", { ascending: true })
          .order("day", { ascending: true }),
        supabase.from("player_pins").select("*"),
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (pinsRes.error) throw pinsRes.error;

      const mappedEntries = (entriesRes.data || []).map(mapEntryFromRow);
      setEntries(mappedEntries);

      const pinMap = {};
      (pinsRes.data || []).forEach((row) => {
        pinMap[row.player_id] = row.pin || "";
      });
      setPlayerPins(pinMap);
    } catch (err) {
      console.error("Error loading supporters data", err);
      alert(
        "There was a problem loading supporter information from the shared database. Please try refreshing the page."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ---------- Derived data for the public supporters view ----------

  // Group by supporter across ALL entries
  const supporterGroups = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const key = e.supporterName || "Unknown Supporter";
      if (!map.has(key)) {
        map.set(key, { supporterName: key, count: 0 });
      }
      map.get(key).count += 1;
    }
    const groups = Array.from(map.values());
    groups.sort((a, b) =>
      getFirstNameFromFull(a.supporterName).localeCompare(
        getFirstNameFromFull(b.supporterName)
      )
    );
    return groups;
  }, [entries]);

  const supporterEntries = useMemo(() => {
    if (!selectedSupporterName) return [];
    return entries.filter(
      (e) => (e.supporterName || "Unknown Supporter") === selectedSupporterName
    );
  }, [entries, selectedSupporterName]);

  // Summary for unlocked supporter
  const supporterSummary = useMemo(() => {
    if (!supporterUnlocked || supporterEntries.length === 0) return null;

    let totalDates = 0;
    let totalDollars = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (const e of supporterEntries) {
      const meta = getPaymentMeta(e);
      totalDates += 1;
      totalDollars += e.day;
      if (meta.isFullyPaid) {
        totalPaid += e.day;
      } else {
        totalUnpaid += e.day;
      }
    }

    return { totalDates, totalDollars, totalPaid, totalUnpaid };
  }, [supporterEntries, supporterUnlocked]);

  // ---------- PIN check for supporter detail ----------

  const handleSelectSupporter = (name) => {
    setSelectedSupporterName(name);
    setSupporterPinInput("");
    setSupporterPinError("");
    setSupporterUnlocked(false);
  };

  const handleUnlockSupporter = () => {
    if (!selectedSupporterName || supporterEntries.length === 0) {
      setSupporterPinError("Please select a supporter first.");
      return;
    }
    const pin = supporterPinInput.trim();
    if (!pin) {
      setSupporterPinError("Enter PIN (player PIN or last 4 digits of phone).");
      return;
    }

    let valid = false;

    // 1) Valid if matches any player PIN for any player this supporter has supported
    const uniquePlayerIds = Array.from(
      new Set(supporterEntries.map((e) => e.playerId).filter(Boolean))
    );
    for (const pid of uniquePlayerIds) {
      const playerPin = playerPins[pid] || "";
      if (playerPin && pin === playerPin) {
        valid = true;
        break;
      }
    }

    // 2) Or matches last 4 of any phone on these entries
    if (!valid) {
      valid = supporterEntries.some((e) => {
        const digits = (e.phone || "").replace(/\D/g, "");
        if (digits.length < 4) return false;
        const last4 = digits.slice(-4);
        return last4 === pin;
      });
    }

    if (!valid) {
      setSupporterPinError("Incorrect PIN. Please try again.");
      setSupporterUnlocked(false);
    } else {
      setSupporterPinError("");
      setSupporterUnlocked(true);
    }
  };

  // ---------- Thunder players summary section ----------

  const summaryPlayer = useMemo(
    () => SORTED_PLAYERS.find((p) => p.id === summaryPlayerId) || null,
    [summaryPlayerId]
  );

  const entriesForSummaryPlayer = useMemo(
    () => entries.filter((e) => e.playerId === summaryPlayerId),
    [entries, summaryPlayerId]
  );

  // Group by supporter for that player, with paid/unpaid overall flag
  const summaryRows = useMemo(() => {
    const map = new Map();
    for (const e of entriesForSummaryPlayer) {
      const key = e.supporterName || "Unknown Supporter";
      if (!map.has(key)) {
        map.set(key, {
          supporterName: key,
          days: 0,
          sumOfDates: 0,
          anyPaid: false,
          anyUnpaid: false,
        });
      }
      const rec = map.get(key);
      const meta = getPaymentMeta(e);
      rec.days += 1;
      rec.sumOfDates += e.day;
      if (meta.isFullyPaid) {
        rec.anyPaid = true;
      } else {
        rec.anyUnpaid = true;
      }
    }

    const rows = Array.from(map.values());
    rows.sort((a, b) => a.supporterName.localeCompare(b.supporterName));
    return rows;
  }, [entriesForSummaryPlayer]);

  const sortedSummaryRows = useMemo(() => {
    const rows = [...summaryRows];
    const dir = summarySortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (summarySortKey) {
        case "days":
          return (a.days - b.days) * dir;
        case "sum":
          return (a.sumOfDates - b.sumOfDates) * dir;
        default: {
          // supporter
          return a.supporterName.localeCompare(b.supporterName) * dir;
        }
      }
    });
    return rows;
  }, [summaryRows, summarySortDir, summarySortKey]);

  const toggleSummarySort = (key) => {
    setSummarySortKey((prevKey) => {
      if (prevKey === key) {
        setSummarySortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSummarySortDir("asc");
      return key;
    });
  };

  // Entry-level table for Thunder players
  const labeledEntriesForSummaryPlayer = useMemo(() => {
    return entriesForSummaryPlayer.map((e) => {
      const meta = getPaymentMeta(e);
      let status = "Unpaid";
      if (meta.isFullyPaid) status = "Paid";
      else if (meta.isPaid) status = "Partially paid";

      const dateObj = new Date(e.year, e.month - 1, e.day);
      const dateLabel = `${MONTH_NAMES[e.month - 1]} ${e.day}, ${e.year}`;
      return { entry: e, meta, status, dateObj, dateLabel };
    });
  }, [entriesForSummaryPlayer]);

  const sortedDetailEntries = useMemo(() => {
    const rows = [...labeledEntriesForSummaryPlayer];
    const dir = detailSortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (detailSortKey) {
        case "supporter": {
          const sa = (a.entry.supporterName || "").toLowerCase();
          const sb = (b.entry.supporterName || "").toLowerCase();
          if (sa < sb) return -1 * dir;
          if (sa > sb) return 1 * dir;
          return 0;
        }
        case "status": {
          const sa = a.status.toLowerCase();
          const sb = b.status.toLowerCase();
          if (sa < sb) return -1 * dir;
          if (sa > sb) return 1 * dir;
          return 0;
        }
        case "date":
        default:
          if (a.dateObj < b.dateObj) return -1 * dir;
          if (a.dateObj > b.dateObj) return 1 * dir;
          return 0;
      }
    });
    return rows;
  }, [labeledEntriesForSummaryPlayer, detailSortKey, detailSortDir]);

  const toggleDetailSort = (key) => {
    setDetailSortKey((prevKey) => {
      if (prevKey === key) {
        setDetailSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setDetailSortDir("asc");
      return key;
    });
  };

  const handleUnlockSummary = () => {
    const pin = summaryPinInput.trim();
    if (!pin) {
      setSummaryPinError("Enter your 4-digit player PIN.");
      return;
    }
    const expected = playerPins[summaryPlayerId] || "";
    if (!expected || pin !== expected) {
      setSummaryPinError("Incorrect PIN – please try again.");
      setSummaryUnlocked(false);
    } else {
      setSummaryPinError("");
      setSummaryUnlocked(true);
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <header className="simple-header">
          <h1>Thunder 12U Teal Supporters</h1>
        </header>
        <main style={{ padding: "2rem", textAlign: "center" }}>
          Loading supporter information...
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div className="hero">
          <div className="hero-left">
            <div className="hero-logo-wrap">
              <img
                src="/thunder-logo.jpg"
                alt="Arlington Heights Thunder Fastpitch"
                className="hero-logo"
              />
            </div>
            <div className="hero-text">
              <h1>Thunder 12U Teal Supporters</h1>
              <p>
                Thank you to all of our family, friends, and fans who purchased
                dates on the calendar fundraiser. This page lets you:
              </p>
              <ul>
                <li>
                  Click on your name and enter the last 4 digits of your phone
                  (or player can use their pin) to view additional details
                </li>
                <li>For Thunder players, check overall fundraising totals</li>
              </ul>
            </div>
          </div>

          <div className="hero-photo-wrap">
            <img
              src="/team-12u-teal.jpg"
              alt="Thunder 12U Teal team"
              className="hero-team-photo"
            />
          </div>
        </div>

        <div className="header-bottom-row">
          <div className="header-links">
            <Link to="/" className="nav-link">
              ← Back to Calendar
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN 2-COLUMN LAYOUT */}
      <main
        className="supporters-layout"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.5rem",
          alignItems: "flex-start",
          padding: "1.5rem",
        }}
      >
        {/* LEFT: Global supporter list */}
        <section
          className="supporters-column supporters-list"
          style={{
            flex: "0 0 260px",
            minWidth: "220px",
            maxWidth: "280px",
          }}
        >
          <h2>Supporters</h2>
          <p className="small">
            Scroll the list and click on your name to unlock your details.
          </p>

          {supporterGroups.length === 0 ? (
            <p>No supporters have been recorded yet.</p>
          ) : (
            <ul className="supporters-name-list">
              {supporterGroups.map((s) => (
                <li key={s.supporterName}>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => handleSelectSupporter(s.supporterName)}
                  >
                    {s.supporterName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* RIGHT: PIN + detailed view for a supporter */}
        <section
          className="supporters-column supporters-details"
          style={{
            flex: "1 1 320px",
            minWidth: "280px",
          }}
        >
          <h2>Supporter Details</h2>
          {!selectedSupporterName ? (
            <p>Select your name in the supporters list to view details.</p>
          ) : (
            <>
              <p>
                <strong>Supporter:</strong> {selectedSupporterName}
              </p>
              <p className="small">
                Enter the 4-digit <strong>player PIN</strong> (for any player
                you supported) or the <strong>last 4 digits</strong> of your
                phone number to unlock your dates &amp; payment status.
              </p>
              <div className="pin-input-row">
                <input
                  type="password"
                  maxLength={4}
                  value={supporterPinInput}
                  onChange={(e) =>
                    setSupporterPinInput(
                      e.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                  placeholder="PIN"
                  style={{ width: "80px", marginRight: "0.5rem" }}
                />
                <button type="button" onClick={handleUnlockSupporter}>
                  Unlock
                </button>
              </div>
              {supporterPinError && (
                <p className="error-text">{supporterPinError}</p>
              )}

              {supporterUnlocked && supporterEntries.length > 0 && (
                <>
                  <h3 style={{ marginTop: "1rem" }}>Dates &amp; Payments</h3>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Day #</th>
                          <th>Paid?</th>
                          <th>Phone</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supporterEntries.map((e) => {
                          const meta = getPaymentMeta(e);
                          let paidLabel = "Unpaid";
                          if (meta.isFullyPaid) {
                            paidLabel = "Paid";
                          } else if (meta.isPaid) {
                            paidLabel = "Partially paid";
                          }
                          return (
                            <tr key={e.id}>
                              <td>
                                {MONTH_NAMES[e.month - 1]} {e.day}, {e.year}
                              </td>
                              <td>{e.day}</td>
                              <td>{paidLabel}</td>
                              <td>{e.phone}</td>
                              <td>{e.note}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {supporterSummary && (
                    <div className="supporter-summary">
                      <h4>Supporter Summary</h4>
                      <p>
                        <strong>Total dates:</strong>{" "}
                        {supporterSummary.totalDates}
                      </p>
                      <p>
                        <strong>Total supported ($):</strong>{" "}
                        {supporterSummary.totalDollars}
                      </p>
                      <p>
                        <strong>Marked paid:</strong>{" "}
                        {supporterSummary.totalPaid}
                      </p>
                      <p>
                        <strong>Not yet marked paid:</strong>{" "}
                        {supporterSummary.totalUnpaid}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>

      {/* FOR THUNDER PLAYERS SECTION */}
      <section className="how-it-works" style={{ marginTop: "1rem" }}>
        <h2>For Thunder Players</h2>
        <p>
          Thunder players can see a summary of their fundraising here. Select
          your name, enter your 4-digit player PIN, and you&apos;ll see totals
          by supporter, plus a detailed list of every date that&apos;s been
          purchased for you.
        </p>

        <div
          className="player-summary-controls"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <label>
            Player:&nbsp;
            <select
              value={summaryPlayerId}
              onChange={(e) => {
                setSummaryPlayerId(e.target.value);
                setSummaryUnlocked(false);
                setSummaryPinInput("");
                setSummaryPinError("");
              }}
            >
              {SORTED_PLAYERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} #{p.number}
                </option>
              ))}
            </select>
          </label>

          <label>
            PIN:&nbsp;
            <input
              type="password"
              maxLength={4}
              value={summaryPinInput}
              onChange={(e) =>
                setSummaryPinInput(
                  e.target.value.replace(/\D/g, "").slice(0, 4)
                )
              }
              style={{ width: "80px" }}
            />
          </label>

          <button type="button" onClick={handleUnlockSummary}>
            Show My Summary
          </button>
        </div>

        {summaryPinError && <p className="error-text">{summaryPinError}</p>}

        {summaryUnlocked ? (
          entriesForSummaryPlayer.length === 0 ? (
            <p>No dates have been purchased yet for this player.</p>
          ) : (
            <>
              {/* SUMMARY BY SUPPORTER */}
              <h3>Supporter Summary</h3>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th
                        className="sortable-col"
                        onClick={() => toggleSummarySort("supporter")}
                      >
                        Supporter
                        {summarySortKey === "supporter"
                          ? summarySortDir === "asc"
                            ? " ▲"
                            : " ▼"
                          : ""}
                      </th>
                      <th
                        className="sortable-col"
                        onClick={() => toggleSummarySort("days")}
                      >
                        Days sponsored
                        {summarySortKey === "days"
                          ? summarySortDir === "asc"
                            ? " ▲"
                            : " ▼"
                          : ""}
                      </th>
                      <th
                        className="sortable-col"
                        onClick={() => toggleSummarySort("sum")}
                      >
                        Sum of date numbers
                        {summarySortKey === "sum"
                          ? summarySortDir === "asc"
                            ? " ▲"
                            : " ▼"
                          : ""}
                      </th>
                      <th>Paid?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSummaryRows.map((row) => {
                      let status = "Unpaid";
                      if (row.anyPaid && row.anyUnpaid) status = "Partially paid";
                      else if (row.anyPaid && !row.anyUnpaid) status = "Paid";

                      return (
                        <tr key={row.supporterName}>
                          <td>{row.supporterName}</td>
                          <td>{row.days}</td>
                          <td>{row.sumOfDates}</td>
                          <td>{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ENTRY-LEVEL TABLE */}
              <h3 style={{ marginTop: "1.5rem" }}>All Entries for You</h3>
              <p className="small">
                This table shows every date purchased for you, including notes,
                phone contact, and payment status.
              </p>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th
                        className="sortable-col"
                        onClick={() => toggleDetailSort("date")}
                      >
                        Date
                        {detailSortKey === "date"
                          ? detailSortDir === "asc"
                            ? " ▲"
                            : " ▼"
                          : ""}
                      </th>
                      <th
                        className="sortable-col"
                        onClick={() => toggleDetailSort("supporter")}
                      >
                        Supporter
                        {detailSortKey === "supporter"
                          ? detailSortDir === "asc"
                            ? " ▲"
                            : " ▼"
                          : ""}
                      </th>
                      <th>Note</th>
                      <th>Phone</th>
                      <th
                        className="sortable-col"
                        onClick={() => toggleDetailSort("status")}
                      >
                        Payment status
                        {detailSortKey === "status"
                          ? detailSortDir === "asc"
                            ? " ▲"
                            : " ▼"
                          : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDetailEntries.map(({ entry, status, dateLabel }) => (
                      <tr key={entry.id}>
                        <td>{dateLabel}</td>
                        <td>{entry.supporterName}</td>
                        <td>{entry.note}</td>
                        <td>{entry.phone}</td>
                        <td>{status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          <p className="small">
            Enter your PIN above to view your personal fundraising summary.
          </p>
        )}
      </section>
    </div>
  );
}
