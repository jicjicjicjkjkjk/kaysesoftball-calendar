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

  const handleSelectSupporter = (name) => {
    setSelectedSupporter(name);
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

    return {
      playerName: player
        ? `${player.firstName} ${player.lastName}`
        : "Unknown player",
      supporterName: selectedSupporter,
      dates,
      total,
    };
  }, [selectedPlayerId, selectedSupporter, entriesForPlayer]);

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
              Thunder 12U Teal player.
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
                        {row.count !== 1 ? "s" : ""} • Sum of dates: {row.total}
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
                Click a supporter in the middle column to view their dates and
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

                <h3>Dates Purchased</h3>
                <ul className="supporter-dates-list">
                  {supporterDetails.dates.map((d) => (
                    <li key={d.id}>
                      {d.monthName} {d.day}, {d.year}
                    </li>
                  ))}
                </ul>

                <p className="supporter-total">
                  <strong>Total (sum of dates):</strong>{" "}
                  {supporterDetails.total}
                </p>
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
