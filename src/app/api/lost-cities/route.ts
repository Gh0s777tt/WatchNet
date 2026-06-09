import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const lost_cities = [
    { id: 1, name: 'Atlantis', lat: 36.0000, lng: -30.0000, country: 'Atlantic Ocean', type: 'Mythical', description: 'Platonic tale of a powerful island civilization that sank in a day and night' },
    { id: 2, name: 'Lemuria / Mu', lat: -20.0000, lng: -180.0000, country: 'Pacific Ocean', type: 'Mythical', description: 'Hypothetical lost continent in the Pacific, popular in occult theories' },
    { id: 3, name: 'Agartha', lat: 0.0000, lng: 0.0000, country: 'Inner Earth', type: 'Mythical', description: 'Legendary underground city said to exist in the Earth\'s hollow interior' },
    { id: 4, name: 'Shambhala', lat: 35.0000, lng: 90.0000, country: 'Tibet / Mongolia', type: 'Mythical', description: 'Hidden kingdom in Tibetan Buddhist tradition, source of wisdom' },
    { id: 5, name: 'El Dorado', lat: 5.0000, lng: -74.0000, country: 'Colombia', type: 'Legendary', description: 'Gilded king who covered himself in gold dust, later became myth of Golden City' },
    { id: 6, name: 'The Seven Cities of Cíbola', lat: 35.0000, lng: -108.0000, country: 'USA', type: 'Legendary', description: 'Fabled cities of gold sought by Coronado in the American Southwest' },
    { id: 7, name: 'Ys (Is)', lat: 48.2000, lng: -4.5000, country: 'France', type: 'Legendary', description: 'Breton city built below sea level, flooded by the devil for sin' },
    { id: 8, name: 'Vineta', lat: 54.5000, lng: 14.0000, country: 'Germany / Poland', type: 'Legendary', description: 'Mythical sunken city in the Baltic Sea, "Venice of the North"' },
    { id: 9, name: 'Rungholt', lat: 54.4500, lng: 8.8000, country: 'Germany', type: 'Real - Submerged', description: 'Wealthy medieval city submerged by storm surge in 1362, "Atlantis of the North"' },
    { id: 10, name: 'Kitezh', lat: 56.5000, lng: 44.5000, country: 'Russia', type: 'Legendary', description: 'Invisible underwater city beneath Lake Svetloyar, only seen by the pure' },
    { id: 11, name: 'Lyonesse', lat: 50.0000, lng: -6.0000, country: 'UK', type: 'Legendary', description: 'Arthurian land between Cornwall and Isles of Scilly, sank into the sea' },
    { id: 12, name: 'Dwarka', lat: 22.2400, lng: 68.9700, country: 'India', type: 'Real - Submerged', description: 'Ancient city of Krishna, underwater ruins discovered in Gulf of Khambhat' },
    { id: 13, name: 'Heracleion', lat: 31.3100, lng: 30.1000, country: 'Egypt', type: 'Real - Submerged', description: 'Ancient Egyptian city submerged in Abu Qir Bay, rediscovered 2001' },
    { id: 14, name: 'Thonis', lat: 31.3100, lng: 30.1000, country: 'Egypt', type: 'Real - Submerged', description: 'Same as Heracleion, twin name used by Greeks and Egyptians' },
    { id: 15, name: 'Port Royal', lat: 17.9400, lng: -76.8400, country: 'Jamaica', type: 'Real - Submerged', description: 'Pirate capital sank into Caribbean Sea in 1692 earthquake, "Sunken City"' },
    { id: 16, name: 'Baia', lat: 40.8200, lng: 14.0700, country: 'Italy', type: 'Real - Submerged', description: 'Roman resort city submerged by volcanic bradyseism in Gulf of Naples' },
    { id: 17, name: 'Pavlopetri', lat: 36.5200, lng: 22.9900, country: 'Greece', type: 'Real - Submerged', description: 'Oldest known submerged city, 5000 years old, off Laconia coast' },
    { id: 18, name: 'Helike', lat: 38.2200, lng: 22.1500, country: 'Greece', type: 'Real - Submerged', description: 'Ancient Greek city destroyed by earthquake and tsunami in 373 BC' },
    { id: 19, name: 'Atlit Yam', lat: 32.7100, lng: 34.9300, country: 'Israel', type: 'Real - Submerged', description: '9000-year-old Neolithic submerged village off the Carmel coast' },
    { id: 20, name: 'Tikal', lat: 17.2220, lng: -89.6240, country: 'Guatemala', type: 'Real - Excavated', description: 'Lost Maya city swallowed by jungle, rediscovered in 1848' },
    { id: 21, name: 'Petra', lat: 30.3285, lng: 35.4444, country: 'Jordan', type: 'Real - Excavated', description: 'Nabatean capital carved in rose-red rock, lost to West until 1812' },
    { id: 22, name: 'Machu Picchu', lat: -13.1631, lng: -72.5450, country: 'Peru', type: 'Real - Excavated', description: 'Inca citadel high in the Andes, never found by Spanish conquistadors' },
    { id: 23, name: 'Angkor Wat', lat: 13.4125, lng: 103.8670, country: 'Cambodia', type: 'Real - Excavated', description: 'Largest religious monument ever built, reclaimed by jungle for centuries' },
    { id: 24, name: 'Great Zimbabwe', lat: -20.2670, lng: 30.9330, country: 'Zimbabwe', type: 'Real - Excavated', description: 'Massive stone city of medieval Shona kingdom, mysterious origins' },
    { id: 25, name: 'Nan Madol', lat: 6.8430, lng: 158.3320, country: 'Micronesia', type: 'Real - Excavated', description: 'Venice of the Pacific, 100 artificial islets of basalt megaliths' },
    { id: 26, name: 'Mohenjo-Daro', lat: 27.3333, lng: 68.1333, country: 'Pakistan', type: 'Real - Excavated', description: 'One of the great cities of Indus Valley Civilization, 2500 BC' },
    { id: 27, name: 'Çatalhöyük', lat: 37.6670, lng: 32.8270, country: 'Turkey', type: 'Real - Excavated', description: '9000-year-old Neolithic city, no streets, houses accessed from rooftops' },
    { id: 28, name: 'Troy', lat: 39.9570, lng: 26.2380, country: 'Turkey', type: 'Real - Excavated', description: 'Homeric city of Trojan War, discovered by Schliemann in 1871' },
    { id: 29, name: 'Xanadu (Shangdu)', lat: 42.3600, lng: 116.1800, country: 'China', type: 'Real - Excavated', description: 'Summer capital of Kublai Khan, immortalized by Coleridge poem' },
    { id: 30, name: 'Vijayanagara (Hampi)', lat: 15.3350, lng: 76.4620, country: 'India', type: 'Real - Excavated', description: 'Capital of Vijayanagara Empire, sacked and left in ruins among boulders' },
    { id: 31, name: 'Palenque', lat: 17.4840, lng: -92.0460, country: 'Mexico', type: 'Real - Excavated', description: 'Classic Maya city lost in the jungle, known for Pakal\'s tomb' },
    { id: 32, name: 'Copán', lat: 14.8400, lng: -89.1500, country: 'Honduras', type: 'Real - Excavated', description: 'Maya city with the most intricate hieroglyphic stairway in the world' },
  ];
  return NextResponse.json({ lost_cities, total: lost_cities.length, timestamp: new Date().toISOString() });
}
