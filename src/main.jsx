import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import CreateEntry from "./pages/CreateEntry";
import EntryView from "./pages/EntryView";
import Entries from "./pages/Entries";
import Shared from "./pages/Shared";
import Settings from "./pages/Settings";

import Layout from "./components/Layout";
import AppLayout from "./components/AppLayout";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>

        {/* Auth Pages (no sidebar) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* App Pages (with sidebar) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-entry" element={<CreateEntry />} />
          <Route path="/entry/:id" element={<EntryView />} />
          <Route path="/entries" element={<Entries />} />
          <Route path="/shared" element={<Shared />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);