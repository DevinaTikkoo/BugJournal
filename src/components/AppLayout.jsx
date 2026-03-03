import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import SideBar from "./SideBar";
import bugBlotzLogo from "./BugBlotzLogo.png";

export default function AppLayout() {
  const [username, setUsername] = useState("");
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.username) setUsername(profile.username);
    })();

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div style={rootStyle}>
      {/* Banner */}
      <div style={bannerStyle}>
        <Link to="/dashboard" style={brandStyle}>
          {session ? <img src={bugBlotzLogo} alt="Bug Blotz" style={bannerLogoStyle} /> : "Bug Blotz"}
        </Link>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {session ? (
            <>
              <button onClick={handleLogout} style={logoutLinkStyle}>Logout</button>
            </>
          ) : (
            <Link to="/login" style={linkStyle}>Log In</Link>
          )}
        </div>
      </div>

      {/* Sidebar + Content */}
      <div style={mainContainer}>
        <SideBar username={username} />
        <div style={contentArea}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const bannerStyle = {
  height: 60,
  background: "#26a036",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  fontWeight: 700,
  fontSize: 24,
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const rootStyle = {
  minHeight: "100vh",
  background: "rgb(97, 37, 169)",
  fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
};

const brandStyle = {
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 24,
};

const linkStyle = {
  textDecoration: "none",
  color: "#ffffff",
  fontWeight: 600,
};

const logoutLinkStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 16,
};

const bannerLogoStyle = {
  height: 82,
  width: "auto",
  objectFit: "contain",
  marginLeft: 10,
};

const mainContainer = {
  display: "flex",
  minHeight: "calc(100vh - 60px)",
};

const contentArea = {
  flex: 1,
  padding: 24,
  background: "#c5b3ee",
};