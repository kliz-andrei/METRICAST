import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import Breadcrumb from "../components/layout/Breadcrumb";

function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-50">

      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">

        <Navbar />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">

          <Breadcrumb />

          {children}

        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;