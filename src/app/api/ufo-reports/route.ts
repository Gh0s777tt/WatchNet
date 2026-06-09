import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const ufo_reports = [
    { id: 1, name: 'Roswell Incident', lat: 33.39, lng: -104.52, year: 1947, type: 'Disc-shaped craft', country: 'USA', region: 'New Mexico', description: 'Alleged crash of an extraterrestrial spacecraft recovered by military' },
    { id: 2, name: 'Phoenix Lights', lat: 33.45, lng: -112.07, year: 1997, type: 'Formation of lights', country: 'USA', region: 'Arizona', description: 'Mass sighting of V-shaped formation of lights over Phoenix' },
    { id: 3, name: 'Rendlesham Forest', lat: 52.08, lng: 1.43, year: 1980, type: 'Triangular craft', country: 'UK', region: 'Suffolk', description: 'USAF personnel encountered a metallic triangular craft in forest' },
    { id: 4, name: 'Belgian Wave', lat: 50.85, lng: 4.35, year: 1990, type: 'Triangular craft', country: 'Belgium', region: 'Wallonia', description: 'Multiple radar and visual sightings of silent black triangles' },
    { id: 5, name: 'Nimitz Encounter (Tic Tac)', lat: 32.70, lng: -117.20, year: 2004, type: 'Tic-tac shaped', country: 'USA', region: 'California Coast', description: 'Navy pilots tracked hypersonic tic-tac shaped craft with no visible propulsion' },
    { id: 6, name: 'Ariel School Sighting', lat: -19.17, lng: 31.58, year: 1994, type: 'Disc-shaped craft', country: 'Zimbabwe', region: 'Ruwa', description: '62 schoolchildren reported a silver craft and beings' },
    { id: 7, name: 'Westall UFO', lat: -37.93, lng: 145.13, year: 1966, type: 'Silvery disc', country: 'Australia', region: 'Victoria', description: 'Over 200 students and teachers observed a silvery disc land and take off' },
    { id: 8, name: 'Cash-Landrum Incident', lat: 30.08, lng: -94.75, year: 1980, type: 'Diamond-shaped craft', country: 'USA', region: 'Texas', description: 'Witnesses suffered radiation burns from a diamond-shaped craft' },
    { id: 9, name: 'Battle of Los Angeles', lat: 33.94, lng: -118.40, year: 1942, type: 'Unknown craft', country: 'USA', region: 'California', description: 'AA batteries fired 1400+ shells at an unidentified object over LA' },
    { id: 10, name: 'Lubbock Lights', lat: 33.58, lng: -101.86, year: 1951, type: 'V-shaped lights', country: 'USA', region: 'Texas', description: 'Formation of lights seen by professors and pilots' },
    { id: 11, name: 'Falcon Lake Incident', lat: 49.70, lng: -95.30, year: 1967, type: 'Spherical craft', country: 'Canada', region: 'Manitoba', description: 'Geologist Stefan Michalak was burned by a landed craft' },
    { id: 12, name: 'Kelly-Hopkinsville Encounter', lat: 36.85, lng: -87.50, year: 1955, type: 'Goblin-like beings', country: 'USA', region: 'Kentucky', description: 'Family reported small luminous beings attacking farmhouse' },
    { id: 13, name: 'Tehran UFO Case', lat: 35.69, lng: 51.42, year: 1976, type: 'Brightly lit craft', country: 'Iran', region: 'Tehran', description: 'F-4 Phantom jets intercepted a bright craft that disabled avionics' },
    { id: 14, name: 'Japan Air Lines 1628', lat: 64.00, lng: -147.00, year: 1986, type: 'Lights with craft', country: 'USA', region: 'Alaska', description: 'Cargo plane followed by massive unidentified lights for 50 minutes' },
    { id: 15, name: 'Kecksburg Incident', lat: 40.20, lng: -79.50, year: 1965, type: 'Acorn-shaped craft', country: 'USA', region: 'Pennsylvania', description: 'Fireball crashed, military recovered acorn-shaped object' },
    { id: 16, name: 'O\'Hare International Airport', lat: 41.97, lng: -87.91, year: 2006, type: 'Disc-shaped craft', country: 'USA', region: 'Illinois', description: 'Employees observed a metallic disc hovering above gate C-17' },
    { id: 17, name: 'Pascagoula Abduction', lat: 30.37, lng: -88.56, year: 1973, type: 'Cigar-shaped craft', country: 'USA', region: 'Mississippi', description: 'Two men abducted by robotic beings on a cigar-shaped craft' },
    { id: 18, name: 'UFO over Gdańsk Bay', lat: 54.50, lng: 18.60, year: 2006, type: 'Luminous cylinder', country: 'Poland', region: 'Pomerania', description: 'Hundreds witnessed a slow-moving luminous cylinder' },
    { id: 19, name: 'Hessdalen Lights', lat: 62.65, lng: 11.30, year: 1981, type: 'Floating lights', country: 'Norway', region: 'Hessdalen', description: 'Recurring unexplained lights in the valley, studied by scientists' },
    { id: 20, name: 'Stephenville Lights', lat: 32.22, lng: -98.22, year: 2008, type: 'Multiple lights', country: 'USA', region: 'Texas', description: 'Dozens of witnesses including pilots reported a mile-wide craft' },
    { id: 21, name: 'Colares Flap', lat: -0.72, lng: -48.12, year: 1977, type: 'Multicolored lights', country: 'Brazil', region: 'Pará', description: 'Attacks by lights that left puncture marks and burns on victims' },
    { id: 22, name: 'Varginha Incident', lat: -21.55, lng: -45.43, year: 1996, type: 'Creature sighting', country: 'Brazil', region: 'Minas Gerais', description: 'Military captured a brown creature, witnesses reported UFO' },
    { id: 23, name: 'Trans-en-Provence', lat: 43.50, lng: 6.50, year: 1981, type: 'Disc-shaped craft', country: 'France', region: 'Provence', description: 'Gendarmes investigated a landed disc that left physical traces' },
    { id: 24, name: 'Socorro Incident', lat: 34.05, lng: -106.90, year: 1964, type: 'Egg-shaped craft', country: 'USA', region: 'New Mexico', description: 'Patrolman Lonnie Zamora saw egg-shaped craft and small beings' },
    { id: 25, name: 'Mariana UFO', lat: -22.00, lng: -47.00, year: 1957, type: 'Luminous ring', country: 'Brazil', region: 'São Paulo', description: 'Farmer saw a ring of light that left burned marks on his farm' },
    { id: 26, name: 'Welsh Triangle', lat: 51.80, lng: -5.00, year: 1974, type: 'Various', country: 'UK', region: 'Wales', description: 'Decades of UFO activity over the Pembrokeshire coast' },
    { id: 27, name: 'Beamish UFO', lat: 54.88, lng: -1.66, year: 1978, type: 'Silvery cigar', country: 'UK', region: 'Durham', description: 'Police and public saw a silent, metallic cigar-shaped object hovering' },
    { id: 28, name: 'Canary Islands UFO', lat: 28.12, lng: -15.43, year: 1976, type: 'Disc-shaped craft', country: 'Spain', region: 'Canary Islands', description: 'Radar confirmed massive disc over the airport during landing' },
    { id: 29, name: 'Utsjoki Sighting', lat: 69.90, lng: 27.00, year: 1992, type: 'Triangular craft', country: 'Finland', region: 'Lapland', description: 'Sami reindeer herders reported a silent black triangle at low altitude' },
    { id: 30, name: 'Gimli Sighting', lat: 50.63, lng: -97.00, year: 1975, type: 'Cigar-shaped', country: 'Canada', region: 'Manitoba', description: 'Multiple witnesses reported a large metallic cigar over Lake Winnipeg' },
  ];
  return NextResponse.json({ ufo_reports, total: ufo_reports.length, timestamp: new Date().toISOString() });
}
