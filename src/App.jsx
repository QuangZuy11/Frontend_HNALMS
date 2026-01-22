import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Components
import Header from "./components/layout/Header/Header";
import Hero from "./components/layout/Hero/Hero";
import About from "./components/layout/About/About";
import Contact from "./components/layout/Contact/Contact";
import Footer from "./components/layout/Footer/Footer";
import FloatingContact from "./components/layout/Floating-contact/Floating-contact";
function App() {
  return (
    <BrowserRouter>
      <Header />
      <Hero />
      <About />
      <Contact />
      <Footer />
      <FloatingContact />
    </BrowserRouter>
  );
}

export default App;
