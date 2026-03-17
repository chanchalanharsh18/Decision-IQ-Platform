import React, { useState } from "react";
import { Home } from "./pages/Home";
import { UploadPage } from "./pages/UploadPage";
import { Dashboard } from "./pages/Dashboard";
import { InsightsPage } from "./pages/InsightsPage";
import { Navbar } from "./components/Navbar";
import "./styles/global.css";

export default function App() {
  const [page, setPage] = useState("home");
  const [activeDataset, setActiveDataset] = useState(null); // { id, name, summary }

  const navigate = (target, dataset = null) => {
    if (dataset) setActiveDataset(dataset);
    setPage(target);
  };

  return (
    <div className="app-shell">
      <Navbar currentPage={page} navigate={navigate} />
      <main className="page-content">
        {page === "home" && <Home navigate={navigate} />}
        {page === "upload" && <UploadPage navigate={navigate} onDatasetReady={(ds) => navigate("dashboard", ds)} />}
        {page === "dashboard" && <Dashboard dataset={activeDataset} navigate={navigate} />}
        {page === "insights" && <InsightsPage dataset={activeDataset} navigate={navigate} />}
      </main>
    </div>
  );
}
