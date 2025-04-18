import { HashRouter, BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { SystemInfoProvider } from "./context/SystemInfoContext";
import WelcomePage from "./pages/WelcomePage";
import DashboardPage from "./pages/dashboard/DashboardPage";

function App() {
  // Use HashRouter in production (Electron app)
  // Use BrowserRouter in development
  const Router =
    window.location.protocol === "file:" ? HashRouter : BrowserRouter;

  return (
    <SystemInfoProvider>
      <Router>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </Router>
    </SystemInfoProvider>
  );
}

export default App;
