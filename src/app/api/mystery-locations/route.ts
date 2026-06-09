import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const locations = [
    { id: 'my-001', name: 'Bermuda Triangle', lat: 25.0000, lng: -71.0000, country: 'Atlantic Ocean', type: 'Anomalous Zone', description: 'Area of alleged unexplained disappearances' },
    { id: 'my-002', name: 'Nazca Lines', lat: -14.7100, lng: -75.1400, country: 'Peru', type: 'Ancient Mystery', description: 'Giant geoglyphs visible only from air' },
    { id: 'my-003', name: 'Stonehenge', lat: 51.1789, lng: -1.8262, country: 'UK', type: 'Ancient Monument', description: 'Prehistoric megalithic structure, purpose unknown' },
    { id: 'my-004', name: 'Easter Island Moai', lat: -27.1127, lng: -109.3490, country: 'Chile', type: 'Ancient Mystery', description: '800 giant stone heads, Rapa Nui civilization' },
    { id: 'my-005', name: 'Pyramid of Giza', lat: 29.9792, lng: 31.1342, country: 'Egypt', type: 'Ancient Mystery', description: 'Last surviving Wonder of the Ancient World' },
    { id: 'my-006', name: 'Sacsayhuamán', lat: -13.5090, lng: -71.9820, country: 'Peru', type: 'Ancient Engineering', description: 'Massive interlocking stone walls, precision unknown' },
    { id: 'my-007', name: 'Baalbek', lat: 34.0060, lng: 36.2030, country: 'Lebanon', type: 'Ancient Mystery', description: '1,500 ton stone blocks in foundation, far heavier than modern cranes can lift' },
    { id: 'my-008', name: 'Dragon\'s Triangle / Devil\'s Sea', lat: 29.5000, lng: 137.0000, country: 'Japan', type: 'Anomalous Zone', description: 'Pacific version of Bermuda Triangle near Japan' },
    { id: 'my-009', name: 'Skinwalker Ranch', lat: 40.2570, lng: -109.8860, country: 'USA', state: 'Utah', type: 'UFO / Paranormal', description: 'Infamous ranch with alleged paranormal activity' },
    { id: 'my-010', name: 'Hessdalen Lights', lat: 62.6500, lng: 11.3000, country: 'Norway', type: 'Atmospheric Anomaly', description: 'Unexplained light phenomena in valley' },
    { id: 'my-011', name: 'Marfa Lights', lat: 30.3120, lng: -104.0160, country: 'USA', state: 'Texas', type: 'Atmospheric Anomaly', description: 'Mysterious floating lights in desert since 1883' },
    { id: 'my-012', name: 'Bermuda UFO Sighting 2013', lat: 32.3000, lng: -64.8000, country: 'Bermuda', type: 'UFO / Paranormal', description: 'Triangle-shaped UFO reported by multiple witnesses' },
    { id: 'my-013', name: 'Brown Mountain Lights', lat: 35.9600, lng: -81.8700, country: 'USA', state: 'North Carolina', type: 'Atmospheric Anomaly', description: 'Mysterious lights seen since 1200 CE' },
    { id: 'my-014', name: 'Sea of Galilee UFO 2011', lat: 32.8150, lng: 35.5900, country: 'Israel', type: 'UFO / Paranormal', description: 'Vortex-like UFO filmed by tourists' },
    { id: 'my-015', name: 'Himalayan Yeti Reports', lat: 27.9880, lng: 86.9250, country: 'Nepal', type: 'Cryptid', description: 'Area of alleged Yeti sightings in Khumbu region' },
    { id: 'my-016', name: 'Loch Ness', lat: 57.2650, lng: -4.5050, country: 'UK', type: 'Cryptid', description: 'Famous lake monster sightings since 565 CE' },
    { id: 'my-017', name: 'Mothman Locations', lat: 38.8290, lng: -82.0530, country: 'USA', state: 'West Virginia', type: 'Cryptid', description: 'Area of 1966-67 Mothman sightings near Point Pleasant' },
    { id: 'my-018', name: 'Chupacabra Reports PR', lat: 18.2100, lng: -66.5900, country: 'Puerto Rico', type: 'Cryptid', description: 'Original 1995 Chupacabra sightings' },
    { id: 'my-019', name: 'Minneapolis Spontaneous Combustion', lat: 44.9778, lng: -93.2650, country: 'USA', state: 'Minnesota', type: 'Mysterious Death', description: 'Mary Reeser case - alleged spontaneous human combustion' },
    { id: 'my-020', name: 'Centralia Mine Fire', lat: 40.8030, lng: -76.3400, country: 'USA', state: 'Pennsylvania', type: 'Environmental Anomaly', description: 'Underground coal fire burning since 1962' },
    { id: 'my-021', name: 'Witch\'s Castle (Balcarry)', lat: 55.0500, lng: -3.7000, country: 'UK', type: 'Paranormal', description: 'One of the world\'s most haunted locations' },
    { id: 'my-022', name: 'Poveglia Island', lat: 45.3810, lng: 12.3300, country: 'Italy', type: 'Paranormal', description: 'Plague island, mass graves, alleged hauntings' },
    { id: 'my-023', name: 'Hoia Baciu Forest', lat: 46.7500, lng: 23.5200, country: 'Romania', type: 'Anomalous Zone', description: 'Bermuda Triangle of Transylvania - UFO and paranormal hotspot' },
    { id: 'my-024', name: 'Stardust Ranch', lat: 32.8000, lng: -112.0000, country: 'USA', state: 'Arizona', type: 'UFO / Paranormal', description: 'Alleged chupacabra killings and UFO landings' },
    { id: 'my-025', name: 'Windsor Triangle', lat: 42.0900, lng: -72.5800, country: 'USA', state: 'Massachusetts', type: 'Anomalous Zone', description: 'Bridgewater Triangle - paranormal hotspot with UFOs, Bigfoot, ghosts' },
    { id: 'my-026', name: 'Glastonbury Tor', lat: 51.1440, lng: -2.6980, country: 'UK', type: 'Ancient Mystery', description: 'Mythical Isle of Avalon, Arthurian legends, ley line nexus' },
    { id: 'my-027', name: 'Rennes-le-Château', lat: 42.9280, lng: 2.2620, country: 'France', type: 'Ancient Mystery', description: 'Treasure mystery and religious conspiracy theories' },
    { id: 'my-028', name: 'Mount Shasta', lat: 41.4090, lng: -122.1950, country: 'USA', state: 'California', type: 'Ancient Mystery', description: 'Alleged underground city of Telos, Lemurian legends' },
    { id: 'my-029', name: 'Brocken Mountain', lat: 51.8010, lng: 10.6160, country: 'Germany', type: 'Paranormal', description: 'Walpurgis Night gatherings, witch legends, paranormal hotspot' },
    { id: 'my-030', name: 'Pripyat / Chernobyl', lat: 51.2760, lng: 30.2220, country: 'Ukraine', type: 'Abandoned Zone', description: 'Abandoned city after nuclear disaster, alien and cryptid legends' },
  ];
  return NextResponse.json({ mystery_locations: locations, total: locations.length, timestamp: new Date().toISOString() });
}
