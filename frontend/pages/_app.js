import '../styles/globals.css';
import Head from 'next/head';
import { useEffect, useState } from 'react';

function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Start fading out after 1.5 seconds
    const fadeTimer = setTimeout(() => setFade(true), 1500);
    // Remove from DOM after 2 seconds
    const removeTimer = setTimeout(() => setShow(false), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[9999] bg-blue-600 flex items-center justify-center transition-opacity duration-500 ease-in-out ${fade ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center animate-pulse">
        {/* SVG Bell and Lightning Bolt (Matching our new logo exactly) */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" className="w-32 h-32 mb-6">
          <path d="M256 128c-44.18 0-80 35.82-80 80v72l-40 40v32h240v-32l-40-40v-72c0-44.18-35.82-80-80-80zM216 384v16c0 22.09 17.91 40 40 40s40-17.91 40-40v-16h-80z" fill="#ffffff" />
          <path d="M320 224l-64 8v80l16-8-48 80 16-104-16 8 64-80z" fill="#facc15" stroke="#2563eb" strokeWidth="8" strokeLinejoin="round" />
        </svg>
        <h1 className="text-white text-3xl font-extrabold tracking-widest drop-shadow-lg">NotifyMe</h1>
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js');
      });
    }
  }, []);
  return (
    <>
      <Head>
        <title>Notify Me - Remote Job Alerts</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Get instant alerts for new remote jobs from your favorite sources." />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </Head>
      <SplashScreen />
      <Component {...pageProps} />
    </>
  );
} 