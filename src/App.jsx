import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
const RAFFLE_KEY = "kaysesoftball_calendar_raffle_v1";

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

const raffleKey = (year, month) => `${year}-${month}`;

export default function App() {
  const [entries, setEntries] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // {year,month,day}
  const [showDatePrompt, setShowDatePrompt] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null); // null = overview
  const [viewedEntry, setViewedEntry] = useState(null);
  const [showEntryDetails, setShowEntryDetails] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [raffleWinners, setRaffleWinners] = useState({}); // { "2025-4": 7 }
  const [lastSupporterValues, setLastSupporterValues] = useState({
    supporterName: "",
    playerId: "",
    note: "",
    phone: "",
  });

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

    try {
      const rawR = localStorage.getItem(RAFFLE_KEY);
      if (rawR) {
        setRaffleWinners(JSON.parse(rawR));
      }
    } catch (err) {
      console.error("Failed to load raffle winners", err);
    }
  }, []);

  // Save entries whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (err) {
      console.error("Failed to save entries", err);
    }
  }, [entries]);

  // Save raffle winners whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(RAFFLE_KEY, JSON.stringify(raffleWinners));
    } catch (err) {
      console.error("Failed to save raffle winners", err);
    }
  }, [raffleWinners]);

  const handleDayClick = (year, month, day) => {
    const existing = entries.find(
      (e) => e.year === year && e.month === month && e.day === day
    );
    if (existing) {
      setViewedEntry(existing);
      setShowEntryDetails(true);
    } else {
      setSelectedDay({ year, month, day });
      setShowDatePrompt(true);
    }
  };

  const handleOpenFormForSelectedDay = () => {
    setShowDatePrompt(false);
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
  // payment fields
  paymentMethod: "unpaid", // "unpaid" | "zelle" | "venmo"
  paymentAmount: 0,        // dollars applied to THIS date
  paid: false,             // keep for compatibility
  createdAt: new Date().toISOString(),
};
    

    setEntries((prev) => [...prev, newEntry]);
    setLastSupporterValues(formValues);
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

  const handleAdminToggleClick = () => {
    if (!hasAdminAccess) {
      const value = window.prompt("Coach password:");
      if (value === null) return; // cancelled
      if (value !== "thunderboom") {
        alert("Incorrect password.");
        return;
      }
      setHasAdminAccess(true);
    }
    setShowAdmin((prev) => !prev);
  };

  const handleSetRaffleWinner = (year, month, dayOrNull) => {
    setRaffleWinners((prev) => {
      const key = raffleKey(year, month);
      const next = { ...prev };
      if (dayOrNull == null || dayOrNull === "") {
        delete next[key];
      } else {
        next[key] = dayOrNull;
      }
      return next;
    });
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
  As a <strong>supporter</strong>, you are buying{" "}
  <strong>raffle tickets</strong> by choosing calendar dates. The
  number on each date is the number of tickets you receive for that
  month&apos;s $100 drawing. We also record which player you&apos;re
  supporting so our players and coaches know who to thank – it
  doesn&apos;t change your odds in the drawing.
</p>
              

              <div className="venmo-zelle">
                <strong>Step 2: Pay after you claim your date(s)</strong>
                <div className="venmo-links">
                  <span>
                    Venmo:{" "}
                    <a
                      href="https://venmo.com/u/Justin-Kayse"
                      target="_blank"
                      rel="noreferrer"
                    >
                      @Justin-Kayse
                    </a>
                  </span>
                  <span> · </span>
                  <span>
                    Zelle: <strong>630-698-8769</strong>
                  </span>
                  <span> (last 4: 8769)</span>
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

        <div className="header-bottom-row">
          <div className="header-links">
            <Link to="/supporters" className="nav-link">
              View Supporters
            </Link>
          </div>
          <div className="header-buttons">
            <button className="admin-toggle" onClick={handleAdminToggleClick}>
              {showAdmin ? "Hide Admin View" : "Show Admin View"}
            </button>
          </div>
        </div>
      </header>

      {/* HOW IT WORKS SECTION */}
      <section className="how-it-works">
  <h2>How the Thunder Calendar Fundraiser Works</h2>
  <p>
    Each <strong>supporter</strong> chooses one or more available dates
    on the calendar. The number on the date is the number of{" "}
    <strong>raffle tickets</strong> you receive for that month&apos;s
    drawing.
  </p>
  <p>
    For example, if you claim <strong>January 12</strong>, you get{" "}
    <strong>12 raffle tickets</strong> for the January drawing.
  </p>
  <p>
    At the end of each month, after the fundraising window closes, we put
    all of the tickets into a drawing at a Thunder 12U Teal team practice
    and <strong>pull one winner for $100</strong>. We&apos;ll reach out to
    the winner directly by text or email.
  </p>
  <p>
    When you claim a date, you also select which player you&apos;re
    supporting. That&apos;s just so our players and coaches know who to
    thank – it does <em>not</em> affect your raffle chances.
  </p>
  <p>
    Your support helps fund professional coaches, quality indoor training
    space, and extra tournaments and games for Thunder 12U Teal. Thank you
    for investing in our players!
  </p>
</section>

      {/* MAIN CALENDAR AREA */}
      <section className="calendar-section">
        {selectedMonthIndex === null ? (
          <MonthOverviewGrid
            year={CURRENT_YEAR}
            entries={entries}
            raffleWinners={raffleWinners}
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
              raffleWinners={raffleWinners}
              onDayClick={handleDayClick}
            />
          </div>
        )}
      </section>

      {/* MODALS */}
      {showDatePrompt && selectedDay && (
        <DatePromptModal
          dayInfo={selectedDay}
          onCancel={() => {
            setShowDatePrompt(false);
            setSelectedDay(null);
          }}
          onClaim={handleOpenFormForSelectedDay}
        />
      )}

      {showForm && selectedDay && (
        <SupporterFormModal
          dayInfo={selectedDay}
          initialValues={lastSupporterValues}
          onClose={() => {
            setShowForm(false);
          }}
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
    raffleWinners={raffleWinners}
    onSetRaffleWinner={handleSetRaffleWinner}
    onQuickUpdateEntry={handleSaveEditedEntry}
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
        <div className="footer-contact">
          <strong>Questions?</strong>{" "}
          <a href="mailto:jkayse@hotmail.com">Email Coach Justin</a>
        </div>
        <small>© {CURRENT_YEAR} Kayse Softball • kaysesoftball.com</small>
      </footer>
    </div>
  );
}

/* ---------- PUBLIC VIEW COMPONENTS ---------- */

function MonthOverviewGrid({ year, entries, raffleWinners, onSelectMonth }) {
  return (
    <div className="calendar-overview-grid">
      {MONTH_NAMES.map((name, idx) => (
        <MonthOverviewTile
          key={name}
          year={year}
          monthIndex={idx}
          monthName={name}
          entries={entries}
          raffleWinners={raffleWinners}
          onClick={() => onSelectMonth(idx)}
        />
      ))}
    </div>
  );
}

function MonthOverviewTile({
  year,
  monthIndex,
  monthName,
  entries,
  raffleWinners,
  onClick,
}) {
  const cells = buildCalendarCells(year, monthIndex);

  const takenSet = new Set(
    entries
      .filter(
        (e) => e.year === year && e.month === monthIndex + 1 && !!e.playerId
      )
      .map((e) => e.day)
  );

  const raffleDay = raffleWinners[raffleKey(year, monthIndex + 1)];

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
          const isRaffle = raffleDay === cell.day;
          const className = [
            "overview-day",
            isTaken ? "overview-day-taken" : "overview-day-available",
            isRaffle ? "overview-day-raffle" : "",
          ]
            .join(" ")
            .trim();
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

function BigMonthCalendar({
  year,
  monthIndex,
  monthName,
  entries,
  raffleWinners,
  onDayClick,
}) {
  const cells = buildCalendarCells(year, monthIndex);
  const raffleDay = raffleWinners[raffleKey(year, monthIndex + 1)];

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
          const playerFirst = player ? player.firstName : "";
          const supporterName = isTaken ? entry.supporterName || "" : "";

          const isRaffle = raffleDay === cell.day;

          const className = [
            "big-day-cell",
            isTaken ? "big-day-taken" : "big-day-available",
            isRaffle ? "big-day-raffle" : "",
          ]
            .join(" ")
            .trim();

          return (
            <button
              type="button"
              key={idx}
              className={className}
              onClick={() => onDayClick(year, monthIndex + 1, cell.day)}
            >
              <div className="big-day-top-row">
                <span className="big-day-daynumber">{cell.day}</span>
                {isRaffle && <span className="big-day-raffle-tag">🎟</span>}
              </div>

              {isTaken && (
                <>
                  <div className="big-day-supporter-line">{supporterName}</div>
                  <div className="big-day-player-line">{playerFirst}</div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- MODALS: DATE PROMPT, FORM, DETAILS ---------- */

function DatePromptModal({ dayInfo, onCancel, onClaim }) {
  const monthName = MONTH_NAMES[dayInfo.month - 1];
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>
          Claim {monthName} {dayInfo.day}?
        </h2>
  <p className="modal-text">
  You are the <strong>supporter</strong> purchasing this date and the
  raffle tickets that come with it. Choosing a player simply tells us
  who you&apos;re supporting so coaches and players know who to thank –
  it doesn&apos;t change your raffle chances. Your phone is only used
  for payment questions and prize notification.
</p>
        
        <div className="modal-buttons">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onClaim}>
            Claim This Date
          </button>
        </div>
      </div>
    </div>
  );
}

function SupporterFormModal({ dayInfo, initialValues, onClose, onSubmit }) {
  const [supporterName, setSupporterName] = useState(
    initialValues.supporterName || ""
  );
  const [playerId, setPlayerId] = useState(initialValues.playerId || "");
  const [note, setNote] = useState(initialValues.note || "");
  const [phone, setPhone] = useState(initialValues.phone || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!supporterName || !playerId || !phone) {
      alert("Please fill in Supporter Name, Player, and Phone.");
      return;
    }
    onSubmit({ supporterName, playerId, note, phone });
  };

  const monthName = MONTH_NAMES[dayInfo.month - 1];

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>
          Claim {monthName} {dayInfo.day}
        </h2>
        <p className="modal-text">
          You are the <strong>supporter</strong> purchasing this date in support
          of a Thunder player. Your information will not be shown publicly
          except for your name on the calendar.
        </p>
        <form onSubmit={handleSubmit} className="modal-form">
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
            Player You Are Supporting
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
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </label>

          <label>
            Phone (for payment / questions, not shown publicly)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <p className="modal-text small">
            After submitting, please send payment via Venmo @Justin-Kayse or
            Zelle 630-698-8769 (last 4: 8769).
          </p>

          <div className="modal-buttons">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Confirm & Save</button>
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
          This date has already been claimed by a supporter.
        </p>
        <div className="entry-details">
          <p>
            <strong>Supporter:</strong> {entry.supporterName}
          </p>
          <p>
            <strong>Player Supported:</strong> {playerName}
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

function AdminPanel({
  entries,
  raffleWinners,
  onSetRaffleWinner,
  onQuickUpdateEntry, // NEW: used for checkbox updates
  onDelete,
  onEditEntry,
}) {
  const [filter, setFilter] = useState("all"); // all | paid | unpaid

  const getPaymentMeta = (entry) => {
    const owed = entry.day; // $ owed for this date
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
      const base =
        method === "zelle" ? "Paid via Zelle" : "Paid via Venmo";
      if (isFullyPaid) {
        label = `${base} (full $${amount})`;
      } else {
        label = `${base} (partial $${amount} of $${owed})`;
      }
    }

    return { owed, amount, method, isPaid, isFullyPaid, label };
  };

  const sorted = [...entries].sort((a, b) => {
    const da = new Date(a.year, a.month - 1, a.day);
    const db = new Date(b.year, b.month - 1, b.day);
    return da - db;
  });

  const filtered = sorted.filter((e) => {
    const meta = getPaymentMeta(e);
    if (filter === "paid") return meta.isPaid;
    if (filter === "unpaid") return !meta.isPaid;
    return true;
  });

  // Quick checkbox handler for Zelle/Venmo
  const handlePaymentCheckbox = (entry, method) => {
    const meta = getPaymentMeta(entry);
    const owed = meta.owed;

    // If this method is already full-paid, uncheck => unpaid
    if (meta.method === method && meta.isFullyPaid) {
      onQuickUpdateEntry({
        ...entry,
        paymentMethod: "unpaid",
        paymentAmount: 0,
        paid: false,
      });
      return;
    }

    // Otherwise, set to full payment via that method
    onQuickUpdateEntry({
      ...entry,
      paymentMethod: method,
      paymentAmount: owed,
      paid: true,
    });
  };

  // Player fundraising summary (unchanged)
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

  const monthsForRaffle = MONTH_NAMES.map((name, idx) => ({
    name,
    month: idx + 1,
  }));

  // CSV export (same as before)
  const handleExportCsv = () => {
    const header = [
      "Date",
      "Supporter",
      "Player",
      "Note",
      "Phone",
      "Owed",
      "PaymentAmount",
      "PaymentMethod",
      "PaymentStatus",
    ];

    const lines = [header.join(",")];

    for (const e of sorted) {
      const meta = getPaymentMeta(e);
      const player = PLAYERS.find((p) => p.id === e.playerId);
      const playerName = player
        ? `${player.firstName} ${player.lastName}`
        : "Unknown";
      const dateStr = `${MONTH_NAMES[e.month - 1]} ${e.day}, ${e.year}`;

      const escape = (val) => {
        const s = val == null ? "" : String(val);
        if (s.includes('"') || s.includes(",") || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const row = [
        dateStr,
        escape(e.supporterName || ""),
        escape(playerName),
        escape(e.note || ""),
        escape(e.phone || ""),
        meta.owed,
        meta.amount,
        meta.method === "unpaid"
          ? "unpaid"
          : meta.method === "zelle"
          ? "zelle"
          : "venmo",
        escape(meta.label),
      ];

      lines.push(row.join(","));
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "thunder-calendar-entries.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-panel">
      <h2>Admin View – Sponsors, Payments & Player Summary</h2>

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
          className={filter === "paid" ? "filter-button active" : "filter-button"}
          onClick={() => setFilter("paid")}
        >
          Paid (any method)
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
        <button
          type="button"
          className="filter-button"
          onClick={handleExportCsv}
          style={{ marginLeft: "auto" }}
        >
          Export CSV
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
                <th>Supporter</th>
                <th>Player Supported</th>
                <th>Note</th>
                <th>Phone (private)</th>
                <th>Zelle</th>
                <th>Venmo</th>
                <th>Payment status</th>
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
                const meta = getPaymentMeta(e);

                const zelleChecked =
                  meta.method === "zelle" && meta.isFullyPaid;
                const venmoChecked =
                  meta.method === "venmo" && meta.isFullyPaid;

                return (
                  <tr key={e.id}>
                    <td>
                      {MONTH_NAMES[e.month - 1]} {e.day}, {e.year}
                    </td>
                    <td>{e.supporterName}</td>
                    <td>{playerName}</td>
                    <td>{e.note}</td>
                    <td>{e.phone}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={zelleChecked}
                        onChange={() => handlePaymentCheckbox(e, "zelle")}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={venmoChecked}
                        onChange={() => handlePaymentCheckbox(e, "venmo")}
                      />
                    </td>
                    <td>{meta.label}</td>
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

      {/* Raffle winners selection */}
      <h3 className="admin-summary-title">Monthly Raffle Winners</h3>
      <p className="admin-note">
        Choose one winning day per month. Selected dates will be highlighted
        with a yellow circle on the calendars.
      </p>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Winning Day</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {monthsForRaffle.map((m) => {
              const key = `${CURRENT_YEAR}-${m.month}`;
              const selectedDay = raffleWinners[key] || "";
              const daysInMonth = new Date(
                CURRENT_YEAR,
                m.month,
                0
              ).getDate();
              const options = [];
              for (let d = 1; d <= daysInMonth; d++) {
                options.push(d);
              }
              return (
                <tr key={m.month}>
                  <td>{m.name}</td>
                  <td>
                    <select
                      value={selectedDay}
                      onChange={(e) =>
                        onSetRaffleWinner(
                          CURRENT_YEAR,
                          m.month,
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      <option value="">— none —</option>
                      {options.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {selectedDay ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                          onSetRaffleWinner(CURRENT_YEAR, m.month, null)
                        }
                      >
                        Clear winner
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#666" }}>
                        No winner selected
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Player fundraising summary */}
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
                  Sum of date numbers{" "}
                  <span className="summary-hint">
                    (e.g., December 12 + August 27 = 12 + 27 = 39)
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
        Use this view to track who has supported each player, how many days
        are sponsored, and export a CSV snapshot of all entries and payment
        status.
      </p>
    </section>
  );
}

function EditEntryModal({ entry, onClose, onSave }) {
  const [supporterName, setSupporterName] = useState(entry.supporterName || "");
  const [playerId, setPlayerId] = useState(entry.playerId || "");
  const [note, setNote] = useState(entry.note || "");
  const [phone, setPhone] = useState(entry.phone || "");
  const [paid, setPaid] = useState(!!entry.paid);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...entry,
      supporterName,
      playerId,
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
            Supporter Name
            <input
              type="text"
              value={supporterName}
              onChange={(e) => setSupporterName(e.target.value)}
              required
            />
          </label>

          <label>
            Player Supported
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
