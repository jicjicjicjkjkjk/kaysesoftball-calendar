import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PLAYERS } from "./players";

// Helper to compute payment status for an entry
function getPaymentMeta(entry) {
  const owed = entry.day; // price is the day number
  const methodRaw = entry.paymentMethod || "unpaid";
  const amount = Number(entry.paymentAmount || 0);

  const method =
    methodRaw === "zelle" || methodRaw === "venmo" ? methodRaw : "unpaid";

  const isPaid = method !== "unpaid" && amount >= owed;
  const isPartial = method !== "unpaid" && amount > 0 && amount < owed;

  let label;
  if (isPaid) label = "Paid";
  else if (isPartial) label = "Partially paid";
  else label = "Unpaid";

  return { owed, amount, method, isPaid, isPartial, label };
}

// Strip to last 4 digits of a phone number
function last4Digits(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.slice(-4);
}

/**
 * Supporters page:
 * - Choose a player
 * - See supporter list (name + # of days + sum of dates)
 * - Click a supporter → enter PIN → see that supporter’s dates w/ paid/unpaid
 *
 * Props:
 *   entries: array of calendar entry rows from Supabase
 *   playerPins: optional map { [playerId]: "1234" }
 *              (we still fall back to PLAYERS.pin if not provided)
 */
export default function SupportersPage({ entries = [], playerPins = {} }) {
  // Build effective player list with PINs (from DB overrides if present)
  const effectivePlayers = useMemo(
    () =>
      PLAYERS.map((p) => ({
        ...p,
        effectivePin: playerPins[p.id] ?? p.pin ?? "",
      })),
    [playerPins]
  );

  const [selectedPlayerId, setSelectedPlayerId] = useState(
    effectivePlayers[0]?.id || ""
  );

  const [sortConfig, setSortConfig] = useState({
    key: "supporter", // "supporter" | "days" | "sum"
    direction: "asc",
  });

  // Which supporter is currently unlocked for details (per player)
  const [unlockedSupporterKey, setUnlockedSupporterKey] = useState(null);

  // All entries for the selected player
  const playerEntries = useMemo(() => {
    if (!selectedPlayerId) return [];
    return entries.filter((e) => e.playerId === selectedPlayerId);
  }, [entries, selectedPlayerId]);

  // Summary for the selected player (days sold + sum of dates)
  const playerSummary = useMemo(() => {
    let days = 0;
    let sum = 0;
    for (const e of playerEntries) {
      days += 1;
      sum += e.day;
    }
    return { days, sum };
  }, [playerEntries]);

  // Group supporters for selected player: supporterName -> { days, sum, phones, entries }
  const supporterRows = useMemo(() => {
    const map = new Map();

    for (const e of playerEntries) {
      const key = e.supporterName || "Unknown supporter";
      if (!map.has(key)) {
        map.set(key, {
          supporterName: key,
          days: 0,
          sum: 0,
          phones: new Set(),
          entries: [],
        });
      }
      const rec = map.get(key);
      rec.days += 1;
      rec.sum += e.day;
      if (e.phone) rec.phones.add(e.phone);
      rec.entries.push(e);
    }

    const rows = Array.from(map.values());

    // Sorting
    return rows.sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      switch (sortConfig.key) {
        case "days":
          if (a.days < b.days) return -1 * dir;
          if (a.days > b.days) return 1 * dir;
          return 0;
        case "sum":
          if (a.sum < b.sum) return -1 * dir;
          if (a.sum > b.sum) return 1 * dir;
          return 0;
        case "supporter":
        default: {
          const sa = a.supporterName.toLowerCase();
          const sb = b.supporterName.toLowerCase();
          if (sa < sb) return -1 * dir;
          if (sa > sb) return 1 * dir;
          return 0;
        }
      }
    });
  }, [playerEntries, sortConfig]);

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

  const handleSelectPlayer = (playerId) => {
    setSelectedPlayerId(playerId);
    setUnlockedSupporterKey(null);
  };

  const handleClickSupporter = (row) => {
    if (!selectedPlayerId) return;

    const player = effectivePlayers.find((p) => p.id === selectedPlayerId);
    const playerPin = (player?.effectivePin || "").trim();
    const supporterKey = `${selectedPlayerId}__${row.supporterName}`;

    const pin = window.prompt(
      "Enter the 4-digit PIN for this player, or the last 4 digits of your phone number:"
    );
    if (pin == null) return; // cancelled

    const entered = pin.trim();

    // Valid pins:
    const validPins = new Set();

    if (playerPin && playerPin.length >= 4) {
      validPins.add(playerPin.slice(-4));
    }

    // Add last-4-digit versions of all phones used by this supporter
    for (const phone of row.phones) {
      const last4 = last4Digits(phone);
      if (last4) validPins.add(last4);
    }

    if (validPins.has(entered)) {
      setUnlockedSupporterKey(supporterKey);
    } else {
      alert("Incorrect PIN. Please try again or contact Coach Justin.");
    }
  };

  const selectedPlayer = effectivePlayers.find(
    (p) => p.id === selectedPlayerId
  );

  return (
    <div className="page supporters-page">
      <header className="header">
        <div className="hero supporters-hero">
          <div className="hero-left">
            <div className="hero-logo-wrap">
              <img
                src="/thunder-logo.jpg"
                alt="Arlington Heights Thunder Fastpitch"
                className="hero-logo"
              />
            </div>
            <div className="hero-text">
              <h1>Thunder 12U Teal – Supporters</h1>
              <p>
                This page shows who has supported each player in the calendar
                fundraiser. Families can use a PIN (or last 4 of phone) to see
                detailed dates and payment status for their own supporters.
              </p>
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

      <section className="supporters-layout">
        {/* PLAYER LIST */}
        <aside className="supporters-player-list">
          <h2>Players</h2>
          <ul>
            {effectivePlayers.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={
                    p.id === selectedPlayerId ? "player-pill active" : "player-pill"
                  }
                  onClick={() => handleSelectPlayer(p.id)}
                >
                  #{p.number} {p.firstName} {p.lastName}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* MAIN CONTENT */}
        <main className="supporters-main">
          {selectedPlayer ? (
            <>
              <h2>
                Supporters for #{selectedPlayer.number} {selectedPlayer.firstName}{" "}
                {selectedPlayer.lastName}
              </h2>

              <p className="supporters-summary">
                <strong>Fundraising summary:</strong>{" "}
                {playerSummary.days === 0 ? (
                  <>No dates claimed yet.</>
                ) : (
                  <>
                    {playerSummary.days} day
                    {playerSummary.days !== 1 ? "s" : ""} sold, sum of date
                    numbers = <strong>{playerSummary.sum}</strong>.
                  </>
                )}
              </p>

              {supporterRows.length === 0 ? (
                <p>No supporters yet for this player.</p>
              ) : (
                <>
                  <div className="admin-table-wrapper">
                    <table className="admin-table supporters-table">
                      <thead>
                        <tr>
                          <th
                            onClick={() => handleSort("supporter")}
                            className="sortable-col"
                          >
                            Supporter{sortIndicator("supporter")}
                          </th>
                          <th
                            onClick={() => handleSort("days")}
                            className="sortable-col"
                          >
                            Days sponsored{sortIndicator("days")}
                          </th>
                          <th
                            onClick={() => handleSort("sum")}
                            className="sortable-col"
                          >
                            Sum of date numbers{sortIndicator("sum")}
                          </th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supporterRows.map((row) => {
                          const supporterKey = `${selectedPlayerId}__${row.supporterName}`;
                          const isUnlocked =
                            unlockedSupporterKey === supporterKey;
                          return (
                            <React.Fragment key={supporterKey}>
                              <tr>
                                <td>{row.supporterName}</td>
                                <td>{row.days}</td>
                                <td>{row.sum}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="link-button"
                                    onClick={() => handleClickSupporter(row)}
                                  >
                                    {isUnlocked ? "Hide details" : "View details"}
                                  </button>
                                </td>
                              </tr>
                              {isUnlocked && (
                                <tr className="supporter-details-row">
                                  <td colSpan={4}>
                                    <SupporterDetails entries={row.entries} />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="supporters-note">
                    To see your detailed dates, click your name and enter the
                    player PIN or the last 4 digits of the phone number used
                    when the dates were purchased.
                  </p>
                </>
              )}
            </>
          ) : (
            <p>Select a player on the left to see their supporters.</p>
          )}
        </main>
      </section>
    </div>
  );
}

// Renders the unlocked supporter’s detailed dates
function SupporterDetails({ entries }) {
  if (!entries || entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => {
    const da = new Date(a.year, a.month - 1, a.day);
    const db = new Date(b.year, b.month - 1, b.day);
    return da - db;
  });

  return (
    <div className="supporter-details">
      <h4>Claimed dates &amp; payment status</h4>
      <ul>
        {sorted.map((e) => {
          const meta = getPaymentMeta(e);
          const dateStr = `${e.month}/${e.day}/${e.year}`;
          return (
            <li key={e.id}>
              <span className="supporter-date">{dateStr}</span>{" "}
              <span className={`supporter-status status-${meta.label.toLowerCase().replace(" ", "-")}`}>
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="supporters-note small">
        Payment info here is for your dates only. If anything looks wrong, please
        contact Coach Justin.
      </p>
    </div>
  );
}
