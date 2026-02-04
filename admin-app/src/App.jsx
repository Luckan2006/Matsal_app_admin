import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { jsPDF } from "jspdf";
import Login from "./Login";
import "./app.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f7f"];
const RADIAN = Math.PI / 180;

const renderPercentLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
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
  const [checkingApproval, setCheckingApproval] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [countsToday, setCountsToday] = useState(null);
  const [rangeRows, setRangeRows] = useState([]);

  const [selectedDay, setSelectedDay] = useState(null);
  const [daysToShow, setDaysToShow] = useState(7);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("historik");

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [pdfName, setPdfName] = useState("");

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayLabel = today.toLocaleDateString("sv-SE");

  const generatePDF = (dataArray, pdfName) => {
    const doc = new jsPDF();
    const itemsPerPage = 4;
    let pageIndex = 0;

    for (let i = 0; i < dataArray.length; i += itemsPerPage) {
      const pageData = dataArray.slice(i, i + itemsPerPage);

      if (pageIndex > 0) {
        doc.addPage();
      }

      pageData.forEach((data, index) => {
        const { one, two, three, four, day } = data;
        const ypos = 10 + index * 60;
        doc.text("Statistik för " + day, 10, ypos);
        doc.text(`Hann inte äta: ${one}`, 10, ypos + 10);
        doc.text(`Tog för mycket: ${two}`, 10, ypos + 20);
        doc.text(`Ogillade maten: ${three}`, 10, ypos + 30);
        doc.text(`Slängde inte: ${four}`, 10, ypos + 40);
      });
      pageIndex++;
    }
    doc.save(`${pdfName.trim() || "statistik"}.pdf`);
  };

  const handleDownloadData = () => {
    // Take the most recent N days (already sorted newest first after fetch)
    const data = rangeRows.slice(0, daysToShow);

    console.log("Days to show:", daysToShow);
    console.log("Data length for PDF:", data.length);
    console.log("Days included in PDF:", data.map(d => d.day));

    generatePDF(data, pdfName);
  };

  const handleOpenPopup = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleDownload = () => {
    handleDownloadData();
    handleClosePopup();
  };

  const handlePdfNameChange = (e) => {
    setPdfName(e.target.value);
  };

  useEffect(() => {
    let mounted = true;

    async function handleSession(session) {
      if (!session?.user) {
        if (mounted) {
          setSession(null);
          setCheckingApproval(false);
        }
        return;
      }

      setCheckingApproval(true);
      setAuthError(null);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", session.user.id)
        .single();

      if (error || !profile?.approved) {
        await supabase.auth.signOut();
        if (mounted) {
          setSession(null);
          setAuthError("Ditt konto är inte godkänt ännu.");
          setCheckingApproval(false);
        }
        return;
      }

      if (mounted) {
        setSession(session);
        setCheckingApproval(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
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

    // We keep newest first (no reverse) so PDF gets newest → oldest
    // But your table shows oldest first, so we reverse only for display
    const rowsForDisplay = (data || []).slice().reverse(); // oldest → newest for table
    setRangeRows(rowsForDisplay);

    const todayRow = rowsForDisplay.find((r) => r.day === todayStr);
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
        rowsForDisplay.find((r) => r.day === todayStr)?.day ??
        rowsForDisplay[rowsForDisplay.length - 1]?.day ??
        null;
      setSelectedDay(fallback);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!session) return;
    fetchClicks(daysToShow);
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
    selectedCounts.one +
    selectedCounts.two +
    selectedCounts.three +
    selectedCounts.four;

  const pieData = useMemo(() => {
    return [
      { name: "Hann inte äta", value: selectedCounts.one },
      { name: "Tog för mycket", value: selectedCounts.two },
      { name: "Ogillade maten", value: selectedCounts.three },
      { name: "Slängde inte", value: selectedCounts.four },
    ].filter((item) => item.value > 0);
  }, [selectedCounts]);

  const rangeTotal =
    rangeTotals.one +
    rangeTotals.two +
    rangeTotals.three +
    rangeTotals.four;

  const showPeriodBlock = rangeTotal !== selectedTotal;

  if (checkingApproval) {
    return <h1 style={{ padding: "2rem" }}>Verifierar konto…</h1>;
  }

  if (!session) {
    return <Login externalError={authError} />;
  }

  if (loading) {
    return <h1 style={{ padding: "2rem" }}>Laddar…</h1>;
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

      <button className="download-btn" onClick={handleOpenPopup}>
        Ladda ner data
      </button>

      {isPopupOpen && (
        <div className="popup">
          <div className="popup-content">
            <h2>Välj antal dagar att inkludera</h2>
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
            <input
              type="text"
              placeholder="Skriv PDF namn här"
              value={pdfName}
              onChange={handlePdfNameChange}
              className="pdf-input"
            />
            <button onClick={handleDownload}>Ladda ner PDF</button>
            <button onClick={handleClosePopup}>Stäng</button>
          </div>
        </div>
      )}

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
          Graf & summering
        </button>
      </nav>

      <div className="admin-main">
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
                        setActiveTab("graf");
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