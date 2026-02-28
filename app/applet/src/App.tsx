import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  Camera, 
  Heart, 
  MapPin, 
  Music, 
  Sparkles, 
  Search, 
  Plus, 
  Quote,
  Clock,
  Send
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AMELIE_QUOTES = [
  "Life is like a box of chocolates...",
  "Without you, today's emotions would be the scurf of yesterday's.",
  "At least you'll never be a vegetable - even artichokes have hearts.",
  "Luck is like the Tour de France. You wait a long time and then it goes by fast.",
  "A woman without love is like a flower without the sun, it withers."
];

const PARIS_LOCATIONS = [
  { name: "Montmartre", desc: "The artistic heart of Paris, where Amélie lives.", icon: <MapPin className="w-4 h-4" /> },
  { name: "Café des Deux Moulins", desc: "Where the magic happens over crème brûlée.", icon: <Coffee className="w-4 h-4" /> },
  { name: "Canal Saint-Martin", desc: "Perfect for skipping stones.", icon: <Sparkles className="w-4 h-4" /> },
  { name: "Gare du Nord", desc: "Where paths cross and mysteries begin.", icon: <Clock className="w-4 h-4" /> }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('mood');
  const [quote, setQuote] = useState(AMELIE_QUOTES[0]);
  const [notes, setNotes] = useState<string[]>(["Find the owner of the hidden box.", "Help Nino find his photo album.", "Make someone smile today."]);
  const [newNote, setNewNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateNewQuote = async () => {
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Generate a whimsical, poetic, and slightly mysterious quote in the style of the movie 'Amélie'. Keep it short and evocative.",
      });
      if (response.text) {
        setQuote(response.text.trim());
      }
    } catch (error) {
      console.error("Error generating quote:", error);
      setQuote(AMELIE_QUOTES[Math.floor(Math.random() * AMELIE_QUOTES.length)]);
    } finally {
      setIsGenerating(false);
    }
  };

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      setNotes([newNote, ...notes]);
      setNewNote('');
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col items-center mb-12">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#c41e3a] overflow-hidden parisian-shadow">
            <img 
              src="https://m.media-amazon.com/images/M/MV5BNDg4NjM1OTY5NF5BMl5BanBnXkFtZTcwMDMyMzQyMQ@@._V1_.jpg" 
              alt="Amélie Poulain" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-2 -right-2 bg-white p-2 rounded-full shadow-md"
          >
            <Sparkles className="w-6 h-6 text-[#c41e3a]" />
          </motion.div>
        </motion.div>
        
        <h1 className="text-4xl md:text-6xl font-serif text-[#2c1810] mb-2 tracking-tight">
          Le Fabuleux Destin
        </h1>
        <p className="text-[#c41e3a] italic font-medium tracking-widest uppercase text-xs md:text-sm">
          A Whimsical Parisian Mood Board
        </p>
      </header>

      {/* Navigation */}
      <nav className="flex space-x-4 mb-8 bg-white/50 backdrop-blur-sm p-2 rounded-full border border-[#2c1810]/5">
        {[
          { id: 'mood', icon: <Camera className="w-4 h-4" />, label: 'Mood' },
          { id: 'notes', icon: <Quote className="w-4 h-4" />, label: 'Notes' },
          { id: 'map', icon: <MapPin className="w-4 h-4" />, label: 'Map' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-2 rounded-full transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-[#c41e3a] text-white shadow-lg' 
                : 'text-[#2c1810]/60 hover:text-[#c41e3a] hover:bg-white'
            }`}
          >
            {tab.icon}
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-4xl">
        <AnimatePresence mode="wait">
          {activeTab === 'mood' && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Quote Card */}
              <div className="bg-white p-8 rounded-3xl parisian-shadow border border-[#2c1810]/5 flex flex-col justify-between min-h-[300px]">
                <div>
                  <Quote className="w-8 h-8 text-[#c41e3a]/20 mb-4" />
                  <p className="text-2xl font-serif leading-relaxed italic text-[#2c1810]">
                    "{quote}"
                  </p>
                </div>
                <button 
                  onClick={generateNewQuote}
                  disabled={isGenerating}
                  className="mt-8 flex items-center justify-center space-x-2 text-[#c41e3a] hover:bg-[#c41e3a]/5 py-3 rounded-2xl border border-[#c41e3a]/20 transition-colors"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {isGenerating ? 'Whispering to destiny...' : 'Seek a new destiny'}
                  </span>
                </button>
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  "https://picsum.photos/seed/paris1/400/400",
                  "https://picsum.photos/seed/paris2/400/400",
                  "https://picsum.photos/seed/paris3/400/400",
                  "https://picsum.photos/seed/paris4/400/400"
                ].map((src, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className="aspect-square rounded-2xl overflow-hidden parisian-shadow border-4 border-white"
                  >
                    <img src={src} alt="Paris" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <form onSubmit={addNote} className="mb-8 flex space-x-4">
                <input 
                  type="text" 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="A small good deed..."
                  className="flex-1 bg-white px-6 py-4 rounded-2xl border border-[#2c1810]/10 focus:outline-none focus:ring-2 focus:ring-[#c41e3a]/20 parisian-shadow"
                />
                <button 
                  type="submit"
                  className="bg-[#c41e3a] text-white p-4 rounded-2xl shadow-lg hover:bg-[#a01830] transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </form>

              <div className="space-y-4">
                {notes.map((note, i) => (
                  <motion.div 
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-6 rounded-2xl border-l-4 border-[#c41e3a] parisian-shadow flex items-center space-x-4"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#c41e3a]" />
                    <p className="text-[#2c1810] font-medium">{note}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {PARIS_LOCATIONS.map((loc, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-[#2c1810]/5 parisian-shadow flex items-start space-x-4">
                  <div className="bg-[#c41e3a]/10 p-3 rounded-2xl text-[#c41e3a]">
                    {loc.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-[#2c1810] mb-1">{loc.name}</h3>
                    <p className="text-sm text-[#2c1810]/60 leading-relaxed">{loc.desc}</p>
                  </div>
                </div>
              ))}
              <div className="md:col-span-2 bg-[#2e4d32]/5 p-8 rounded-3xl border border-[#2e4d32]/10 flex flex-col items-center text-center">
                <Camera className="w-12 h-12 text-[#2e4d32] mb-4 opacity-50" />
                <p className="text-[#2e4d32] italic font-serif text-lg">
                  "Capture the small details that others miss."
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="h-px w-12 bg-[#2c1810]" />
          <Heart className="w-4 h-4 text-[#c41e3a]" />
          <div className="h-px w-12 bg-[#2c1810]" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#2c1810]">
          Montmartre, Paris &bull; 1997
        </p>
      </footer>
    </div>
  );
}
