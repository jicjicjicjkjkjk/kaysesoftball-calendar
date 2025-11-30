import React, { useState, useEffect } from "react";
import { PLAYERS } from "./players";

const STORAGE_KEY = "kaysesoftball_calendar_entries_v1";
const PIN_STORAGE_KEY = "kaysesoftball_player_pins_v1";

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

function formatDate(entry) {
  const monthName = MONTH_NAMES[entry.month - 1] || "";
  return `${monthName} ${entry.day}, ${entry.year}`;
}

// Same meta logic as Admin, but we only care about "Paid" vs "Unpaid"
function getPaymentMeta(entry) {
  const owed = entry.day; // $ owed for this date
  const methodRaw = entry.paymentMethod || "unpaid";
  const amount = Number(entry.paymentAmount || 0);

  const method =
    methodRaw === "zelle" || methodRaw === "venmo" ? methodRaw : "unpaid";

  const isPaid = method !== "unpaid" && amount >= owed;

  return {
    owed,
    amount,
    isPaid,
    label: isPaid ? "Paid" : "Unpaid",
  };
}

export default function SupportersPage() {
  const [entries, setEntries] = useState([]);
  const [pinOverrides, setPinOverrides] = useState({});
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [enteredPin, setEnteredPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "date", // "date" | "supporter" | "status"
    direction: "asc",
  });

  // Load entries and PIN overrides
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEntries(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Failed to load entries on Supporters page", err);
    }

    try {
      const rawPins = localStorage.getItem(PIN_STORAGE_KEY);
      if (rawPins) {
        setPinOverrides(JSON.parse(rawPins));
      }
    } catch (err) {
      console.error("Failed to load PIN overrides on Supporters page", err);
    }
  }, []);

  const effectivePlayers = PLAYERS.map((p) => ({
    ...p,
    effectivePin: pinOverrides[p.id] ?? p.pin ?? "",
  }));

  const selectedPlayer = effectivePlayers.find(
    (p) => p.id === selectedPlayerId
  );

  const playerLabel = selectedPlayer
    ? `${selectedPlayer.firstName} ${selectedPlayer.lastName} #${selectedPlayer.number}`
    : "Select a player";

  const handleVerifyPin = () => {
    if (!selectedPlayerId) {
      setPinError("Please select a player first.");
      setPinVerified(false);
      return;
    }
    const expectedPin = (selectedPlayer?.effectivePin || "").trim();
    if (!expectedPin) {
      setPinError(
        "No PIN is set for this player yet. Please contact Coach Justin."
      );
      setPinVerified(false);
      return;
    }
    if (enteredPin.trim() !== expectedPin) {
      setPinError("Incorrect PIN. Please try again.");
      setPinVerified(false);
      return;
    }
    setPinError("");
    setPinVerified(true);
  };

  // Filter entries to this player once PIN is verified
  const playerEntries = pinVerified
    ? entries.filter((e) => e.playerId === selectedPlayerId)
    : [];

  // Build rows with meta + date object for sorting
  const rowsWithMeta = playerEntries.map((e) => {
    const meta = getPaymentMeta(e);
    const dateObj = new Date(e.year, e.month - 1, e.day);
    return { entry: e, meta, dateObj };
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

  const sortedRows = [...rowsWithMeta].sort((a, b) => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    switch (sortConfig.key) {
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
        const sa = (a.meta.label || "").toLowerCase();
        const sb = (b.meta.label || "").toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
      }
      default:
        return 0;
    }
  });

  return (
    <div className="supporters-page page">
      <header className="supporters-header">
        <h1>Thunder 12U Teal – Supporters</h1>
        <p className="supporters-intro">
          Use this page to confirm the dates you’ve purchased and see the
          fundraising progress for a specific player.
        </p>
        <p className="supporters-note">
          Families: choose your player below and enter their 4-digit PIN to
          unlock their fundraising details.
        </p>
      </header>

      {/* Player + PIN unlock */}
      <section className="supporters-pin-section">
        <div className="supporters-pin-row">
          <label className="supporters-label">
            Player
            <select
              value={selectedPlayerId}
              onChange={(e) => {
                setSelectedPlayerId(e.target.value);
                setPinVerified(false);
                setPinError("");
              }}
            >
              <option value="">Select a player…</option>
              {effectivePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} #{p.number}
                </option>
              ))}
            </select>
          </label>

          <label className="supporters-label">
            PIN
            <input
              type="password"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              maxLength={4}
              inputMode="numeric"
              placeholder="4-digit PIN"
            />
          </label>

          <button
            type="button"
            className="supporters-unlock-button"
            onClick={handleVerifyPin}
          >
            Unlock
          </button>
        </div>

        {pinError && <p className="supporters-error">{pinError}</p>}

        {pinVerified && selectedPlayer && (
          <p className="supporters-success">
            Fundraising unlocked for <strong>{playerLabel}</strong>.
          </p>
        )}
      </section>

      {/* Supporters list and fundraising table */}
      {pinVerified && selectedPlayer && (
        <>
          {/* Simple supporters list */}
          <section className="supporters-list-section">
            <h2>
              Supporters for {selectedPlayer.firstName}{" "}
              {selectedPlayer.lastName} #{selectedPlayer.number}
            </h2>
            {playerEntries.length === 0 ? (
              <p>No dates have been claimed for this player yet.</p>
            ) : (
              <ul className="supporters-list">
                {playerEntries.map((e) => (
                  <li key={e.id} className="supporter-item">
                    <span className="supporter-date">{formatDate(e)}</span>
                    <span className="supporter-name">
                      {e.supporterName || "Unnamed supporter"}
                    </span>
                    {e.note && (
                      <span className="supporter-note">“{e.note}”</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Fundraising table (sortable) */}
          <section className="supporters-table-section">
            <h2>Fundraising Details for Your Player</h2>
            <p className="supporters-note">
              This table shows every calendar date purchased in support of your
              player and whether each date is marked as paid.
            </p>

            {sortedRows.length === 0 ? (
              <p>No fundraising entries yet.</p>
            ) : (
              <div className="supporters-table-wrapper">
                <table className="supporters-table">
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort("date")}
                        className="sortable-col"
                      >
                        Date{sortIndicator("date")}
                      </th>
                      <th
                        onClick={() => handleSort("supporter")}
                        className="sortable-col"
                      >
                        Supporter{sortIndicator("supporter")}
                      </th>
                      <th>Note</th>
                      <th
                        onClick={() => handleSort("status")}
                        className="sortable-col"
                      >
                        Payment status{sortIndicator("status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map(({ entry, meta }) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry)}</td>
                        <td>{entry.supporterName}</td>
                        <td>{entry.note}</td>
                        <td>{meta.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
