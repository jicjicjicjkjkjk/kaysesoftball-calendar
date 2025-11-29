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

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "kaysesoftball_calendar_entries_v1";

function buildDaysForMonth(year, monthIndex) {
  const last = new Date(year, monthIndex + 1, 0);
  const days = [];
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ day: d });
  }
  return days;
}

const makeId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function App() {
  const [entries, setEntries] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // {year,month,day}
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null); // null = overview

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
    const existing = entries.find(
      (e) => e.year === year && e.month === month && e.day === day
    );
    if (existing) return; // already taken
    setSelectedDay({ year, month, day });
    setShowForm(true);
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

  return (
    <div className="page">
      <header className="header">
        <h1>Thunder 12U Calendar Fundraiser</h1>
        <p>
          Pick a date to sponsor your favorite player. Once a day is claimed,
          we’ll show the player and supporter name on that date.
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

        {/* Fun photos – later we can wire to PLAYERS.photoUrl */}
        <div className="photo-strip">
          <p>Add fun team/player photos here.</p>
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
              onDayClick={handleOpenDay}
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

      {showAdmin && (
        <AdminPanel
          entries={entries}
          onTogglePaid={handleTogglePaid}
          onDelete={handleDeleteEntry}
        />
      )}

      <footer className="footer">
        <small>© {CURRENT_YEAR} Kayse Softball • kaysesoftball.com</small>
      </footer>
    </div>
  );
}

/* ---------- PUBLIC VIEW COMPONENTS ---------- */

// Small month “summary” tiles
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
  const days = buildDaysForMonth(year, monthIndex);

  // build quick lookup
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
        <span className="month-overview-caption">Tap to view</span>
      </div>
      <div className="overview-day-grid">
        {days.map((d) => {
          const isTaken = takenSet.has(d.day);
          const className = `overview-day ${
            isTaken ? "overview-day-taken" : "overview-day-available"
          }`;
          return <div key={d.day} className={className} />;
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
  const allDays = buildDaysForMonth(year, monthIndex);

  const daysWithEntries = allDays.map((d) => {
    const entry = entries.find(
      (e) => e.year === year && e.month === monthIndex + 1 && e.day === d.day
    );
    return { ...d, entry };
  });

  return (
    <div className="big-month-card">
      <h2 className="big-month-title">{monthName}</h2>
      <div className="big-day-grid">
        {daysWithEntries.map(({ day, entry }) => (
          <BigDayCell
            key={day}
            year={year}
            monthIndex={monthIndex}
            day={day}
            entry={entry}
            onClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}

function BigDayCell({ year, monthIndex, day, entry, onClick }) {
  const isTaken = !!entry;
  const player = isTaken && PLAYERS.find((p) => p.id === entry.playerId);
  const playerName = player ? player.firstName : "Player";

  const label = isTaken
    ? `${day}: ${playerName} – ${entry.supporterName}`
    : `${day}: Available`;

  const className = `big-day-cell ${
    isTaken ? "big-day-taken" : "big-day-available"
  }`;

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (!isTaken) {
          onClick(year, monthIndex + 1, day);
        }
      }}
    >
      <span>{label}</span>
    </button>
  );
}

/* ---------- MODAL FORM ---------- */

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

/* ---------- ADMIN PANEL ---------- */

function AdminPanel({ entries, onTogglePaid, onDelete }) {
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
