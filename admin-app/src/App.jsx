import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import "./app.css";

function App() {
  const [session, setSession] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const today = new Date().toLocaleDateString("sv-SE");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const fetchClicks = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("clicks")
        .select("one, two, three, four")
        .eq("id", 1)
        .single();

      if (error) {
        console.error(error);
        setError("Kunde inte hämta data");
      } else {
        setCounts(data);
      }

      setLoading(false);
    };

    fetchClicks();
  }, [session]);

  async function logout() {
    await supabase.auth.signOut();
    setCounts(null);
  }

  if (!session) {
    return <Login />;
  }

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
      <button className="refresh-btn" onClick={() => window.location.reload()}>
        Uppdatera
      </button>

      <h1>Nuvarande totalsiffror för datum {today}</h1>

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
    </div>
  );
}

export default App;
