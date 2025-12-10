import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./login.css";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  async function handleLogin(e) {
  e.preventDefault();
  setError(null);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(error);       
    setError(error.message);     
    return;
  }
}


  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error(error);
      setError("Kunde inte skapa konto");
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        approved: false,
      });
    }

    setInfo(
      "Konto skapat! En administratör måste godkänna dig i Supabase innan du får åtkomst."
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-tabs">
          <button
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
          >
            Logga in
          </button>
          <button
            className={mode === "register" ? "tab active" : "tab"}
            onClick={() => {
              setMode("register");
              setError(null);
              setInfo(null);
            }}
          >
            Registrera
          </button>
        </div>

        <h2>{mode === "login" ? "Logga in" : "Registrera konto"}</h2>

        <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">
            {mode === "login" ? "Logga in" : "Skapa konto"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}
      </div>
    </div>
  );
}
