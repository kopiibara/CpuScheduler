import Header from "../../components/Header";
import ProcessesTable from "./ProcessesTable";

const DashboardPage = () => {
  return (
    <div className="w-screen h-screen  text-[#FBFCFA]">
      <Header />

      <ProcessesTable />
    </div>
  );
};

export default DashboardPage;
