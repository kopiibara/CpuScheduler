import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/welcome-page/WelcomePage";
import DashboardLayout from "./routes/DashboardLayout";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/pages/*" element={<DashboardLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
