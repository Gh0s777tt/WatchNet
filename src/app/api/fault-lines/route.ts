import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const fault_lines = [
    {
      id: 1, name: 'San Andreas Fault', type: 'Strike-slip', length_km: 1200,
      coordinates: [[-122.68, 38.79], [-122.50, 37.90], [-122.20, 37.50], [-121.80, 37.00], [-121.30, 36.50], [-120.80, 36.00], [-120.40, 35.70], [-120.00, 35.30], [-119.50, 34.80], [-119.00, 34.30], [-118.50, 33.80], [-118.00, 33.30], [-117.50, 32.80], [-117.00, 32.50]],
      country: 'USA', region: 'California'
    },
    {
      id: 2, name: 'North Anatolian Fault', type: 'Strike-slip', length_km: 1500,
      coordinates: [[29.00, 41.00], [30.50, 40.80], [32.00, 40.60], [33.50, 40.40], [35.00, 40.20], [36.50, 40.00], [38.00, 39.80], [39.50, 39.60], [41.00, 39.40]],
      country: 'Turkey', region: 'Anatolia'
    },
    {
      id: 3, name: 'Japan Trench', type: 'Subduction', length_km: 800,
      coordinates: [[145.00, 43.00], [144.50, 42.00], [144.00, 41.00], [143.50, 40.00], [143.00, 39.00], [142.50, 38.00], [142.00, 37.00], [141.50, 36.00], [141.00, 35.00]],
      country: 'Japan', region: 'Pacific Ocean'
    },
    {
      id: 4, name: 'Alpine Fault', type: 'Strike-slip', length_km: 600,
      coordinates: [[169.00, -43.50], [169.50, -43.00], [170.00, -42.50], [170.50, -42.00], [171.00, -41.50], [171.50, -41.00], [172.00, -40.50]],
      country: 'New Zealand', region: 'South Island'
    },
    {
      id: 5, name: 'Sumatran Fault', type: 'Strike-slip', length_km: 1900,
      coordinates: [[95.50, 5.80], [96.00, 4.50], [96.50, 3.20], [97.00, 2.00], [97.50, 0.80], [98.00, -0.40], [98.50, -1.60], [99.00, -2.80], [99.50, -4.00], [100.00, -5.20], [100.50, -6.00]],
      country: 'Indonesia', region: 'Sumatra'
    },
    {
      id: 6, name: 'Dead Sea Transform', type: 'Strike-slip', length_km: 1000,
      coordinates: [[36.20, 34.80], [36.00, 34.00], [35.80, 33.20], [35.60, 32.40], [35.40, 31.60], [35.20, 30.80], [35.00, 30.00], [34.80, 29.20], [34.60, 28.40]],
      country: 'Israel/Jordan/Syria', region: 'Levant'
    },
    {
      id: 7, name: 'Himalayan Thrust', type: 'Thrust', length_km: 2400,
      coordinates: [[72.00, 33.00], [74.00, 32.50], [76.00, 32.00], [78.00, 31.50], [80.00, 31.00], [82.00, 30.50], [84.00, 30.00], [86.00, 29.50], [88.00, 29.00], [90.00, 28.50], [92.00, 28.00], [94.00, 27.50], [96.00, 27.00]],
      country: 'India/Nepal/Bhutan', region: 'Himalayas'
    },
    {
      id: 8, name: 'East African Rift', type: 'Divergent', length_km: 6000,
      coordinates: [[36.00, 15.00], [36.50, 14.00], [37.00, 13.00], [37.50, 12.00], [38.00, 11.00], [38.50, 10.00], [39.00, 9.00], [39.50, 8.00], [40.00, 7.00], [40.50, 6.00], [41.00, 5.00], [41.50, 4.00], [42.00, 3.00], [42.50, 2.00], [43.00, 1.00], [43.50, 0.00], [44.00, -1.00], [44.50, -2.00], [45.00, -3.00]],
      country: 'Multiple', region: 'East Africa'
    },
    {
      id: 9, name: 'Aleutian Trench', type: 'Subduction', length_km: 3400,
      coordinates: [[-160.00, 54.00], [-165.00, 53.50], [-170.00, 53.00], [-175.00, 52.50], [180.00, 52.00], [175.00, 51.50], [170.00, 51.00], [165.00, 50.50], [-160.00, 54.00]],
      country: 'USA', region: 'Alaska'
    },
    {
      id: 10, name: 'Marianas Trench', type: 'Subduction', length_km: 2500,
      coordinates: [[142.00, 22.00], [143.00, 20.00], [144.00, 18.00], [145.00, 16.00], [146.00, 14.00], [147.00, 12.00]],
      country: 'Multiple', region: 'Western Pacific'
    },
    {
      id: 11, name: 'Peru-Chile Trench', type: 'Subduction', length_km: 5900,
      coordinates: [[-80.00, -5.00], [-79.00, -8.00], [-78.00, -11.00], [-77.00, -14.00], [-76.00, -17.00], [-75.00, -20.00], [-74.00, -23.00], [-73.00, -26.00], [-72.00, -29.00], [-71.00, -32.00], [-70.00, -35.00], [-69.00, -38.00], [-68.00, -41.00], [-67.00, -44.00], [-66.00, -47.00]],
      country: 'Peru/Chile', region: 'South America'
    },
    {
      id: 12, name: 'Mid-Atlantic Ridge', type: 'Divergent', length_km: 16000,
      coordinates: [[-30.00, 70.00], [-28.00, 65.00], [-26.00, 60.00], [-24.00, 55.00], [-22.00, 50.00], [-20.00, 45.00], [-18.00, 40.00], [-16.00, 35.00], [-14.00, 30.00], [-12.00, 25.00], [-10.00, 20.00], [-8.00, 15.00], [-6.00, 10.00], [-4.00, 5.00], [-2.00, 0.00], [0.00, -5.00]],
      country: 'Multiple', region: 'Atlantic Ocean'
    },
  ];
  return NextResponse.json({ fault_lines, total: fault_lines.length, timestamp: new Date().toISOString() });
}
