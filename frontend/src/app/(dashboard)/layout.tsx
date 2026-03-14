import DashboardLayout from "@/components/dashboard-layout";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default Layout;
