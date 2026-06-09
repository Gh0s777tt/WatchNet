import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const circles = [
    { id: 'cc-001', name: 'Silbury Hill 2004', lat: 51.4148, lng: -1.8572, country: 'UK', region: 'Wiltshire', year: 2004, description: 'Complex fractal pattern near Silbury Hill' },
    { id: 'cc-002', name: 'Milk Hill 2001', lat: 51.3800, lng: -1.8500, country: 'UK', region: 'Wiltshire', year: 2001, description: '409-circle formation, largest ever recorded' },
    { id: 'cc-003', name: 'Chilbolton 2001', lat: 51.1500, lng: -1.4400, country: 'UK', region: 'Hampshire', year: 2001, description: 'Face and binary code pattern near Chilbolton Observatory' },
    { id: 'cc-004', name: 'Crabwood 2002', lat: 51.0100, lng: -1.3400, country: 'UK', region: 'Hampshire', year: 2002, description: 'Gray alien face pattern with binary disc' },
    { id: 'cc-005', name: 'Stonehenge 1996', lat: 51.1789, lng: -1.8262, country: 'UK', region: 'Wiltshire', year: 1996, description: 'Spiral pattern near Stonehenge' },
    { id: 'cc-006', name: 'West Kennett 2000', lat: 51.4070, lng: -1.8540, country: 'UK', region: 'Wiltshire', year: 2000, description: 'Galaxy spiral pattern near Avebury' },
    { id: 'cc-007', name: 'Wayland\'s Smithy 1996', lat: 51.5680, lng: -1.5980, country: 'UK', region: 'Oxfordshire', year: 1996, description: 'Complex geometric formation' },
    { id: 'cc-008', name: 'Julia Set 1996', lat: 51.0100, lng: -1.5000, country: 'UK', region: 'Hampshire', year: 1996, description: 'Julia Set fractal pattern' },
    { id: 'cc-009', name: 'Avebury 1997', lat: 51.4280, lng: -1.8540, country: 'UK', region: 'Wiltshire', year: 1997, description: 'DNA double helix pattern' },
    { id: 'cc-010', name: 'White Hill 2002', lat: 51.3600, lng: -1.7700, country: 'UK', region: 'Wiltshire', year: 2002, description: 'Solar system pattern' },
    { id: 'cc-011', name: 'Etchilhampton 1997', lat: 51.3500, lng: -1.9300, country: 'UK', region: 'Wiltshire', year: 1997, description: 'Triangle and circle formation' },
    { id: 'cc-012', name: 'Bishops Cannings 2000', lat: 51.3790, lng: -1.9360, country: 'UK', region: 'Wiltshire', year: 2000, description: 'Crop circle with encoded message' },
    { id: 'cc-013', name: 'Tidworth 2010', lat: 51.2300, lng: -1.6600, country: 'UK', region: 'Wiltshire', year: 2010, description: 'Large geometric mandala pattern' },
    { id: 'cc-014', name: 'Manton 2005', lat: 51.4100, lng: -1.7400, country: 'UK', region: 'Wiltshire', year: 2005, description: 'Triangle formation near Marlborough' },
    { id: 'cc-015', name: 'Lockeridge 2003', lat: 51.4060, lng: -1.7720, country: 'UK', region: 'Wiltshire', year: 2003, description: 'Complex star pattern' },
    { id: 'cc-016', name: 'Golden Ball Hill 2009', lat: 51.3600, lng: -1.7000, country: 'UK', region: 'Wiltshire', year: 2009, description: 'Mayan calendar style pattern' },
    { id: 'cc-017', name: 'Bury Barton 2006', lat: 50.8900, lng: -3.5800, country: 'UK', region: 'Devon', year: 2006, description: 'Bird-like formation' },
    { id: 'cc-018', name: 'Etchilhampton Hill 2008', lat: 51.3550, lng: -1.9250, country: 'UK', region: 'Wiltshire', year: 2008, description: 'Nine-pointed star formation' },
    { id: 'cc-019', name: 'West Overton 2006', lat: 51.3940, lng: -1.8010, country: 'UK', region: 'Wiltshire', year: 2006, description: 'Geometric flower pattern' },
    { id: 'cc-020', name: 'Hakel 2017', lat: 51.7920, lng: 11.4450, country: 'Germany', region: 'Saxony-Anhalt', year: 2017, description: 'Rare German crop circle formation' },
    { id: 'cc-021', name: 'Alton Barnes 1990', lat: 51.3580, lng: -1.8560, country: 'UK', region: 'Wiltshire', year: 1990, description: 'Pictogram pattern - classic formation' },
    { id: 'cc-022', name: 'Barbury Castle 1991', lat: 51.4780, lng: -1.7850, country: 'UK', region: 'Wiltshire', year: 1991, description: 'Triple Julia set pattern' },
    { id: 'cc-023', name: 'Oliver\'s Castle 1996', lat: 51.3690, lng: -1.9650, country: 'UK', region: 'Wiltshire', year: 1996, description: 'Snowflake crystal pattern' },
    { id: 'cc-024', name: 'Woodborough Hill 2000', lat: 51.3380, lng: -1.8450, country: 'UK', region: 'Wiltshire', year: 2000, description: 'Complex crop circle near Woodborough' },
    { id: 'cc-025', name: 'Yatesbury 2002', lat: 51.4350, lng: -1.9080, country: 'UK', region: 'Wiltshire', year: 2002, description: 'Tetrahedron pattern in wheat field' },
  ];
  return NextResponse.json({ crop_circles: circles, total: circles.length, timestamp: new Date().toISOString() });
}
