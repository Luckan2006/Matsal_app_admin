import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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

const DailyPieChartForPDF = ({ day, data, id }) => {
  const pieData = [
    { name: "Hann inte äta", value: data.one || 0 },
    { name: "Tog för mycket", value: data.two || 0 },
    { name: "Ogillade maten", value: data.three || 0 },
    { name: "Slängde inte", value: data.four || 0 },
  ].filter((item) => item.value > 0);

  if (pieData.length === 0) return null;

  return (
    <div
      id={id}
      style={{
        width: "600px",
        height: "560px",
        background: "#ffffff",
        padding: "16px",
        boxSizing: "border-box",
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={180}
            label={renderPercentLabel}
            labelLine={false}
            isAnimationActive={false}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            verticalAlign="bottom"
            height={60}
            iconSize={14}
            wrapperStyle={{ fontSize: "13px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

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
  const [isContactOpen, setIsContactOpen] = useState(false);

  const [schoolMenu, setSchoolMenu] = useState([]);
  const [menuError, setMenuError] = useState(null);
  const [savingFood, setSavingFood] = useState({});
  const [manualFood, setManualFood] = useState("");
  const [menuSaveDate, setMenuSaveDate] = useState("");

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayLabel = today.toLocaleDateString("sv-SE");

  const generatePDF = async (dataArray, pdfName) => {
    const doc = new jsPDF();
    const pageW = 210;
    const statColors = [
      [136, 132, 216],
      [130, 202, 157],
      [255, 198, 88],
      [255, 127, 127],
    ];
    const statLabels = ["Hann inte äta", "Tog för mycket", "Ogillade maten", "Slängde inte"];
    const statKeys = ["one", "two", "three", "four"];

    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      const day = data.day;
      const chartId = `pdf-pie-${day.replace(/-/g, "")}`;

      if (i > 0) doc.addPage();

      const total = statKeys.reduce((s, k) => s + (data[k] || 0), 0);
      const pct = (v) => total > 0 ? `${((v / total) * 100).toFixed(0)}%` : "0%";

      // Header bar
      doc.setFillColor(80, 80, 160);
      doc.rect(0, 0, pageW, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Matsal Statistik", pageW / 2, 16, { align: "center" });

      // Date
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(22);
      const formattedDay = new Date(day).toLocaleDateString("sv-SE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc.text(formattedDay, pageW / 2, 38, { align: "center" });

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, 44, pageW - 15, 44);

      // Total pill
      doc.setFillColor(240, 240, 255);
      doc.roundedRect(pageW / 2 - 40, 48, 80, 12, 2, 2, "F");
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 160);
      doc.text(`Totalt: ${total} svar`, pageW / 2, 56, { align: "center" });

      // Food / menu text
      let chartY = 66;
      if (data.food) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(60, 60, 60);
        const foodLines = doc.splitTextToSize(`Meny: ${data.food}`, pageW - 30);
        doc.text(foodLines, pageW / 2, chartY, { align: "center" });
        chartY += foodLines.length * 7 + 4;
      }

      // Chart
      const chartElement = document.getElementById(chartId);
      const chartWidth = 140;
      const chartHeight = 130;
      const chartX = (pageW - chartWidth) / 2;

      if (chartElement) {
        try {
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", chartX, chartY, chartWidth, chartHeight);
        } catch (err) {
          doc.setFontSize(10);
          doc.setTextColor(180, 0, 0);
          doc.text("[Graf kunde inte skapas]", pageW / 2, chartY + 65, { align: "center" });
        }
      } else {
        doc.setFontSize(10);
        doc.setTextColor(180, 0, 0);
        doc.text("[Graf ej tillgänglig]", pageW / 2, chartY + 65, { align: "center" });
      }

      // Stats section
      const statsY = chartY + chartHeight + 8;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Fördelning av svar:", 15, statsY);

      statKeys.forEach((key, idx) => {
        const value = data[key] || 0;
        const rowY = statsY + 10 + idx * 20;
        const [r, g, b] = statColors[idx];

        // Row background
        doc.setFillColor(248, 248, 255);
        doc.roundedRect(15, rowY - 5, pageW - 30, 15, 1.5, 1.5, "F");

        // Colored left accent bar
        doc.setFillColor(r, g, b);
        doc.rect(15, rowY - 5, 4, 15, "F");

        // Label
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text(statLabels[idx], 23, rowY + 5);

        // Value badge
        doc.setFillColor(r, g, b);
        doc.roundedRect(pageW - 54, rowY - 3, 39, 11, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`${value}  (${pct(value)})`, pageW - 34.5, rowY + 5, { align: "center" });
      });
    }

    const fileName = pdfName.trim() || `statistik-${daysToShow}dagar`;
    doc.save(`${fileName}.pdf`);
  };

  const handleDownloadData = () => {
    const data = rangeRows.slice(0, daysToShow);

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

  async function fetchSchoolMenu() {
    setMenuError(null);
    setSchoolMenu([]);
    // The RSS feed returns the current day's menu.
    // If it shows "Ingen meny för idag" it means no school food today (e.g. weekends).
    const rssUrl = "https://skolmaten.se/sven-eriksonsgymnasiet";
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("proxy_error");
      const json = await res.json();
      const xml = new DOMParser().parseFromString(json.contents, "text/xml");

      if (xml.querySelector("parsererror")) throw new Error("not_rss");

      const items = Array.from(xml.querySelectorAll("item")).map((item) => {
        const rawDate = item.querySelector("pubDate")?.textContent || "";
        const parsedDate = rawDate ? new Date(rawDate) : null;
        const dateStr = parsedDate && !isNaN(parsedDate)
          ? parsedDate.toISOString().slice(0, 10)
          : todayStr;
        return {
          title: item.querySelector("title")?.textContent || "",
          description: item.querySelector("description")?.textContent || "",
          date: dateStr,
        };
      }).filter((item) => item.description && item.description !== "Ingen meny för idag");

      setSchoolMenu(items);
    } catch {
      setMenuError("Kunde inte hämta menyn från Skolmaten.");
    }
  }

  async function saveFoodForDay(dayStr, food) {
    setSavingFood((prev) => ({ ...prev, [dayStr]: true }));
    const { error } = await supabase
      .from("daily_clicks")
      .upsert({ day: dayStr, food }, { onConflict: "day" });
    if (error) console.error("Kunde inte spara meny:", error);
    setSavingFood((prev) => ({ ...prev, [dayStr]: false }));
    fetchClicks(daysToShow);
  }

  async function fetchClicks(limitDays = daysToShow) {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("daily_clicks")
      .select("day, one, two, three, four, food")
      .order("day", { ascending: false })
      .limit(limitDays);

    if (error) {
      console.error(error);
      setError("Kunde inte hämta data");
      setLoading(false);
      return;
    }

    const rowsForDisplay = data || []; // newest → oldest
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
        rowsForDisplay[0]?.day ??
        null;
      setSelectedDay(fallback);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!session) return;
    fetchClicks(daysToShow);
  }, [session, daysToShow]);

  useEffect(() => {
    if (!session) return;
    fetchSchoolMenu();
  }, [session]);

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
      {/* Hidden charts for PDF */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", zIndex: -1000 }}>
        {rangeRows.map((row) => (
          <DailyPieChartForPDF
            key={row.day}
            day={row.day}
            data={row}
            id={`pdf-pie-${row.day.replace(/-/g, "")}`}
          />
        ))}
      </div>

      <button className="logout-btn" onClick={logout}>
        Logga ut
      </button>

      <button className="download-btn" onClick={handleOpenPopup}>
        Ladda ner data
      </button>

      <button className="contact-btn" onClick={() => setIsContactOpen(true)}>
        Kontakt
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

          <div className="menu-section">
            <h2>Meny (Skolmaten)</h2>
            <p className="menu-note">
              Skolmaten visar alltid <strong>dagens</strong> meny. Välj vilket datum du vill spara den till.
            </p>
            {menuError && <p className="menu-error">{menuError}</p>}
            {!menuError && schoolMenu.length === 0 && (
              <p className="menu-empty">Ingen meny från Skolmaten idag (helgdag eller lov). Ange meny manuellt nedan.</p>
            )}
            {schoolMenu.length > 0 && (
              <div className="menu-list">
                {schoolMenu.map((item, idx) => (
                  <div key={idx} className="menu-item">
                    <div className="menu-item-info">
                      <span className="menu-item-title">{item.title}</span>
                      <span className="menu-item-desc">{item.description}</span>
                    </div>
                    <div className="menu-item-save">
                      <input
                        type="date"
                        className="menu-date-input"
                        value={menuSaveDate || todayStr}
                        onChange={(e) => setMenuSaveDate(e.target.value)}
                      />
                      <button
                        className="menu-save-btn"
                        disabled={savingFood[menuSaveDate || todayStr]}
                        onClick={() => saveFoodForDay(menuSaveDate || todayStr, item.description)}
                      >
                        {savingFood[menuSaveDate || todayStr] ? "Sparar…" : "Spara"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="menu-manual">
              <input
                type="date"
                className="menu-date-input"
                value={menuSaveDate || todayStr}
                onChange={(e) => setMenuSaveDate(e.target.value)}
              />
              <input
                type="text"
                className="menu-manual-input"
                placeholder="Ange meny manuellt…"
                value={manualFood}
                onChange={(e) => setManualFood(e.target.value)}
              />
              <button
                className="menu-save-btn"
                disabled={!manualFood.trim() || savingFood[menuSaveDate || todayStr]}
                onClick={() => {
                  saveFoodForDay(menuSaveDate || todayStr, manualFood.trim());
                  setManualFood("");
                }}
              >
                {savingFood[menuSaveDate || todayStr] ? "Sparar…" : "Spara"}
              </button>
            </div>
            <button className="refresh-btn" onClick={fetchSchoolMenu} style={{ marginTop: "0.5rem" }}>
              Hämta från Skolmaten
            </button>
          </div>

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
                  <th>Meny</th>
                </tr>
              </thead>
              <tbody>
                {rangeRows.length === 0 && (
                  <tr>
                    <td colSpan={6}>Ingen data tillgänglig ännu</td>
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
                      <td className="food-cell">{row.food || "—"}</td>
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

      {isContactOpen && (
        <div className="popup" onClick={() => setIsContactOpen(false)}>
          <div className="popup-content contact-popup" onClick={(e) => e.stopPropagation()}>
            <h2>Kontaktinformation</h2>
            <div className="contact-info">
              <p><strong>Skola:</strong> Sven Eriksonsgymnasiet</p>
              <p><strong>E-post:</strong> —</p>
              <p><strong>Telefon:</strong> —</p>
              <p><strong>Adress:</strong> —</p>
            </div>
            <button onClick={() => setIsContactOpen(false)}>Stäng</button>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Matsal Statistik – Sven Eriksonsgymnasiet. Alla rättigheter förbehållna.</span>
        <button className="footer-contact-btn" onClick={() => setIsContactOpen(true)}>Kontakt</button>
      </footer>
    </div>
  );
}

export default App;