export default function Settings() {
  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Settings</h1>
        <p style={textStyle}>This page is coming soon.</p>
      </div>
    </div>
  );
}

const wrapStyle = {
  minHeight: "calc(100vh - 60px - 48px)",
};

const cardStyle = {
  background: "white",
  borderRadius: 14,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

const titleStyle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
};

const textStyle = {
  marginTop: 10,
  color: "#555",
  fontSize: 14,
};
