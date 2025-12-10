import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
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

const COLORS = ["#8884d8", "#ffc658", "#ff7f7f", "#82ca9d"]; // matchar ordningen i pieData
const RADIAN = Math.PI / 180;

const renderPercentLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
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
  const [counts, setCounts] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const todayLabel = new Date().toLocaleDateString("sv-SE");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function fetchClicks() {
    setLoading(true);
    setError(null);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("clicks")
      .select("day, one, two, three, four")
      .order("day", { ascending: false })
      .limit(7);

    if (error) {
      console.error(error);
      setError("Kunde inte hämta data");
      setLoading(false);
      return;
    }

    const rows = (data || []).slice().reverse();
    setWeekData(rows);

    const todayRow = rows.find((r) => r.day === todayStr);

    if (todayRow) {
      setCounts({
        one: todayRow.one,
        two: todayRow.two,
        three: todayRow.three,
        four: todayRow.four,
      });
    } else {
      setCounts({
        one: 0,
        two: 0,
        three: 0,
        four: 0,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!session) return;
    fetchClicks();
  }, [session]);

  async function logout() {
    await supabase.auth.signOut();
    setCounts(null);
    setWeekData([]);
  }

  function formatDay(dayStr) {
    const d = new Date(dayStr);
    return d.toLocaleDateString("sv-SE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  const weeklyTotals = weekData.reduce(
    (acc, row) => ({
      one: acc.one + (row.one || 0),
      two: acc.two + (row.two || 0),
      three: acc.three + (row.three || 0),
      four: acc.four + (row.four || 0),
    }),
    { one: 0, two: 0, three: 0, four: 0 }
  );

  const pieData = [
    { name: "Hann inte äta", value: weeklyTotals.one },
    { name: "Ogillade maten", value: weeklyTotals.three },
    { name: "Slängde inte", value: weeklyTotals.four },
    { name: "Tog för mycket", value: weeklyTotals.two },
  ].filter((item) => item.value > 0);

  const weekTotal =
    weeklyTotals.one +
    weeklyTotals.two +
    weeklyTotals.three +
    weeklyTotals.four;

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

  if (!counts) {
    return (
      <div style={{ padding: "2rem" }}>
        <button onClick={logout}>Logga ut</button>
        <h1>Ingen data hittades i clicks</h1>
      </div>
    );
  }

  return (
    <div className="admin">
      <button className="logout-btn" onClick={logout}>
        Logga ut
      </button>

      <div className="admin-main">
        <div className="admin-left">
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
                <td>{counts.one}</td>
                <td>{counts.two}</td>
                <td>{counts.three}</td>
                <td>{counts.four}</td>
              </tr>
            </tbody>
          </table>

          <h2 style={{ marginTop: "1.8rem" }}>Senaste dagarna (max 7)</h2>

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
              {weekData.length === 0 && (
                <tr>
                  <td colSpan={5}>Ingen data tillgänglig ännu</td>
                </tr>
              )}
              {weekData.map((row) => (
                <tr key={row.day}>
                  <td>{formatDay(row.day)}</td>
                  <td>{row.one}</td>
                  <td>{row.two}</td>
                  <td>{row.three}</td>
                  <td>{row.four}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-right">
          <h2>Fördelning senaste dagarna</h2>

          {pieData.length === 0 ? (
            <p>Ingen data att visa i grafen ännu.</p>
          ) : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderPercentLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <h3 style={{ marginTop: "1.2rem" }}>Summering senaste dagarna</h3>
          <div className="week-summary-box">
            <p>
              <strong>Totalt antal svar:</strong> {weekTotal}
            </p>
            <ul>
              <li className="summary-item">
                <span className="summary-dot summary-dot-one" />
                <span>Hann inte äta: {weeklyTotals.one}</span>
              </li>
              <li className="summary-item">
                <span className="summary-dot summary-dot-three" />
                <span>Ogillade maten: {weeklyTotals.three}</span>
              </li>
              <li className="summary-item">
                <span className="summary-dot summary-dot-four" />
                <span>Slängde inte: {weeklyTotals.four}</span>
              </li>
              <li className="summary-item">
                <span className="summary-dot summary-dot-two" />
                <span>Tog för mycket: {weeklyTotals.two}</span>
              </li>
            </ul>
          </div>

          <div className="buttons-row">
            <button className="refresh-btn" onClick={fetchClicks}>
              Uppdatera
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
