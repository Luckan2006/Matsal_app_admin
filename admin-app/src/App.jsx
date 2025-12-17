import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import "./app.css";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f7f"];
const RADIAN = Math.PI / 180;

const renderPercentLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function App() {
  const [session, setSession] = useState(null);

  const [countsToday, setCountsToday] = useState(null);
  const [rangeRows, setRangeRows] = useState([]);

  const [selectedDay, setSelectedDay] = useState(null);
  const [daysToShow, setDaysToShow] = useState(7);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Nytt: flikar (visas på mobil via CSS)
  const [activeTab, setActiveTab] = useState("historik"); // "historik" | "graf"

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayLabel = today.toLocaleDateString("sv-SE");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setCountsToday(null);
    setRangeRows([]);
    setSelectedDay(null);
    setActiveTab("historik");
  }

  function formatDay(dayStr) {
    const d = new Date(dayStr);
    return d.toLocaleDateString("sv-SE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  async function fetchClicks(limitDays = daysToShow) {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("daily_clicks")
      .select("day, one, two, three, four")
      .order("day", { ascending: false })
      .limit(limitDays);

    if (error) {
      console.error(error);
      setError("Kunde inte hämta data");
      setLoading(false);
      return;
    }

    const rows = (data || []).slice().reverse();
    setRangeRows(rows);

    const todayRow = rows.find((r) => r.day === todayStr);
    if (todayRow) {
      setCountsToday({
        one: todayRow.one ?? 0,
        two: todayRow.two ?? 0,
        three: todayRow.three ?? 0,
        four: todayRow.four ?? 0,
      });
    } else {
      setCountsToday({ one: 0, two: 0, three: 0, four: 0 });
    }

    if (!selectedDay) {
      const fallback =
        rows.find((r) => r.day === todayStr)?.day ?? rows[rows.length - 1]?.day ?? null;
      setSelectedDay(fallback);
    } else {
      const stillExists = rows.some((r) => r.day === selectedDay);
      if (!stillExists) {
        setSelectedDay(rows[rows.length - 1]?.day ?? null);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!session) return;
    fetchClicks(daysToShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, daysToShow]);

  const selectedRow = useMemo(() => {
    if (!selectedDay) return null;
    return rangeRows.find((r) => r.day === selectedDay) ?? null;
  }, [rangeRows, selectedDay]);

  const selectedCounts = useMemo(() => {
    if (!selectedRow) return { one: 0, two: 0, three: 0, four: 0 };
    return {
      one: selectedRow.one ?? 0,
      two: selectedRow.two ?? 0,
      three: selectedRow.three ?? 0,
      four: selectedRow.four ?? 0,
    };
  }, [selectedRow]);

  const rangeTotals = useMemo(() => {
    return rangeRows.reduce(
      (acc, row) => ({
        one: acc.one + (row.one ?? 0),
        two: acc.two + (row.two ?? 0),
        three: acc.three + (row.three ?? 0),
        four: acc.four + (row.four ?? 0),
      }),
      { one: 0, two: 0, three: 0, four: 0 }
    );
  }, [rangeRows]);

  const selectedTotal =
    selectedCounts.one + selectedCounts.two + selectedCounts.three + selectedCounts.four;

  const pieData = useMemo(() => {
    return [
      { name: "Hann inte äta", value: selectedCounts.one },
      { name: "Tog för mycket", value: selectedCounts.two },
      { name: "Ogillade maten", value: selectedCounts.three },
      { name: "Slängde inte", value: selectedCounts.four },
    ].filter((item) => item.value > 0);
  }, [selectedCounts]);

  const rangeTotal =
    rangeTotals.one + rangeTotals.two + rangeTotals.three + rangeTotals.four;

  const showPeriodBlock = rangeTotal !== selectedTotal;

  if (!session) return <Login />;

  if (loading) {
    return <h1 style={{ padding: "2rem" }}>Laddar...</h1>;
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <button onClick={logout}>Logga ut</button>
        <h1>{error}</h1>
      </div>
    );
  }

  if (!countsToday) {
    return (
      <div style={{ padding: "2rem" }}>
        <button onClick={logout}>Logga ut</button>
        <h1>Ingen data hittades i daily_clicks</h1>
      </div>
    );
  }

  return (
    <div className="admin">
      <button className="logout-btn" onClick={logout}>
        Logga ut
      </button>

      {/* Tabs: visas på mobil via CSS */}
      <nav className="tabs">
        <button
          className={`tab-btn ${activeTab === "historik" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("historik")}
        >
          Historik
        </button>
        <button
          className={`tab-btn ${activeTab === "graf" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("graf")}
        >
          Graf &amp; summering
        </button>
      </nav>

      <div className="admin-main">
        {/* Vänsterkolumn: Historik */}
        <div className={`admin-left ${activeTab === "historik" ? "panel-show" : "panel-hide"}`}>
          <h1>Nuvarande totalsiffror för datum {todayLabel}</h1>

          <table>
            <thead>
              <tr>
                <th>Hann inte äta</th>
                <th>Tog för mycket</th>
                <th>Ogillade maten</th>
                <th>Slängde inte</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{countsToday.one}</td>
                <td>{countsToday.two}</td>
                <td>{countsToday.three}</td>
                <td>{countsToday.four}</td>
              </tr>
            </tbody>
          </table>

          <div className="range-header">
            <h2>Historik</h2>

            <div className="range-controls">
              <label className="range-label">
                Visa:
                <select
                  value={daysToShow}
                  onChange={(e) => setDaysToShow(Number(e.target.value))}
                >
                  <option value={7}>7 dagar</option>
                  <option value={14}>14 dagar</option>
                  <option value={30}>30 dagar</option>
                  <option value={90}>90 dagar</option>
                  <option value={180}>180 dagar</option>
                  <option value={365}>1 år</option>
                </select>
              </label>

              <button className="refresh-btn" onClick={() => fetchClicks(daysToShow)}>
                Uppdatera
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dag</th>
                  <th>Hann inte äta</th>
                  <th>Tog för mycket</th>
                  <th>Ogillade maten</th>
                  <th>Slängde inte</th>
                </tr>
              </thead>
              <tbody>
                {rangeRows.length === 0 && (
                  <tr>
                    <td colSpan={5}>Ingen data tillgänglig ännu</td>
                  </tr>
                )}

                {rangeRows.map((row) => {
                  const isSelected = row.day === selectedDay;
                  return (
                    <tr
                      key={row.day}
                      className={isSelected ? "row-selected" : "row-clickable"}
                      onClick={() => {
                        setSelectedDay(row.day);

                        // Rekommenderat för mobil-flow:
                        // välj dag -> hoppa till graf-fliken.
                        setActiveTab("graf");

                        // Om du INTE vill auto-hoppa, kommentera raden ovan.
                      }}
                      title="Klicka för att visa graf för denna dag"
                    >
                      <td>{formatDay(row.day)}</td>
                      <td>{row.one}</td>
                      <td>{row.two}</td>
                      <td>{row.three}</td>
                      <td>{row.four}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Högerkolumn: Graf + summering */}
        <div className={`admin-right ${activeTab === "graf" ? "panel-show" : "panel-hide"}`}>
          <h2>
            Fördelning för vald dag{" "}
            <span className="selected-day-pill">
              {selectedDay ? formatDay(selectedDay) : "Ingen vald"}
            </span>
          </h2>

          {pieData.length === 0 ? (
            <p>Ingen data att visa i grafen för vald dag.</p>
          ) : (
            <div className="chart-card">
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={70}
                      label={renderPercentLabel}
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={56} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <h3 style={{ marginTop: "1.2rem" }}>Summering</h3>

          <div className="week-summary-box">
            <div className="summary-block">
              <p className="summary-title">
                <strong>Vald dag total:</strong> {selectedTotal}
              </p>

              <ul className="summary-list">
                <li className="summary-item">
                  <span className="summary-dot summary-dot-one" />
                  <span>Hann inte äta (vald dag): {selectedCounts.one}</span>
                </li>
                <li className="summary-item">
                  <span className="summary-dot summary-dot-two" />
                  <span>Tog för mycket (vald dag): {selectedCounts.two}</span>
                </li>
                <li className="summary-item">
                  <span className="summary-dot summary-dot-three" />
                  <span>Ogillade maten (vald dag): {selectedCounts.three}</span>
                </li>
                <li className="summary-item">
                  <span className="summary-dot summary-dot-four" />
                  <span>Slängde inte (vald dag): {selectedCounts.four}</span>
                </li>
              </ul>
            </div>

            {showPeriodBlock && (
              <>
                <div className="summary-sep" />

                <div className="summary-block">
                  <p className="summary-title">
                    <strong>Totalt i perioden ({daysToShow} dagar):</strong> {rangeTotal}
                  </p>

                  <ul className="summary-list">
                    <li className="summary-item">
                      <span className="summary-dot summary-dot-one" />
                      <span>Hann inte äta (period): {rangeTotals.one}</span>
                    </li>
                    <li className="summary-item">
                      <span className="summary-dot summary-dot-two" />
                      <span>Tog för mycket (period): {rangeTotals.two}</span>
                    </li>
                    <li className="summary-item">
                      <span className="summary-dot summary-dot-three" />
                      <span>Ogillade maten (period): {rangeTotals.three}</span>
                    </li>
                    <li className="summary-item">
                      <span className="summary-dot summary-dot-four" />
                      <span>Slängde inte (period): {rangeTotals.four}</span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
