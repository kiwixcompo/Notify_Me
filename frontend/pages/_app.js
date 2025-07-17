import '../styles/globals.css';
import Head from 'next/head';
import { useEffect } from 'react';

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
        <meta name="description" content="Get instant alerts for new remote jobs from your favorite sources. Manage feeds, filter by category, and never miss an opportunity!" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta property="og:title" content="Notify Me - Remote Job Alerts" />
        <meta property="og:description" content="Get instant alerts for new remote jobs from your favorite sources." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://notifyme.yourdomain.com/" />
        <meta property="og:image" content="/favicon.ico" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Notify Me - Remote Job Alerts" />
        <meta name="twitter:description" content="Get instant alerts for new remote jobs from your favorite sources." />
        <meta name="twitter:image" content="/favicon.ico" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://notifyme.yourdomain.com/" />
        {/* Google Analytics (replace UA-XXXXXXX-X with your ID) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=UA-XXXXXXX-X"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'UA-XXXXXXX-X');
        `}} />
      </Head>
      <Component {...pageProps} />
    </>
  );
} 