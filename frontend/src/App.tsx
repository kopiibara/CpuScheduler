import { HashRouter, BrowserRouter, Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/welcome-page/WelcomePage";
import DashboardLayout from "./routes/DashboardLayout";
import "./App.css";
import { SystemInfoProvider } from "./context/SystemInfoContext";

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
          <Route path="/pages/*" element={<DashboardLayout />} />
        </Routes>
      </Router>
    </SystemInfoProvider>
  );
}

export default App;
