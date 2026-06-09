import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const shipwrecks = [
    { id: 1, name: 'Titanic', lat: 41.73, lng: -49.95, year: 1912, depth_m: 3800, type: 'Passenger Liner', cause: 'Iceberg collision', country: 'International Waters' },
    { id: 2, name: 'Bismarck', lat: 48.17, lng: -16.20, year: 1941, depth_m: 4700, type: 'Battleship', cause: 'Scuttled after battle', country: 'International Waters' },
    { id: 3, name: 'Lusitania', lat: 51.42, lng: -8.55, year: 1915, depth_m: 93, type: 'Passenger Liner', cause: 'Torpedoed by U-boat', country: 'Ireland' },
    { id: 4, name: 'Andrea Doria', lat: 40.49, lng: -69.86, year: 1956, depth_m: 75, type: 'Passenger Liner', cause: 'Collision', country: 'USA' },
    { id: 5, name: 'USS Arizona', lat: 21.36, lng: -157.95, year: 1941, depth_m: 12, type: 'Battleship', cause: 'Aerial bombing', country: 'USA' },
    { id: 6, name: 'Edmund Fitzgerald', lat: 47.00, lng: -85.11, year: 1975, depth_m: 162, type: 'Freighter', cause: 'Storm', country: 'Canada' },
    { id: 7, name: 'MV Wilhelm Gustloff', lat: 55.07, lng: 17.41, year: 1945, depth_m: 45, type: 'Passenger Ship', cause: 'Torpedoed', country: 'Poland' },
    { id: 8, name: 'RMS Empress of Ireland', lat: 48.62, lng: -68.40, year: 1914, depth_m: 45, type: 'Passenger Liner', cause: 'Collision', country: 'Canada' },
    { id: 9, name: 'USS Indianapolis', lat: 12.02, lng: 134.80, year: 1945, depth_m: 5500, type: 'Cruiser', cause: 'Torpedoed', country: 'Philippines' },
    { id: 10, name: 'MS Estonia', lat: 59.38, lng: 21.68, year: 1994, depth_m: 80, type: 'Ferry', cause: 'Sinking in storm', country: 'Finland' },
    { id: 11, name: 'MV Doña Paz', lat: 12.67, lng: 124.00, year: 1987, depth_m: 545, type: 'Ferry', cause: 'Collision and fire', country: 'Philippines' },
    { id: 12, name: 'SS Yongala', lat: -19.30, lng: 146.83, year: 1911, depth_m: 30, type: 'Passenger Ship', cause: 'Cyclone', country: 'Australia' },
    { id: 13, name: 'SS Atlantic', lat: 44.48, lng: -64.30, year: 1873, depth_m: 20, type: 'Passenger Liner', cause: 'Rocks', country: 'Canada' },
    { id: 14, name: 'HMHS Britannic', lat: 37.70, lng: 24.28, year: 1916, depth_m: 120, type: 'Hospital Ship', cause: 'Mine explosion', country: 'Greece' },
    { id: 15, name: 'USS Thresher', lat: 41.77, lng: -65.07, year: 1963, depth_m: 2560, type: 'Submarine', cause: 'Implosion', country: 'USA' },
    { id: 16, name: 'Kursk', lat: 69.40, lng: 37.58, year: 2000, depth_m: 108, type: 'Submarine', cause: 'Internal explosion', country: 'Russia' },
    { id: 17, name: 'SS Central America', lat: 31.50, lng: -77.00, year: 1857, depth_m: 2200, type: 'Steamer', cause: 'Hurricane', country: 'USA' },
    { id: 18, name: 'Vasa', lat: 59.33, lng: 18.09, year: 1628, depth_m: 32, type: 'Warship', cause: 'Design instability', country: 'Sweden' },
    { id: 19, name: 'Mary Rose', lat: 50.77, lng: -1.11, year: 1545, depth_m: 12, type: 'Warship', cause: 'Sank during battle', country: 'UK' },
    { id: 20, name: 'RMS Rhone', lat: 18.38, lng: -64.65, year: 1867, depth_m: 30, type: 'Mail Ship', cause: 'Hurricane', country: 'British Virgin Islands' },
    { id: 21, name: 'SS Atlantus', lat: 38.96, lng: -74.97, year: 1926, depth_m: 5, type: 'Concrete Ship', cause: 'Beached', country: 'USA' },
    { id: 22, name: 'Pamir', lat: 29.00, lng: -52.00, year: 1957, depth_m: 4700, type: 'Sailing Ship', cause: 'Hurricane', country: 'International Waters' },
    { id: 23, name: 'MV Explorer', lat: -61.67, lng: -56.00, year: 2007, depth_m: 900, type: 'Cruise Ship', cause: 'Iceberg collision', country: 'Antarctica' },
    { id: 24, name: 'SS El Faro', lat: 24.88, lng: -73.75, year: 2015, depth_m: 4600, type: 'Cargo Ship', cause: 'Hurricane', country: 'Bahamas' },
    { id: 25, name: 'HMAS Sydney', lat: -26.25, lng: 111.25, year: 1941, depth_m: 2500, type: 'Light Cruiser', cause: 'Sunk by raider', country: 'Australia' },
    { id: 26, name: 'MS Zenobia', lat: 34.67, lng: 33.33, year: 1980, depth_m: 42, type: 'Ferry', cause: 'Listing and sinking', country: 'Cyprus' },
    { id: 27, name: 'SS Pendleton', lat: 41.97, lng: -70.10, year: 1953, depth_m: 30, type: 'Tanker', cause: 'Broken in storm', country: 'USA' },
    { id: 28, name: 'SS Richard Montgomery', lat: 51.47, lng: 0.77, year: 1944, depth_m: 10, type: 'Cargo Ship', cause: 'Grounded with explosives', country: 'UK' },
    { id: 29, name: 'MV Sewol', lat: 35.70, lng: 126.10, year: 2014, depth_m: 40, type: 'Ferry', cause: 'Capsizing', country: 'South Korea' },
    { id: 30, name: 'USS Monitor', lat: 35.00, lng: -75.41, year: 1862, depth_m: 73, type: 'Ironclad', cause: 'Storm', country: 'USA' },
  ];
  return NextResponse.json({ shipwrecks, total: shipwrecks.length, timestamp: new Date().toISOString() });
}
