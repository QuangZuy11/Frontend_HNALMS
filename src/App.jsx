import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Context
import { AuthProvider } from "./context/AuthContext";

// Components
import Header from "./components/layout/Header/Header";
import Hero from "./components/layout/Hero/Hero";
import About from "./components/layout/About/About";
import Contact from "./components/layout/Contact/Contact";
import Footer from "./components/layout/Footer/Footer";
import FloatingContact from "./components/layout/Floating-contact/Floating-contact";

// Pages
import RoomList from "./pages/RoomManagement/RoomList";
import RoomDetail from "./pages/RoomManagement/DetailRoom/RoomDetail";
import BuildingRulesPublic from "./pages/BuildingInformation/BuildingRulesPublic";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <About />
                <Contact />
              </>
            }
          />
          <Route path="/rooms" element={<RoomList />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          <Route path="/rules" element={<BuildingRulesPublic />} />
        </Routes>
        <Footer />
        <FloatingContact />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
