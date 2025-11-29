import React, { useState, useEffect } from "react";
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

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "kaysesoftball_calendar_entries_v1";

function buildCalendarCells(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startOffset = first.getDay(); // 0 = Sun ... 6 = Sat
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

const makeId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function App() {
  const [entries, setEntries] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // {year,month,day}
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null); // null = overview
  const [viewedEntry, setViewedEntry] = useState(null);
  const [showEntryDetails, setShowEntryDetails] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);

    const handleAdminToggleClick = () => {
    if (!hasAdminAccess) {
      // first time: ask for password
      setShowAdminPrompt(true);
      return;
    }
    // already authenticated, just toggle
    setShowAdmin((prev) => !prev);
  };
  
  // Load from localStorage on first render
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEntries(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Failed to load entries", err);
    }
  }, []);

  // Save to localStorage whenever entries change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (err) {
      console.error("Failed to save entries", err);
    }
  }, [entries]);

  const handleOpenDay = (year, month, day) => {
    setSelectedDay({ year, month, day });
    setShowForm(true);
  };

  const handleDayClick = (year, month, day) => {
    const existing = entries.find(
      (e) => e.year === year && e.month === month && e.day === day
    );
    if (existing) {
      setViewedEntry(existing);
      setShowEntryDetails(true);
    } else {
      handleOpenDay(year, month, day);
    }
  };

  const handleSubmitEntry = (formValues) => {
    if (!selectedDay) return;
    const newEntry = {
      id: makeId(),
      year: selectedDay.year,
      month: selectedDay.month,
      day: selectedDay.day,
      playerId: formValues.playerId,
      supporterName: formValues.supporterName,
      note: formValues.note || "",
      phone: formValues.phone || "",
      paid: false, // you flip this in admin view
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [...prev, newEntry]);
    setShowForm(false);
    setSelectedDay(null);
  };

  const handleTogglePaid = (id) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e))
    );
  };

  const handleDeleteEntry = (id) => {
    if (!window.confirm("Clear this day?")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSelectMonth = (idx) => {
    setSelectedMonthIndex(idx);
  };

  const handleBackToOverview = () => {
    setSelectedMonthIndex(null);
  };

  const handleStartEditEntry = (entry) => {
    setEditingEntry(entry);
  };

  const handleSaveEditedEntry = (updated) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
    setEditingEntry(null);
  };

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
              <h1>Thunder 12U Teal Calendar Fundraiser</h1>
              <p>
                Support Arlington Heights Thunder Fastpitch by picking a date
                and sponsoring your favorite player. Claimed days show the
                player and supporter right on the calendar.
              </p>

              <div className="venmo-zelle">
                <strong>Step 2: Pay after you claim your day</strong>
                <div className="venmo-links">
                  {/* Put your real links/handles here */}
                  <a href="https://venmo.com" target="_blank" rel="noreferrer">
                    Venmo @YourHandle
                  </a>
                  <span> · </span>
                  <a href="mailto:yourzelleemail@example.com">
                    Zelle: yourzelleemail@example.com
                  </a>
                </div>
              </div>
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

        <div className="header-buttons">
          <button
            className="admin-toggle"
            onClick={() => setShowAdmin((prev) => !prev)}
          >
            {showAdmin ? "Hide Admin View" : "Show Admin View (Paid Tracking)"}
          </button>
        </div>
      </header>

      {/* MAIN CALENDAR AREA */}
      <section className="calendar-section">
        {selectedMonthIndex === null ? (
          <MonthOverviewGrid
            year={CURRENT_YEAR}
            entries={entries}
            onSelectMonth={handleSelectMonth}
          />
        ) : (
          <div className="big-month-wrapper">
            <button
              className="back-button"
              type="button"
              onClick={handleBackToOverview}
            >
              ← Back to all months
            </button>
            <BigMonthCalendar
              year={CURRENT_YEAR}
              monthIndex={selectedMonthIndex}
              monthName={MONTH_NAMES[selectedMonthIndex]}
              entries={entries}
              onDayClick={handleDayClick}
            />
          </div>
        )}
      </section>

      {showForm && selectedDay && (
        <SupporterFormModal
          dayInfo={selectedDay}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmitEntry}
        />
      )}

      {showEntryDetails && viewedEntry && (
        <EntryDetailsModal
          entry={viewedEntry}
          onClose={() => setShowEntryDetails(false)}
        />
      )}

      {showAdmin && (
        <AdminPanel
          entries={entries}
          onTogglePaid={handleTogglePaid}
          onDelete={handleDeleteEntry}
          onEditEntry={handleStartEditEntry}
        />
      )}

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveEditedEntry}
        />
      )}

      <footer className="footer">
        <small>© {CURRENT_YEAR} Kayse Softball • kaysesoftball.com</small>
      </footer>
    </div>
  );
}

/* ---------- PUBLIC VIEW COMPONENTS ---------- */

// Small month “summary” tiles (3 x 4 grid)
function MonthOverviewGrid({ year, entries, onSelectMonth }) {
  return (
    <div className="calendar-overview-grid">
      {MONTH_NAMES.map((name, idx) => (
        <MonthOverviewTile
          key={name}
          year={year}
          monthIndex={idx}
          monthName={name}
          entries={entries}
          onClick={() => onSelectMonth(idx)}
        />
      ))}
    </div>
  );
}

function MonthOverviewTile({ year, monthIndex, monthName, entries, onClick }) {
  const cells = buildCalendarCells(year, monthIndex);

  // quick lookup of taken days
  const takenSet = new Set(
    entries
      .filter(
        (e) => e.year === year && e.month === monthIndex + 1 && !!e.playerId
      )
      .map((e) => e.day)
  );

  return (
    <button type="button" className="month-overview-tile" onClick={onClick}>
      <div className="month-overview-header">
        <span className="month-name">{monthName}</span>
        <span className="month-overview-caption">Tap to view month</span>
      </div>
      <div className="overview-weekdays">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="overview-weekday">
            {d}
          </span>
        ))}
      </div>
      <div className="overview-day-grid">
        {cells.map((cell, idx) => {
          if (cell === null) {
            return <div key={idx} className="overview-day empty" />;
          }
          const isTaken = takenSet.has(cell.day);
          const className = `overview-day ${
            isTaken ? "overview-day-taken" : "overview-day-available"
          }`;
          return (
            <div key={idx} className={className}>
              <span className="overview-day-number">{cell.day}</span>
            </div>
          );
        })}
      </div>
      <div className="overview-legend">
        <span className="legend-item">
          <span className="legend-swatch legend-available" /> Available
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-taken" /> Taken
        </span>
      </div>
    </button>
  );
}

// Big full calendar for one month
function BigMonthCalendar({ year, monthIndex, monthName, entries, onDayClick }) {
  const cells = buildCalendarCells(year, monthIndex);

  return (
    <div className="big-month-card">
      <h2 className="big-month-title">{monthName}</h2>
      <div className="big-weekdays">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="big-weekday">
            {d}
          </span>
        ))}
      </div>
      <div className="big-day-grid">
        {cells.map((cell, idx) => {
          if (cell === null) {
            return <div key={idx} className="big-day-cell empty" />;
          }
          const entry = entries.find(
            (e) =>
              e.year === year &&
              e.month === monthIndex + 1 &&
              e.day === cell.day
          );
          const isTaken = !!entry;
          const player = isTaken && PLAYERS.find((p) => p.id === entry.playerId);
          const playerName = player ? player.firstName : "Player";

          const label = isTaken ? `${cell.day}: ${playerName}` : `${cell.day}`;

          const className = `big-day-cell ${
            isTaken ? "big-day-taken" : "big-day-available"
          }`;

          return (
            <button
              type="button"
              key={idx}
              className={className}
              onClick={() => onDayClick(year, monthIndex + 1, cell.day)}
            >
              <span className="big-day-label">{label}</span>
              {isTaken && (
                <span className="big-day-supporter">
                  {entry.supporterName}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- MODAL FORM & ENTRY DETAILS ---------- */

function SupporterFormModal({ dayInfo, onClose, onSubmit }) {
  const [playerId, setPlayerId] = useState("");
  const [supporterName, setSupporterName] = useState("");
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!playerId || !supporterName || !phone) {
      alert("Please fill Player, Your Name, and Phone.");
      return;
    }
    onSubmit({ playerId, supporterName, note, phone });
  };

  const monthName = MONTH_NAMES[dayInfo.month - 1];

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>
          Claim {monthName} {dayInfo.day}
        </h2>
        <p className="modal-text">
          Choose the player you’re supporting and tell us who you are. Phone
          number is only visible to the team, not on the public site.
        </p>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Player Supporting
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              required
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
            Your Name
            <input
              type="text"
              value={supporterName}
              onChange={(e) => setSupporterName(e.target.value)}
              required
            />
          </label>

          <label>
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </label>

          <label>
            Phone (team use only)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <div className="modal-buttons">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Claim Day</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EntryDetailsModal({ entry, onClose }) {
  const monthName = MONTH_NAMES[entry.month - 1];
  const player = PLAYERS.find((p) => p.id === entry.playerId);
  const playerName = player
    ? `${player.firstName} ${player.lastName}`
    : "Unknown player";

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>
          {monthName} {entry.day}
        </h2>
        <p className="modal-text">
          This date has already been claimed. Here are the details:
        </p>
        <div className="entry-details">
          <p>
            <strong>Player:</strong> {playerName}
          </p>
          <p>
            <strong>Supporter:</strong> {entry.supporterName}
          </p>
          {entry.note && (
            <p>
              <strong>Note:</strong> {entry.note}
            </p>
          )}
        </div>
        <div className="modal-buttons">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ADMIN PANEL & EDIT MODAL ---------- */

function AdminPanel({ entries, onTogglePaid, onDelete, onEditEntry }) {
  const [filter, setFilter] = useState("all"); // all | paid | unpaid

  // sort by date
  const sorted = [...entries].sort((a, b) => {
    const da = new Date(a.year, a.month - 1, a.day);
    const db = new Date(b.year, b.month - 1, b.day);
    return da - db;
  });

  const filtered = sorted.filter((e) => {
    if (filter === "paid") return e.paid;
    if (filter === "unpaid") return !e.paid;
    return true;
  });

  // summary by player
  const summaryByPlayerId = new Map();
  for (const e of entries) {
    if (!e.playerId) continue;
    if (!summaryByPlayerId.has(e.playerId)) {
      summaryByPlayerId.set(e.playerId, { days: 0, dayNumberSum: 0 });
    }
    const rec = summaryByPlayerId.get(e.playerId);
    rec.days += 1;
    rec.dayNumberSum += e.day;
  }

  const summaryRows = Array.from(summaryByPlayerId.entries()).map(
    ([playerId, { days, dayNumberSum }]) => {
      const player = PLAYERS.find((p) => p.id === playerId);
      return {
        playerName: player
          ? `${player.firstName} ${player.lastName}`
          : "Unknown",
        days,
        dayNumberSum,
      };
    }
  );

  return (
    <section className="admin-panel">
      <h2>Admin View – Sponsors, Paid Status & Player Summary</h2>

      <div className="admin-filters">
        <span>Show:</span>
        <button
          type="button"
          className={filter === "all" ? "filter-button active" : "filter-button"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={
            filter === "paid" ? "filter-button active" : "filter-button"
          }
          onClick={() => setFilter("paid")}
        >
          Paid
        </button>
        <button
          type="button"
          className={
            filter === "unpaid" ? "filter-button active" : "filter-button"
          }
          onClick={() => setFilter("unpaid")}
        >
          Unpaid
        </button>
      </div>

      {filtered.length === 0 ? (
        <p>No entries match this filter.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Player</th>
                <th>Supporter</th>
                <th>Note</th>
                <th>Phone (private)</th>
                <th>Paid?</th>
                <th>Edit</th>
                <th>Clear</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const player = PLAYERS.find((p) => p.id === e.playerId);
                const playerName = player
                  ? `${player.firstName} ${player.lastName}`
                  : "Unknown";
                return (
                  <tr key={e.id}>
                    <td>
                      {MONTH_NAMES[e.month - 1]} {e.day}, {e.year}
                    </td>
                    <td>{playerName}</td>
                    <td>{e.supporterName}</td>
                    <td>{e.note}</td>
                    <td>{e.phone}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={e.paid}
                        onChange={() => onTogglePaid(e.id)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => onEditEntry(e)}
                      >
                        Edit
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => onDelete(e.id)}
                      >
                        Clear
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="admin-summary-title">Player Fundraising Summary</h3>
      {summaryRows.length === 0 ? (
        <p>No days claimed yet.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Days sponsored</th>
                <th>
                  Day-number sum{" "}
                  <span className="summary-hint">
                    (e.g., if donation equals the day of month)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.playerName}>
                  <td>{row.playerName}</td>
                  <td>{row.days}</td>
                  <td>{row.dayNumberSum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-note">
        Use the filter buttons above to quickly see which sponsors have paid.
        The summary table groups by player and shows how many dates they have
        claimed. The day-number sum is useful if your fundraiser amount is
        based on the calendar date.
      </p>
    </section>
  );
}

function EditEntryModal({ entry, onClose, onSave }) {
  const [playerId, setPlayerId] = useState(entry.playerId || "");
  const [supporterName, setSupporterName] = useState(entry.supporterName || "");
  const [note, setNote] = useState(entry.note || "");
  const [phone, setPhone] = useState(entry.phone || "");
  const [paid, setPaid] = useState(!!entry.paid);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...entry,
      playerId,
      supporterName,
      note,
      phone,
      paid,
    });
  };

  const monthName = MONTH_NAMES[entry.month - 1];

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>
          Edit Entry – {monthName} {entry.day}
        </h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Player
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              required
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
            Supporter Name
            <input
              type="text"
              value={supporterName}
              onChange={(e) => setSupporterName(e.target.value)}
              required
            />
          </label>

          <label>
            Note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </label>

          <label>
            Phone (private)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className="inline-label">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
            />{" "}
            Mark as paid
          </label>

          <div className="modal-buttons">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
