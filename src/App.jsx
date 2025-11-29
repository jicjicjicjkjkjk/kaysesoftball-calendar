import React, { useState, useEffect } from "react";
import { PLAYERS } from "./players";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
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

        <button
          className="admin-toggle"
          onClick={() => setShowAdmin((prev) => !prev)}
        >
          {showAdmin ? "Hide Admin View" : "Show Admin View (Paid Tracking)"}
        </button>
      </header>

      {/* 12-month grid */}
      <section className="calendar-grid">
        {MONTH_NAMES.map((name, idx) => (
          <MonthCalendar
            key={name}
            year={CURRENT_YEAR}
            monthIndex={idx}
            monthName={name}
            entries={entries}
            onDayClick={handleOpenDay}
          />
        ))}
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

function MonthCalendar({ year, monthIndex, monthName, entries, onDayClick }) {
  const allDays = buildDaysForMonth(year, monthIndex);

  const daysWithEntries = allDays.map((d) => {
    const entry = entries.find(
      (e) => e.year === year && e.month === monthIndex + 1 && e.day === d.day
    );
    return { ...d, entry };
  });

  return (
    <div className="month-card">
      <h3 className="month-title">{monthName}</h3>
      <div className="day-grid">
        {daysWithEntries.map(({ day, entry }) => (
          <DayCell
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

function DayCell({ year, monthIndex, day, entry, onClick }) {
  const isTaken = !!entry;
  const player = isTaken && PLAYERS.find((p) => p.id === entry.playerId);
  const playerName = player ? player.firstName : "Player";

  const label = isTaken
    ? `${day}: ${playerName} – ${entry.supporterName}`
    : `${day}: Available`;

  const className = `day-cell ${isTaken ? "day-taken" : "day-available"}`;

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

function AdminPanel({ entries, onTogglePaid, onDelete }) {
  const sorted = [...entries].sort((a, b) => {
    const da = new Date(a.year, a.month - 1, a.day);
    const db = new Date(b.year, b.month - 1, b.day);
    return da - db;
  });

  return (
    <section className="admin-panel">
      <h2>Admin View – Sponsors & Paid Status</h2>
      {sorted.length === 0 ? (
        <p>No days claimed yet.</p>
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
              {sorted.map((e) => {
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
      <p className="admin-note">
        This admin view and the Paid? column are visible only to you. On the
        public calendar we show just player + supporter names.
      </p>
    </section>
  );
}
