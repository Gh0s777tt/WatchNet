import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const caves = [
    { id: 1, name: 'Waitomo Glowworm Caves', lat: -38.2600, lng: 175.1100, country: 'New Zealand', type: 'Limestone Cave', depth_m: 30, length_km: 4.0, description: 'Famous for glowworm colonies illuminating the cave ceiling' },
    { id: 2, name: 'Hang Son Doong', lat: 17.4560, lng: 106.2870, country: 'Vietnam', type: 'Karst Cave', depth_m: 500, length_km: 38.5, description: 'Largest cave in the world by volume, contains its own jungle and river' },
    { id: 3, name: 'Mammoth Cave', lat: 37.1860, lng: -86.1000, country: 'USA', type: 'Limestone Cave', depth_m: 120, length_km: 676.0, description: 'Longest cave system in the world, over 400 miles mapped' },
    { id: 4, name: 'Krubera Cave (Voronya)', lat: 43.4300, lng: 40.3600, country: 'Georgia', type: 'Deep Cave', depth_m: 2224, length_km: 16.1, description: 'Deepest known cave on Earth, reaching 2,224 meters' },
    { id: 5, name: 'Blue Grotto (Grotta Azzurra)', lat: 40.5600, lng: 14.2060, country: 'Italy', type: 'Sea Cave', depth_m: 10, length_km: 0.1, description: 'Sea cave on Capri with brilliant blue light through underwater cavity' },
    { id: 6, name: 'Postojna Cave', lat: 45.7820, lng: 14.2020, country: 'Slovenia', type: 'Karst Cave', depth_m: 115, length_km: 24.3, description: 'Largest karst cave system in Europe, train rides inside' },
    { id: 7, name: 'Cueva de los Tayos', lat: -3.0500, lng: -78.2000, country: 'Ecuador', type: 'Mysterious Cave', depth_m: 200, length_km: 6.0, description: 'Legendary metal library, explored by Neil Armstrong and von Däniken' },
    { id: 8, name: 'Cave of the Swallows (Sótano de las Golondrinas)', lat: 21.5300, lng: -99.0100, country: 'Mexico', type: 'Karst Pit', depth_m: 376, length_km: 0.0, description: 'Giant natural pit, 370m freefall, home to swifts and parrots' },
    { id: 9, name: 'Fingal\'s Cave', lat: 56.4330, lng: -6.3330, country: 'UK', type: 'Sea Cave', depth_m: 20, length_km: 0.3, description: 'Basalt-column sea cave on Staffa island, inspiration for Mendelssohn' },
    { id: 10, name: 'Cave of Crystals (Naica)', lat: 27.8500, lng: -105.4800, country: 'Mexico', type: 'Crystal Cave', depth_m: 300, length_km: 0.3, description: 'Huge gypsum crystals up to 11 meters long, 55°C heat' },
    { id: 11, name: 'Lascaux Cave', lat: 45.0530, lng: 1.1700, country: 'France', type: 'Paleolithic Cave', depth_m: 30, length_km: 0.2, description: '17,000-year-old cave paintings of animals, UNESCO site' },
    { id: 12, name: 'Altamira Cave', lat: 43.3770, lng: -4.1180, country: 'Spain', type: 'Paleolithic Cave', depth_m: 20, length_km: 0.3, description: 'Polychrome bison paintings, Sistine Chapel of Paleolithic art' },
    { id: 13, name: 'Škocjan Caves', lat: 45.6670, lng: 13.9880, country: 'Slovenia', type: 'Karst Cave', depth_m: 200, length_km: 6.2, description: 'UNESCO site with massive underground canyon and river' },
    { id: 14, name: 'Phong Nha Cave', lat: 17.5800, lng: 106.2800, country: 'Vietnam', type: 'River Cave', depth_m: 150, length_km: 7.7, description: 'Longest underground river in the world, incredible formations' },
    { id: 15, name: 'Carlsbad Caverns', lat: 32.1700, lng: -104.4400, country: 'USA', type: 'Limestone Cave', depth_m: 315, length_km: 46.0, description: 'Famous for Big Room chamber, bat flight at sunset' },
    { id: 16, name: 'Meramec Caverns', lat: 38.2350, lng: -91.0950, country: 'USA', type: 'Limestone Cave', depth_m: 60, length_km: 7.0, description: 'Former hideout of Jesse James, huge onyx mountain formation' },
    { id: 17, name: 'Ruakuri Cave (Waitomo)', lat: -38.2550, lng: 175.1130, country: 'New Zealand', type: 'Limestone Cave', depth_m: 60, length_km: 7.5, description: 'Longest glowworm cave in Waitomo, includes blackwater rafting' },
    { id: 18, name: 'Eisriesenwelt', lat: 47.5030, lng: 13.1900, country: 'Austria', type: 'Ice Cave', depth_m: 350, length_km: 42.0, description: 'Largest ice cave in the world, permanent ice formations' },
    { id: 19, name: 'Castellana Caves', lat: 40.8750, lng: 17.1500, country: 'Italy', type: 'Karst Cave', depth_m: 120, length_km: 3.3, description: 'Spectacular white cave with 3km underground path in Puglia' },
    { id: 20, name: 'Frasassi Caves', lat: 43.4100, lng: 12.9600, country: 'Italy', type: 'Karst Cave', depth_m: 250, length_km: 13.0, description: 'Massive caverns in Marche, contains 180m tall Ancona abyss' },
    { id: 21, name: 'Bue Marino Cave', lat: 40.2500, lng: 9.6300, country: 'Italy', type: 'Sea Cave', depth_m: 50, length_km: 15.0, description: 'Longest sea cave in Italy, former monk seal habitat on Sardinia' },
    { id: 22, name: 'Nettuno Caves (Grotta di Nettuno)', lat: 40.5600, lng: 8.1600, country: 'Italy', type: 'Sea Cave', depth_m: 30, length_km: 4.0, description: 'Sea cave on Capo Caccia, Sardinia, accessible by boat or stairs' },
    { id: 23, name: 'Cueva del Guácharo', lat: 10.1700, lng: -63.5500, country: 'Venezuela', type: 'Karst Cave', depth_m: 100, length_km: 10.2, description: 'First national monument of Venezuela, home to oilbirds (guácharos)' },
    { id: 24, name: 'Actun Tunichil Muknal (ATM Cave)', lat: 17.1100, lng: -88.8300, country: 'Belize', type: 'Maya Ritual Cave', depth_m: 50, length_km: 6.0, description: 'Maya ceremonial cave with crystalized skeletons and pottery' },
    { id: 25, name: 'Crystal Cave (Mammoth Cave)', lat: 37.1800, lng: -86.0900, country: 'USA', type: 'Limestone Cave', depth_m: 70, length_km: 7.0, description: 'Part of Mammoth Cave system, known for rare cave formations' },
    { id: 26, name: 'Grotte de Han-sur-Lesse', lat: 50.1200, lng: 5.1900, country: 'Belgium', type: 'Karst Cave', depth_m: 100, length_km: 12.0, description: 'Show cave with massive caverns carved by Lesse river' },
    { id: 27, name: 'Sơn Đoòng extension (Hang En)', lat: 17.5040, lng: 106.3290, country: 'Vietnam', type: 'Karst Cave', depth_m: 200, length_km: 3.0, description: 'Third largest cave in the world, connecting to Son Doong system' },
    { id: 28, name: 'Vjetrenica Cave', lat: 42.8500, lng: 17.6500, country: 'Bosnia and Herzegovina', type: 'Karst Cave', depth_m: 100, length_km: 7.0, description: 'Most cave fauna diversity in the world, called "wind cave"' },
  ];
  return NextResponse.json({ caves, total: caves.length, timestamp: new Date().toISOString() });
}
