"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#042f2e] text-white flex flex-col overflow-hidden">
      {/* Abstract Background Gradients */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-coral-500/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Navigation */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-8 flex items-center justify-between z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <Image
            src="/logo.jpg"
            alt="NariX Logo"
            width={44}
            height={44}
            className="rounded-xl object-contain"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Link 
            href="/app"
            className="text-sm font-medium text-teal-100 hover:text-white transition-colors"
          >
            Open App
          </Link>
        </motion.div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 z-10 w-full max-w-6xl mx-auto py-12 md:py-24">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl w-full flex flex-col items-start text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8"
            >
              <span className="flex w-2 h-2 rounded-full bg-teal-400"></span>
              <span className="text-xs font-medium text-teal-100 tracking-wide uppercase">Next Generation Safety</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 leading-[1.1] mb-6"
            >
              Navigate your world <br/> with confidence.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg md:text-xl text-white/60 max-w-xl mb-8 font-light leading-relaxed"
            >
              Real-time safety intelligence, smart routing, and instant SOS capabilities. 
              Designed specifically for women to reclaim the streets and explore without hesitation.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <Link 
                href="/app"
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-teal-950 rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:shadow-[0_0_60px_rgba(20,184,166,0.5)]"
              >
                Launch Platform
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="w-full md:w-1/2"
          >
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-coral-500/20 blur-3xl rounded-full" />
              <h3 className="text-2xl font-bold text-white mb-2">Did you know?</h3>
              <p className="text-coral-300 font-medium text-lg mb-4">
                "Women are 36% less likely to travel at night due to safety concerns." <br/><span className="text-sm text-white/40">— National Bureau of Economic Research (NBER)</span>
              </p>
              <p className="text-white/60 mb-6 text-sm">
                NaariX solves this by generating real-time safety scores using environmental factors (lighting, openness, distance to help) instead of relying solely on delayed crime statistics.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="block text-2xl font-bold text-teal-400 mb-1">AI</span>
                  <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Smart Routing</span>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="block text-2xl font-bold text-teal-400 mb-1">0s</span>
                  <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Tiered SOS</span>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="block text-2xl font-bold text-teal-400 mb-1">100%</span>
                  <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Data Privacy</span>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="block text-2xl font-bold text-teal-400 mb-1">Live</span>
                  <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Crowdsourced</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Minimal Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="w-full py-8 text-center text-white/30 text-sm z-10"
      >
        <p>&copy; {new Date().getFullYear()} NaariX. Built for safety.</p>
      </motion.footer>
    </div>
  );
}
