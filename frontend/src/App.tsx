import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/welcome-page/WelcomePage";
import DashboardLayout from "./routes/DashboardLayout";
import "./App.css";
import { SystemInfoProvider } from "./context/SystemInfoContext";

function App() {
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
