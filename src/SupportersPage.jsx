import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PLAYERS } from "./players";

const STORAGE_KEY = "kaysesoftball_calendar_entries_v1";

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

export default function SupportersPage() {
  const [entries, setEntries] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedSupporter, setSelectedSupporter] = useState(null);

  // Load entries from localStorage (same data used on main page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEntries(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Failed to load entries on supporters page", err);
    }
  }, []);

  // Sort players alphabetically by first name
  const playersSorted = useMemo(() => {
    return [...PLAYERS].sort((a, b) =>
      a.firstName.localeCompare(b.firstName)
    );
  }, []);

  const handleSelectPlayer = (playerId) => {
    setSelectedPlayerId(playerId);
    setSelectedSupporter(null);
  };

  // Entries for selected player
  const entriesForPlayer = useMemo(() => {
    if (!selectedPlayerId) return [];
    return entries.filter((e) => e.playerId === selectedPlayerId);
  }, [entries, selectedPlayerId]);

  // Supporters for selected player
  const supportersForPlayer = useMemo(() => {
    if (!selectedPlayerId) return [];
    const map = new Map(); // supporterName -> { count, total, entries }
    for (const e of entriesForPlayer) {
      const name = (e.supporterName || "").trim();
      if (!name) continue;
      if (!map.has(name)) {
        map.set(name, { count: 0, total: 0, entries: [] });
      }
      const rec = map.get(name);
      rec.count += 1;
      rec.total += e.day; // sum of day numbers
      rec.entries.push(e);
    }
    const rows = Array.from(map.entries()).map(([name, rec]) => ({
      supporterName: name,
      count: rec.count,
      total: rec.total,
      entries: rec.entries,
    }));
    rows.sort((a, b) => a.supporterName.localeCompare(b.supporterName));
    return rows;
  }, [entriesForPlayer]);

  const handleSelectSupporter = (supporterName) => {
    if (!selectedPlayerId) return;

    const relevant = entriesForPlayer.filter(
      (e) => (e.supporterName || "").trim() === supporterName.trim()
    );
    if (relevant.length === 0) {
      alert("No entries found for this supporter.");
      return;
    }

    const phoneOrPin = window.prompt(
      "To view details for this supporter, enter the cell phone number used when purchasing dates (full or last 4 digits), OR the player's 4-digit PIN."
    );

    if (phoneOrPin === null) {
      // cancelled
      return;
    }

    const cleanedInput = phoneOrPin.replace(/\D/g, "");
    if (!cleanedInput) {
      alert("Phone number or PIN cannot be blank.");
      return;
    }

    // Look up player PIN from PLAYERS
    const player = PLAYERS.find((p) => p.id === selectedPlayerId);
    const playerPin = player?.pin;

    let hasMatch = false;

    // Option 1: match supporter phone (full or trailing digits)
    if (cleanedInput.length >= 4) {
      hasMatch = relevant.some((e) => {
        const stored = (e.phone || "").replace(/\D/g, "");
        if (!stored) return false;
        return (
          stored === cleanedInput || stored.endsWith(cleanedInput) // allow last 4
        );
      });
    }

    // Option 2: if exactly 4 digits and not matched yet, allow player PIN
    if (!hasMatch && cleanedInput.length === 4 && playerPin) {
      if (cleanedInput === playerPin) {
        hasMatch = true;
      }
    }

    if (!hasMatch) {
      alert(
        "Sorry, that code does not match what we have on file. Please use the phone number used when supporting, or the player's 4-digit PIN."
      );
      return;
    }

    setSelectedSupporter(supporterName);
  };

  // Entries for selected supporter + player
  const supporterDetails = useMemo(() => {
    if (!selectedPlayerId || !selectedSupporter) return null;
    const player = PLAYERS.find((p) => p.id === selectedPlayerId);
    const relevant = entriesForPlayer.filter(
      (e) => (e.supporterName || "").trim() === selectedSupporter.trim()
    );
    if (relevant.length === 0) return null;

    const sorted = [...relevant].sort((a, b) => {
  const da = new Date(a.year, a.month - 1, a.day);
  const db = new Date(b.year, b.month - 1, b.day);
  return da - db;
});

const dates = sorted.map((e) => ({
  id: e.id,
  year: e.year,
  monthName: MONTH_NAMES[e.month - 1],
  day: e.day,
}));

const total = sorted.reduce((sum, e) => sum + e.day, 0);
const totalPaid = sorted.reduce(
  (sum, e) => sum + Number(e.paymentAmount || 0),
  0
);

// take the first non-blank phone on file for this supporter
const phoneOnFile =
  sorted.find((e) => (e.phone || "").trim().length > 0)?.phone || "";

return {
  playerName: player
    ? `${player.firstName} ${player.lastName}`
    : "Unknown player",
  supporterName: selectedSupporter,
  dates,
  total,
  totalPaid,
  phoneOnFile,
};

  const currentPlayer =
    selectedPlayerId && PLAYERS.find((p) => p.id === selectedPlayerId);

  return (
    <div className="page supporters-page">
      <header className="header supporters-header">
        <div className="supporters-header-top">
          <div className="hero-logo-wrap small-logo">
            <img
              src="/thunder-logo.jpg"
              alt="Arlington Heights Thunder Fastpitch"
              className="hero-logo"
            />
          </div>
          <div className="supporters-header-text">
            <h1>Thunder Supporters</h1>
            <p>
              Explore which supporters have purchased dates in honor of each
              Thunder 12U Teal player. To view detailed dates and totals for a
              supporter, you&apos;ll need either the cell phone number used when
              the dates were purchased or that player&apos;s 4-digit PIN.
            </p>
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

      <main className="supporters-main">
        <section className="supporters-layout">
          {/* Left column: players */}
          <aside className="supporters-column players-column">
            <h2 className="column-title">Players</h2>
            <ul className="players-list">
              {playersSorted.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={
                      selectedPlayerId === p.id
                        ? "players-list-item active"
                        : "players-list-item"
                    }
                    onClick={() => handleSelectPlayer(p.id)}
                  >
                    {p.firstName} {p.lastName}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Middle column: supporters for chosen player */}
          <section className="supporters-column supporters-column-middle">
            <h2 className="column-title">
              {currentPlayer
                ? `Supporters for ${currentPlayer.firstName} ${currentPlayer.lastName}`
                : "Supporters"}
            </h2>

            {!selectedPlayerId && (
              <p className="supporters-hint">
                Select a player on the left to see their supporters.
              </p>
            )}

            {selectedPlayerId && supportersForPlayer.length === 0 && (
              <p className="supporters-hint">
                No supporters have purchased dates for this player yet.
              </p>
            )}

            {selectedPlayerId && supportersForPlayer.length > 0 && (
              <ul className="supporters-list">
                {supportersForPlayer.map((row) => (
                  <li key={row.supporterName}>
                    <button
                      type="button"
                      className={
                        selectedSupporter === row.supporterName
                          ? "supporters-list-item active"
                          : "supporters-list-item"
                      }
                      onClick={() => handleSelectSupporter(row.supporterName)}
                    >
                      <div className="supporter-name">
                        {row.supporterName}
                      </div>
                      <div className="supporter-sub">
                        {row.count} date
                        {row.count !== 1 ? "s" : ""}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Right column: details for selected supporter */}
          <section className="supporters-column supporters-column-right">
            <h2 className="column-title">Supporter Details</h2>

            {!selectedSupporter && (
              <p className="supporters-hint">
                Click a supporter in the middle column and enter their phone
                number or the player&apos;s 4-digit PIN to view their dates and
                totals.
              </p>
            )}

            {supporterDetails && (
              <div className="supporter-details-card">
                <p>
  <strong>Supporter:</strong> {supporterDetails.supporterName}
</p>
<p>
  <strong>Player Supported:</strong>{" "}
  {supporterDetails.playerName}
</p>
<p>
  <strong>Phone on file:</strong>{" "}
  {supporterDetails.phoneOnFile || "Not provided"}
</p>
                
                <h3>Dates Purchased</h3>
                <ul className="supporter-dates-list">
                  {supporterDetails.dates.map((d) => (
                    <li key={d.id}>
                      {d.monthName} {d.day}, {d.year}
                    </li>
                  ))}
                </ul>

                <p className="supporter-total">
                  <strong>Total owed (sum of dates):</strong>{" "}
                  ${supporterDetails.total}
                </p>

                {supporterDetails.totalPaid >= supporterDetails.total ? (
                  <p className="supporter-total">
                    <strong>Thank you!</strong> Payment has been received in
                    full.
                  </p>
                ) : supporterDetails.totalPaid > 0 ? (
                  <p className="supporter-total">
                    You have paid ${supporterDetails.totalPaid} so far.
                    Remaining balance: $
                    {supporterDetails.total - supporterDetails.totalPaid}.
                    Please remit via Zelle (630-698-8769) or Venmo
                    (@Justin-Kayse).
                  </p>
                ) : (
                  <p className="supporter-total">
                    Please remit ${supporterDetails.total} via Zelle
                    (630-698-8769) or Venmo (@Justin-Kayse).
                  </p>
                )}
              </div>
            )}
          </section>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-contact">
          <strong>Questions?</strong>{" "}
          <a href="mailto:jkayse@hotmail.com">Email Coach Justin</a>
        </div>
        <small>
          © {new Date().getFullYear()} Kayse Softball • kaysesoftball.com
        </small>
      </footer>
    </div>
  );
}
