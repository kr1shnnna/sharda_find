import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import Stats from "./components/Stats/Stats";
import RecentItems from "./components/RecentItems/RecentItems";
import HowItWorks from "./components/HowItWorks/HowItWorks";
import About from "./components/About/About";
import Footer from "./components/Footer/Footer";

import Browse from "./pages/Browse/Browse";

import ItemDetails from "./pages/ItemDetails/ItemDetails";

import Register from "./pages/Register/Register";

import VerifyEmail from "./pages/VerifyEmail/VerifyEmail";

import Login from "./pages/Login/Login";

import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

import MyItems from "./pages/MyItems/MyItems";
import MyClaims from "./pages/MyClaims/MyClaims";
import ReportItem from "./pages/ReportItem/ReportItem";
import Dashboard from "./pages/Dashboard/Dashboard";
import Notifications from "./pages/Notifications/Notifications";
import Messages from "./pages/Messages/Messages";

import Chat from "./pages/Chat/Chat";

const Home = () => {
  return (
    <>
      <Hero />
      <Stats />
      <RecentItems />
      <HowItWorks />
      <About />
    </>
  );
};

const AppContent = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const sectionId = location.hash.substring(1);

    const scrollToSection = () => {
      const section = document.getElementById(sectionId);

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    };

    // Wait for the target section to be rendered.
    requestAnimationFrame(scrollToSection);
  }, [location.pathname, location.hash]);

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/browse" element={<Browse />} />

        <Route path="/items/:id" element={<ItemDetails />} />

        <Route path="/register" element={<Register />} />

        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/my-items" element={<MyItems />} />

          <Route path="/my-claims" element={<MyClaims />} />

          <Route path="/notifications" element={<Notifications />} />

          <Route path="/report-lost" element={<ReportItem type="lost" />} />

          <Route path="/report-found" element={<ReportItem type="found" />} />

          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<Chat />} />
        </Route>
      </Routes>

      <Footer />
    </>
  );
};

function App() {
  return <AppContent />;
}

export default App;
