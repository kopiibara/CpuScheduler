import { HashRouter, BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { SystemInfoProvider } from "./context/SystemInfoContext";
import { ProcessProvider } from "./context/ProcessContext";
import { ProcessSettingsProvider } from "./context/ProcessSettingsContext";
import WelcomePage from "./pages/WelcomePage";
import DashboardPage from "./pages/dashboard/DashboardPage";

function App() {
  // Use HashRouter in production (Electron app)
  // Use BrowserRouter in development
  const Router =
    window.location.protocol === "file:" ? HashRouter : BrowserRouter;

  return (
    <ProcessSettingsProvider>
      <ProcessProvider>
        <SystemInfoProvider>
          <Router>
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </Router>
        </SystemInfoProvider>
      </ProcessProvider>
    </ProcessSettingsProvider>
  );
}

export default App;
