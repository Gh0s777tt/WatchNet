import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const meteorites = [
    { id: 1, name: 'Sikhote-Alin', lat: 46.16, lng: 134.65, year: 1947, mass_kg: 23000, type: 'Iron', country: 'Russia' },
    { id: 2, name: 'Hoba', lat: -19.58, lng: 17.92, year: 1920, mass_kg: 60000, type: 'Iron', country: 'Namibia' },
    { id: 3, name: 'Campo del Cielo', lat: -27.47, lng: -60.58, year: 1576, mass_kg: 37000, type: 'Iron', country: 'Argentina' },
    { id: 4, name: 'Canyon Diablo', lat: 35.03, lng: -111.02, year: 1891, mass_kg: 30000, type: 'Iron', country: 'USA' },
    { id: 5, name: 'Allende', lat: 26.97, lng: -105.32, year: 1969, mass_kg: 2000, type: 'Carbonaceous Chondrite', country: 'Mexico' },
    { id: 6, name: 'Murchison', lat: -36.62, lng: 145.20, year: 1969, mass_kg: 100, type: 'Carbonaceous Chondrite', country: 'Australia' },
    { id: 7, name: 'Chelyabinsk', lat: 54.82, lng: 61.12, year: 2013, mass_kg: 10000, type: 'Ordinary Chondrite', country: 'Russia' },
    { id: 8, name: 'Peekskill', lat: 41.28, lng: -73.92, year: 1992, mass_kg: 12, type: 'Ordinary Chondrite', country: 'USA' },
    { id: 9, name: 'Tunguska', lat: 60.89, lng: 101.89, year: 1908, mass_kg: 0, type: 'Stony', country: 'Russia' },
    { id: 10, name: 'Willamette', lat: 45.37, lng: -122.58, year: 1902, mass_kg: 15500, type: 'Iron', country: 'USA' },
    { id: 11, name: 'Gibeon', lat: -25.30, lng: 18.00, year: 1836, mass_kg: 26000, type: 'Iron', country: 'Namibia' },
    { id: 12, name: 'Ensisheim', lat: 47.87, lng: 7.35, year: 1492, mass_kg: 127, type: 'Ordinary Chondrite', country: 'France' },
    { id: 13, name: 'Orgueil', lat: 43.88, lng: 1.38, year: 1864, mass_kg: 14, type: 'Carbonaceous Chondrite', country: 'France' },
    { id: 14, name: 'Tagish Lake', lat: 59.70, lng: -134.20, year: 2000, mass_kg: 10, type: 'Carbonaceous Chondrite', country: 'Canada' },
    { id: 15, name: 'Brenham', lat: 37.57, lng: -99.17, year: 1882, mass_kg: 1000, type: 'Pallasite', country: 'USA' },
    { id: 16, name: 'Cape York', lat: 76.13, lng: -64.93, year: 1818, mass_kg: 58200, type: 'Iron', country: 'Greenland' },
    { id: 17, name: 'Muonionalusta', lat: 67.80, lng: 23.10, year: 1906, mass_kg: 230, type: 'Iron', country: 'Sweden' },
    { id: 18, name: 'Nakhla', lat: 31.03, lng: 30.35, year: 1911, mass_kg: 10, type: 'Martian (SNC)', country: 'Egypt' },
    { id: 19, name: "Sutter's Mill", lat: 38.80, lng: -120.91, year: 2012, mass_kg: 0.5, type: 'Carbonaceous Chondrite', country: 'USA' },
    { id: 20, name: 'Millbillillie', lat: -26.45, lng: 119.87, year: 1960, mass_kg: 330, type: 'Eucrite', country: 'Australia' },
    { id: 21, name: 'Jilin', lat: 44.05, lng: 126.17, year: 1976, mass_kg: 4000, type: 'Ordinary Chondrite', country: 'China' },
    { id: 22, name: 'Almahata Sitta', lat: 20.80, lng: 32.52, year: 2008, mass_kg: 4, type: 'Ureilite', country: 'Sudan' },
    { id: 23, name: 'Bassikounou', lat: 15.87, lng: -5.90, year: 2006, mass_kg: 30, type: 'Ordinary Chondrite', country: 'Mauritania' },
    { id: 24, name: 'Kaidun', lat: 15.00, lng: 48.30, year: 1980, mass_kg: 2, type: 'Rumuruti Chondrite', country: 'Yemen' },
    { id: 25, name: 'Norton County', lat: 39.67, lng: -99.88, year: 1948, mass_kg: 1100, type: 'Aubrite', country: 'USA' },
    { id: 26, name: 'Indianola', lat: 40.62, lng: -99.41, year: 1887, mass_kg: 310, type: 'Iron', country: 'USA' },
    { id: 27, name: 'Zag', lat: -24.25, lng: -66.58, year: 1998, mass_kg: 175, type: 'Ordinary Chondrite', country: 'Argentina' },
    { id: 28, name: 'Gold Basin', lat: 35.85, lng: -114.17, year: 1995, mass_kg: 70, type: 'Ordinary Chondrite', country: 'USA' },
    { id: 29, name: 'Saint-Aubin', lat: 48.47, lng: 3.58, year: 1968, mass_kg: 4, type: 'Ordinary Chondrite', country: 'France' },
    { id: 30, name: 'Buzzard Coulee', lat: 52.75, lng: -109.70, year: 2008, mass_kg: 41, type: 'Ordinary Chondrite', country: 'Canada' },
  ];
  return NextResponse.json({ meteorites, total: meteorites.length, timestamp: new Date().toISOString() });
}
