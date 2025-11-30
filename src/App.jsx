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
const PIN_STORAGE_KEY = "kaysesoftball_player_pins_v1";

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

  const [pinOverrides, setPinOverrides] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PIN_STORAGE_KEY);
      if (raw) {
        setPinOverrides(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load pin overrides", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinOverrides));
    } catch (e) {
      console.error("Failed to save pin overrides", e);
    }
  }, [pinOverrides]);

  const effectivePlayers = PLAYERS.map((p) => ({
    ...p,
    effectivePin: pinOverrides[p.id] ?? p.pin ?? "",
  }));

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
      paymentMethod: "unpaid", // "unpaid" | "zelle" | "venmo"
      paymentAmount: 0,
      paid: false,
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => [...prev, newEntry]);
    setLastSupporterValues(formValues);
    setShowForm(false);
    setSelectedDay(null);
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
        {/* Social media banner */}
        <div className="social-banner">
          Follow along on our social media!{" "}
          <a
            href="https://www.instagram.com/thunder.fastpitch.12uteal?igsh=MWh0a3F1bmx3ZGw5eA=="
            target="_blank"
            rel="noreferrer"
          >
            Instagram: @thunder.fastpitch.12uteal
          </a>
        </div>

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
                number on each date is the number of tickets you receive for
                that month&apos;s $100 drawing. We also record which player
                you&apos;re supporting so our players and coaches know who to
                thank – it doesn&apos;t change your odds in the drawing.
              </p>

              <div className="venmo-zelle">
                <strong>Pay after you claim your date(s)</strong>
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
                </div>
                {/* Venmo QR code */}
                <div className="venmo-qr">
                  <img
                    src="/venmo-qr.png"
                    alt="Venmo QR code for @Justin-Kayse"
                    className="venmo-qr-image"
                    style={{
                      maxWidth: "180px",
                      width: "100%",
                      marginTop: "0.5rem",
                      borderRadius: "8px",
                    }}
                  />
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
          Each supporter chooses one or more available dates on the calendar.
          The number on the date is the number of raffle tickets you receive for
          that month’s drawing. For example, if you claim{" "}
          <strong>January 12</strong>, you get{" "}
          <strong>12 raffle tickets</strong> for the January drawing.
        </p>

        <p>
          Because we run this fundraiser during softball season, we combine
          in-season and out-of-season months so drawings can be held when the
          team is together. We will draw winners on the schedule below:
        </p>

        <ul>
          <li>
            <strong>January drawing:</strong> includes January &amp; August
            dates
          </li>
          <li>
            <strong>February drawing:</strong> includes February &amp; September
            dates
          </li>
          <li>
            <strong>March drawing:</strong> includes March &amp; October dates
          </li>
          <li>
            <strong>April drawing:</strong> includes April &amp; November dates
          </li>
          <li>
            <strong>May drawing:</strong> includes May &amp; December dates
          </li>
          <li>
            <strong>June drawing:</strong> includes June dates only
          </li>
          <li>
            <strong>July drawing:</strong> includes July dates only
          </li>
        </ul>

        <p>
          At some point during each month — when Thunder 12U Teal is together
          for practice — we will pull one winner for <strong>$100</strong> and
          contact the supporter directly by text or email.
        </p>

        <p>
          When you claim a date, you also select which player you’re supporting.
          This is <strong>only</strong> so our players and coaches know who to
          thank — it does <strong>not affect your raffle chances</strong>.
        </p>

        <p>
          At any time, you can visit the <strong>Supporters</strong> page to
          verify your dates and confirm that your payment has been received.
        </p>

        <p>
          <strong>Thank you for supporting Thunder 12U Teal!</strong>
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
          <a href="mailto:jkayse@hotmail.com">Email Coach Justin</a> or text{" "}
          <a href="sms:16306988769">630-698-8769</a>.
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
            Zelle 630-698-8769.
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
