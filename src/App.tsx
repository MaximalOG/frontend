import { Component, ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Pricing from "./pages/Pricing.tsx";
import Support from "./pages/Support.tsx";
import About from "./pages/About.tsx";
import NotFound from "./pages/NotFound.tsx";
import Admin from "./pages/Admin.tsx";
import AdminTickets from "./pages/AdminTickets.tsx";
import SaleAdmin from "./pages/SaleAdmin.tsx";
import AdminStaff from "./pages/AdminStaff.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminFeedback from "./pages/AdminFeedback.tsx";
import Checkout from "./pages/Checkout.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import SetupServer from "./pages/SetupServer.tsx";
import ServerConsole from "./pages/ServerConsole.tsx";
import ChatBot from "./components/ChatBot.tsx";
import SaleBanner from "./components/SaleBanner.tsx";
import { CurrencyProvider } from "@/context/CurrencyContext";

class ChatBotBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(e: Error) { console.error("[ChatBot crash]", e); }
  render() { return this.state.crashed ? null : this.props.children; }
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// Hide sale banner and chatbot on admin routes
const AdminGuard = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  return isAdmin ? null : <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CurrencyProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AdminGuard><SaleBanner /></AdminGuard>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/support" element={<Support />} />
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/sale" element={<SaleAdmin />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/setup-server" element={<SetupServer />} />
          <Route path="/server/:id/console" element={<ServerConsole />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatBotBoundary>
          <AdminGuard><ChatBot /></AdminGuard>
        </ChatBotBoundary>
      </BrowserRouter>
    </TooltipProvider>
    </CurrencyProvider>
  </QueryClientProvider>
);

export default App;
