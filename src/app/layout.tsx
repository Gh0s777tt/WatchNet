import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://osirisai.live";
const SITE_NAME = "OSIRIS";
const SITE_TITLE = "OSIRIS — Piattaforma Intelligence Open Source | Voli, CCTV, Strumenti OSINT";
const SITE_DESCRIPTION = "L'alternativa open source a Palantir. Traccia oltre 10.000 velivoli, 2.000 satelliti e telecamere CCTV in tutto il mondo in tempo reale su un globo 3D. Esegui scansioni Nmap, ricerche DNS, query WHOIS, analisi certificati SSL e threat intelligence — tutto dal tuo browser. Oltre 20 feed di dati live tra cui terremoti, incendi, impianti nucleari, minacce informatiche e conflitti globali. Gratuito e open source.";

export const viewport: Viewport = {
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | OSIRIS Intelligence",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    // Strumenti OSINT - Focus principale
    "OSINT tools", "free OSINT tools", "online OSINT toolkit", "OSINT framework",
    "nmap online", "nmap scanner online", "free nmap scan", "port scanner online",
    "DNS lookup tool", "WHOIS lookup", "reverse DNS", "DNS records",
    "SSL certificate checker", "certificate transparency", "cert lookup",
    "BGP routing lookup", "ASN lookup", "IP geolocation",
    "threat intelligence", "threat intel lookup", "IP reputation check",
    "network reconnaissance", "recon tools", "penetration testing tools",
    "cybersecurity tools", "infosec tools", "security scanner",
    "linux OSINT tools", "kali linux tools online", "OSINT browser tools",
    
    // Piattaforma Intelligence
    "OSINT", "open source intelligence", "intelligence platform", "global intelligence",
    "geospatial intelligence", "GEOINT", "SIGINT", "real-time tracking",
    "palantir alternative", "open source palantir", "intelligence dashboard",
    
    // Tracking e Dati
    "flight tracker", "aircraft tracking", "ADS-B tracker", "live flight radar",
    "satellite tracking", "ISS tracker", "space station tracker",
    "CCTV cameras live", "security cameras worldwide", "live cameras",
    "earthquake monitor", "seismic activity", "USGS earthquake",
    "wildfire tracker", "NASA FIRMS", "active fires",
    "nuclear facilities map", "nuclear power plants",
    "severe weather alerts", "weather radar",
    "cyber threats dashboard", "CVE tracker",
    "space weather", "solar storm", "GPS jamming",
    "defense stocks", "commodities tracker",
    
    // Marchio
    "osiris", "osirisai", "osirisai.live",

    // Parole chiave italiane
    "piattaforma OSINT", "intelligence open source", "strumenti OSINT gratuiti",
    "mappa interattiva 3D", "telecamere Italia", "webcam Italia",
    "scanner porte online", "analisi sicurezza", "ricerca OSINT",
    "monitoraggio minacce", "cybersicurezza", "analisi intelligence",
    "tracciamento voli Italia", "CCTV Italia", "bluetooth scanner",
    "dispositivi di rete", "scansione vulnerabilità", "whois Italia",
  ],
  authors: [{ name: "Osiris Project", url: SITE_URL }],
  creator: "Osiris Project",
  publisher: "Osiris Project",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    shortcut: "/favicon.ico",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-touch-icon.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "OSIRIS — L'Alternativa Open Source a Palantir | Voli Live, CCTV, Satelliti e Strumenti OSINT",
    description: "Traccia oltre 10K velivoli, 2K satelliti e CCTV mondiali su un globo 3D. Esegui scansioni Nmap, DNS, WHOIS e threat intelligence dal tuo browser. Oltre 20 feed di intelligence live. Gratuito. Open source.",
    type: "website",
    siteName: SITE_NAME,
    locale: "it_IT",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "OSIRIS — Piattaforma Intelligence Open Source con Tracking Live e Strumenti OSINT",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "🛰️ OSIRIS — Alternativa Open Source a Palantir | Tracking Live + Strumenti OSINT",
    description: "Traccia oltre 10K voli, satelliti e CCTV in tutto il mondo. Esegui scansioni Nmap, DNS, WHOIS dal tuo browser. Oltre 20 feed intelligence live. Gratuito e open source.",
    creator: "@simplifaisoul",
    site: "@simplifaisoul",
    images: [`${SITE_URL}/og-image.png`],
  },
  category: "technology",
  classification: "Intelligence & Sicurezza",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "OSIRIS",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#06060C",
    "msapplication-config": "none",
  },
};

{/* Dati Strutturati JSON-LD */}
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "OSIRIS — Toolkit OSINT & Piattaforma Intelligence",
  alternateName: ["OSIRIS", "OsirisAI", "Osiris OSINT"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires a modern web browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Scansione porte Nmap dal browser — nessuna installazione richiesta",
    "Ricerca record DNS (A, AAAA, MX, NS, TXT, CNAME)",
    "Ricerca registrazione dominio WHOIS",
    "Ricerca trasparenza certificati SSL/TLS",
    "Routing BGP e ricerca ASN",
    "Geolocalizzazione IP e threat intelligence",
    "Tracciamento voli in tempo reale (oltre 10.000 velivoli via ADS-B)",
    "Tracciamento satelliti (oltre 2.000 oggetti inclusa la ISS)",
    "Monitoraggio telecamere CCTV mondiali (oltre 1.400 feed)",
    "Monitoraggio terremoti (feed live USGS)",
    "Rilevamento incendi (dati satellitari NASA FIRMS)",
    "Mappatura impianti nucleari (mondiale)",
    "Allerte meteorologiche severe e tracciamento",
    "Intelligence minacce informatiche e CVE",
    "Monitoraggio meteorologia spaziale e tempeste solari",
    "Rilevamento jamming GPS",
    "Tracciamento mercati difesa e materie prime",
    "Feed aggregazione notizie SIGINT",
    "Globo 3D interattivo con ciclo giorno/notte",
    "Report dossier intelligence regionale",
  ],
  screenshot: `${SITE_URL}/og-image.png`,
  author: {
    "@type": "Organization",
    name: "Osiris Project",
    url: SITE_URL,
  },
};

import ErrorBoundary from '@/components/ErrorBoundary';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="canonical" href={SITE_URL} />
        
        {/* Dati Strutturati JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

      </head>
      <body className="antialiased">
        <ErrorBoundary name="OSIRIS Core">
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
