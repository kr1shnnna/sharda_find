import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import Stats from "./components/Stats/Stats";
import RecentItems from "./components/RecentItems/RecentItems";
import HowItWorks from "./components/HowItWorks/HowItWorks";
import CTA from "./components/CTA/CTA";

function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <Stats />
      <RecentItems />
      <HowItWorks />
      <CTA />
    </>
  );
}

export default App;
