import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Layout() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "rgb(97, 37, 169)", fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif" }}>
      <div style={{
        height: 60, background: "#26a036", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}>
        <Link to="/dashboard" style={{ textDecoration: "none", fontWeight: 700, fontSize: 24, color: "#ffffff" }}>
          Bug Blotz
        </Link>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {session ? (
            <>
              <button onClick={() => navigate("/dashboard")} style={btnStyle}>Dashboard</button>
              <button onClick={handleLogout} style={btnStyle}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={linkStyle}>Log In</Link>
            </>
          )}
        </div>
      </div>

      <Outlet />
    </div>
  );
}

const btnStyle = {
  border: "1px solid #ddd",
  background: "white",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer"
};

const linkStyle = { textDecoration: "none", color: "#ffffff", fontWeight: 600 };