import { useNavigate, useLocation } from "react-router-dom";

export default function SideBar({ username }) {
  const navigate = useNavigate();
  const location = useLocation();

  const firstLetter = username ? username[0].toUpperCase() : "?";

  const navItems = [
    { label: "Home", path: "/dashboard", emoji: "🏠" },
    { label: "Entries", path: "/entries", emoji: "📝" },
    { label: "Shared", path: "/shared", emoji: "🤝" },
    { label: "Settings", path: "/settings", emoji: "⚙️" },
  ];

  return (
    <div style={sidebarStyle}>
      {/* Avatar square */}
      <div style={avatarBox}>{firstLetter}</div>

      {/* Navigation */}
      {navItems.map((item) => {
        const active = location.pathname === item.path;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              ...navItemStyle,
              color: active ? "#8df0a0" : "#ffffff",
            }}
          >
            <span style={emojiStyle}>{item.emoji}</span>
            {item.label}
          </button>
        );
      })}

    </div>
  );
}

const sidebarStyle = {
  width: 220,
  background: "rgb(97, 37, 169)",
  paddingTop: 68,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 26,
};

const avatarBox = {
  width: 60,
  height: 60,
  background: "#26a036",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  fontWeight: 800,
  borderRadius: 8,
  marginTop: 8,
  marginBottom: 24,
};

const navItemStyle = {
  width: "80%",
  padding: "10px 4px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  textAlign: "left",
  display: "flex",
  alignItems: "center",
  gap: 20,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
};

const emojiStyle = {
  width: 20,
  display: "inline-flex",
  justifyContent: "center",
};
