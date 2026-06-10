import type { IntelligenceContext, EarthquakeEvent, NewsItem, ThreatEvent, CyberAlert } from '@/lib/ai-engine';

function formatTime(ts: string): string {
  try { return new Date(ts).toLocaleString('it-IT'); } catch { return ts; }
}

function assessThreats(context: IntelligenceContext): string {
  const lines: string[] = [];
  const { earthquakes, news, threats, cyberAlerts } = context;

  if (earthquakes.length > 0) {
    const major = earthquakes.filter(e => e.magnitude >= 5);
    const strongest = earthquakes.reduce((a, b) => a.magnitude > b.magnitude ? a : b, earthquakes[0]);
    lines.push(`TERREMOTI: ${earthquakes.length} eventi, ${major.length} con M≥5. ` +
      `Il più forte: M${strongest.magnitude} a ${strongest.location} (${formatTime(strongest.timestamp)})`);
  }

  if (news.length > 0) {
    const high = news.filter(n => n.risk_score >= 7);
    lines.push(`NOTIZIE: ${news.length} articoli, ${high.length} a rischio alto.`);
    for (const item of news.slice(0, 5)) {
      lines.push(`  • [${item.source}] ${item.title} (rischio: ${item.risk_score}/10)`);
    }
  }

  if (threats.length > 0) {
    const critical = threats.filter(t => t.severity === 'CRITICAL' || t.severity === 'HIGH');
    lines.push(`MINACCE: ${threats.length} eventi, ${critical.length} critici/alto.`);
    for (const t of threats.slice(0, 5)) {
      lines.push(`  • [${t.severity}] ${t.title} — ${t.region}`);
    }
  }

  if (cyberAlerts.length > 0) {
    lines.push(`CYBER: ${cyberAlerts.length} allerte.`);
    for (const c of cyberAlerts.slice(0, 5)) {
      lines.push(`  • [${c.severity}] ${c.vendor}/${c.product}: ${c.name}`);
    }
  }

  if (lines.length === 0) {
    lines.push('Nessun dato intelligence disponibile.');
  }

  return lines.join('\n');
}

function extractKeywords(query: string): string[] {
  return query.toLowerCase()
    .replace(/[?.,!]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['che','chi','cosa','come','dove','quando','perche','con','il','la','le','gli','gli','un','una','lo','del','della','dei','degli','nel','nella','sul','sulla'].includes(w));
}

function findInContext(context: IntelligenceContext, keywords: string[]): string {
  const matches: string[] = [];

  for (const eq of context.earthquakes) {
    const text = `${eq.location} ${eq.id}`.toLowerCase();
    if (keywords.some(k => text.includes(k))) {
      matches.push(`Terremoto M${eq.magnitude} a ${eq.location} (${formatTime(eq.timestamp)})`);
    }
  }

  for (const n of context.news) {
    const text = `${n.title} ${n.description} ${n.source}`.toLowerCase();
    if (keywords.some(k => text.includes(k))) {
      matches.push(`Notizia: ${n.title} [${n.source}] — rischio ${n.risk_score}/10`);
    }
  }

  for (const t of context.threats) {
    const text = `${t.title} ${t.description} ${t.region}`.toLowerCase();
    if (keywords.some(k => text.includes(k))) {
      matches.push(`Minaccia [${t.severity}]: ${t.title} — ${t.region}`);
    }
  }

  for (const c of context.cyberAlerts) {
    const text = `${c.name} ${c.vendor} ${c.product}`.toLowerCase();
    if (keywords.some(k => text.includes(k))) {
      matches.push(`Cyber [${c.severity}]: ${c.vendor}/${c.product} — ${c.name}`);
    }
  }

  return matches.length > 0 ? matches.join('\n') : 'Nessun risultato trovato nei dati intelligence.';
}

export function localAnalyze(context: IntelligenceContext, query: string): string {
  const keywords = extractKeywords(query);
  const contextMatches = findInContext(context, keywords);
  const threatSummary = assessThreats(context);

  const now = new Date().toLocaleString('it-IT');

  return `## OSIRIS Intelligence Assessment (Offline)
**Generated:** ${now}
**Query:** "${query}"
**Mode:** Local analysis (no external AI API)

---

### Direct Match Results
${contextMatches}

---

### Current Intelligence Summary
${threatSummary}

---

### Assessment
${contextMatches.includes('Nessun risultato') 
  ? `La ricerca per "${query}" non ha trovato corrispondenze nei dati intelligence correnti. Suggerisco di: riformulare la query, attivare più feed dati, o connettere un provider AI per analisi approfondite.`
  : `Sono state trovate corrispondenze nei dati. Per un'analisi più approfondita con pattern recognition e correlazione avanzata, connetti un provider AI (es. Ollama locale o API key).`
}

**Confidence:** MEDIUM (analisi basata su pattern matching locale)
**Recommended Actions:** ${keywords.length > 0 ? `Attiva layer mappa per visualizzare i risultati di "${keywords[0]}".` : 'Consulta i feed dati per intelligence aggiornata.'}`;
}

export function localBriefing(context: IntelligenceContext): string {
  const threatSummary = assessThreats(context);
  const now = new Date().toLocaleString('it-IT');

  return `# OSIRIS INTELLIGENCE BRIEFING (Offline)
**Classification:** OPEN SOURCE INTELLIGENCE (OSINT)  
**DTG:** ${now}  
**Mode:** Local analysis (no external AI API)

---

## I. EXECUTIVE SUMMARY
Briefing generato in modalità offline. I dati mostrano l'attuale situazione intelligence basata sui feed attivi. Per briefing approfonditi con analisi AI, connetti un provider.

## II. CURRENT INTELLIGENCE PICTURE
${threatSummary}

## III. RECOMMENDED ACTIONS
1. Attiva layer aggiuntivi per visualizzare i dati sulla mappa
2. Connetti un provider AI (Ollama, OpenAI, Gemini) per analisi avanzate
3. Consulta i feed in tempo reale per aggiornamenti

## IV. ASSESSMENT CONFIDENCE
**Confidence:** HIGH per i dati grezzi, LOW per analisi predittive (modalità offline)
**Next update:** On demand`;
}
