import { Routes, Route } from "react-router-dom";
import MainDashboard from "../pages/dashboard/MainDashboard";

const DashboardLayout = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<MainDashboard />} />
    </Routes>
  );
};

export default DashboardLayout;
