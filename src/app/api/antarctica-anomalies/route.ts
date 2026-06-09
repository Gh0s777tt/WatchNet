import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const anomalies = [
    { id: 1, name: 'Pyramid of Antarctica (Ellsworth Mountains)', lat: -79.9700, lng: -81.9500, country: 'Antarctica', type: 'Controversial/Theory', description: 'Pyramid-shaped nunatak claimed by conspiracy theorists to be artificial' },
    { id: 2, name: 'Blood Falls', lat: -77.7200, lng: 162.2600, country: 'Antarctica', type: 'Natural Wonder', description: 'Iron-oxide rich brine bursts from Taylor Glacier, looks like flowing blood' },
    { id: 3, name: 'Lake Vostok', lat: -77.5000, lng: 106.0000, country: 'Antarctica', type: 'Geological Feature', description: 'Largest subglacial lake, 4000 meters under ice, sealed for 15 million years' },
    { id: 4, name: 'The Polynya (Weddell Sea Hole)', lat: -70.0000, lng: -40.0000, country: 'Antarctica', type: 'Natural Wonder', description: 'Giant recurring hole in sea ice, size of Switzerland, mysterious formation' },
    { id: 5, name: 'Endurance Wreck (Shackleton)', lat: -68.7200, lng: -52.4100, country: 'Antarctica', type: 'Historical', description: 'Shackleton\'s ship found in 2022 at 3008m depth in Weddell Sea' },
    { id: 6, name: 'Operation Highjump Site', lat: -64.9000, lng: -63.1500, country: 'Antarctica', type: 'Historical', description: '1946-47 US Navy expedition, conspiracy theories about Nazi base and UFOs' },
    { id: 7, name: 'Admiral Byrd\'s Alleged Statements', lat: -90.0000, lng: 0.0000, country: 'Antarctica', type: 'Controversial/Theory', description: 'Byrd allegedly said there is land beyond the pole, hollow earth theories' },
    { id: 8, name: 'Antarctic Ice Wall (Flat Earth Theory)', lat: -66.0000, lng: -180.0000, country: 'Antarctica', type: 'Controversial/Theory', description: 'The wall of ice believed by flat earthers to surround the Earth disc' },
    { id: 9, name: 'Ancient Pyramids Under Ice (Claims)', lat: -72.0000, lng: 10.0000, country: 'Antarctica', type: 'Controversial/Theory', description: 'Satellite images claimed to show pyramid structures beneath the ice' },
    { id: 10, name: 'Nazi Base 211 (Neuschwabenland)', lat: -72.0000, lng: -5.0000, country: 'Antarctica', type: 'Controversial/Theory', description: 'Theory of secret Nazi underground base built after WWII in Queen Maud Land' },
    { id: 11, name: 'UFO Bases Under Ice (Claims)', lat: -75.0000, lng: 130.0000, country: 'Antarctica', type: 'Controversial/Theory', description: 'Alleged extraterrestrial bases beneath Antarctic ice, whistleblower claims' },
    { id: 12, name: 'McMurdo Station', lat: -77.8500, lng: 166.6700, country: 'Antarctica', type: 'Research Station', description: 'Largest Antarctic research station, secret underground levels rumored' },
    { id: 13, name: 'WAIS Divide Ice Core Site', lat: -79.4680, lng: -112.0860, country: 'Antarctica', type: 'Research Station', description: 'Deepest ice core recovered (3405m), reveals 68,000 years of climate data' },
    { id: 14, name: 'South Pole Station (Amundsen-Scott)', lat: -90.0000, lng: 0.0000, country: 'Antarctica', type: 'Research Station', description: 'Year-round station at geographic South Pole, geodesic dome replaced 2008' },
    { id: 15, name: 'Gamburtsev Mountains (Ghost Mountains)', lat: -80.5000, lng: 76.0000, country: 'Antarctica', type: 'Geological Feature', description: 'Subglacial mountain range 2500m high, completely buried under ice sheet' },
    { id: 16, name: 'Lake Vostok Life (Hypotheses)', lat: -77.5000, lng: 106.0000, country: 'Antarctica', type: 'Controversial/Theory', description: 'Claims of unknown bacteria and possible alien-like life in subglacial lake' },
    { id: 17, name: 'Blood Falls Iron Bacteria', lat: -77.7200, lng: 162.2600, country: 'Antarctica', type: 'Natural Wonder', description: 'Extremophile bacteria living in brine pocket for 2 million years without light' },
    { id: 18, name: 'Ross Ice Shelf', lat: -81.5000, lng: -175.0000, country: 'Antarctica', type: 'Geological Feature', description: 'Largest ice shelf in the world, size of France, massive cracks appearing' },
    { id: 19, name: 'Antarctic Ozone Hole', lat: -78.0000, lng: -60.0000, country: 'Antarctica', type: 'Natural Wonder', description: 'Thinning of ozone layer discovered in 1985, largest above Antarctica' },
    { id: 20, name: 'Danger Islands', lat: -63.4500, lng: -54.6500, country: 'Antarctica', type: 'Geological Feature', description: 'Remote islands with 1.5 million Adelie penguins, hidden for centuries' },
    { id: 21, name: 'Deception Island', lat: -62.9700, lng: -60.6500, country: 'Antarctica', type: 'Geological Feature', description: 'Active volcano with flooded caldera, secret Nazi base theories persist' },
    { id: 22, name: 'Mount Erebus', lat: -77.5300, lng: 167.1700, country: 'Antarctica', type: 'Geological Feature', description: 'Southernmost active volcano on Earth, persistent lava lake since 1972' },
    { id: 23, name: 'Lake Whillans', lat: -83.6700, lng: -167.0000, country: 'Antarctica', type: 'Geological Feature', description: 'Subglacial lake drilled in 2013, found thriving microbial ecosystem' },
    { id: 24, name: 'Antarctic Mummies (Seal Mummies)', lat: -77.0000, lng: 162.0000, country: 'Antarctica', type: 'Natural Wonder', description: 'Mummified seal carcasses found in dry valleys, up to 5000 years old' },
    { id: 25, name: 'Alien Base Claims (Lake Vostok)', lat: -77.5000, lng: 106.0000, country: 'Antarctica', type: 'Controversial/Theory', description: 'Linda Moulton Howe and others claim secret government contact with ETs there' },
    { id: 26, name: 'Iceberg B13', lat: -65.0000, lng: -60.0000, country: 'Antarctica', type: 'Geological Feature', description: 'Massive 3000 sq km iceberg that broke from Ross Ice Shelf in 1996' },
    { id: 27, name: 'Denman Glacier', lat: -66.7500, lng: 100.0000, country: 'Antarctica', type: 'Geological Feature', description: 'Deepest canyon on Earth at 3500m below sea level, rapid ice loss' },
    { id: 28, name: 'Pine Island Glacier', lat: -75.0000, lng: -100.0000, country: 'Antarctica', type: 'Geological Feature', description: 'Fastest melting glacier in Antarctica, major sea level rise contributor' },
  ];
  return NextResponse.json({ antarctica_anomalies: anomalies, total: anomalies.length, timestamp: new Date().toISOString() });
}
