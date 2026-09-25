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
        
      </Routes>

      <Footer />
    </>
  );
};

function App() {
  return <AppContent />;
}

export default App;
