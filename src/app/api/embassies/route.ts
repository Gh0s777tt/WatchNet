import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const embassies = [
    { id: 'emb-001', name: 'US Embassy Rome', lat: 41.8364, lng: 12.5133, country: 'Italy', city: 'Rome', type: 'Embassy' },
    { id: 'emb-002', name: 'US Embassy London', lat: 51.4847, lng: -0.1269, country: 'UK', city: 'London', type: 'Embassy' },
    { id: 'emb-003', name: 'US Embassy Paris', lat: 48.8602, lng: 2.3184, country: 'France', city: 'Paris', type: 'Embassy' },
    { id: 'emb-004', name: 'US Embassy Berlin', lat: 52.5150, lng: 13.3875, country: 'Germany', city: 'Berlin', type: 'Embassy' },
    { id: 'emb-005', name: 'US Embassy Moscow', lat: 55.7580, lng: 37.5840, country: 'Russia', city: 'Moscow', type: 'Embassy' },
    { id: 'emb-006', name: 'US Embassy Tokyo', lat: 35.6666, lng: 139.7222, country: 'Japan', city: 'Tokyo', type: 'Embassy' },
    { id: 'emb-007', name: 'US Embassy Beijing', lat: 39.9790, lng: 116.4450, country: 'China', city: 'Beijing', type: 'Embassy' },
    { id: 'emb-008', name: 'US Consulate Milan', lat: 45.4886, lng: 9.1928, country: 'Italy', city: 'Milan', type: 'Consulate' },
    { id: 'emb-009', name: 'US Embassy Delhi', lat: 28.5972, lng: 77.1892, country: 'India', city: 'New Delhi', type: 'Embassy' },
    { id: 'emb-010', name: 'UK Embassy Rome', lat: 41.9008, lng: 12.4972, country: 'Italy', city: 'Rome', type: 'Embassy' },
    { id: 'emb-011', name: 'Russian Embassy Rome', lat: 41.9194, lng: 12.4896, country: 'Italy', city: 'Rome', type: 'Embassy' },
    { id: 'emb-012', name: 'UN Headquarters', lat: 40.7486, lng: -73.9684, country: 'USA', city: 'New York', type: 'Mission' },
    { id: 'emb-013', name: 'US Embassy Baghdad', lat: 33.2990, lng: 44.4180, country: 'Iraq', city: 'Baghdad', type: 'Embassy' },
    { id: 'emb-014', name: 'US Embassy Kabul', lat: 34.5460, lng: 69.1910, country: 'Afghanistan', city: 'Kabul', type: 'Embassy' },
    { id: 'emb-015', name: 'US Embassy Nairobi', lat: -1.2667, lng: 36.8144, country: 'Kenya', city: 'Nairobi', type: 'Embassy' },
    { id: 'emb-016', name: 'US Embassy Tel Aviv', lat: 32.0737, lng: 34.7799, country: 'Israel', city: 'Tel Aviv', type: 'Embassy' },
    { id: 'emb-017', name: 'US Embassy Riyadh', lat: 24.6814, lng: 46.6840, country: 'Saudi Arabia', city: 'Riyadh', type: 'Embassy' },
    { id: 'emb-018', name: 'US Embassy Brasilia', lat: -15.8380, lng: -47.8810, country: 'Brazil', city: 'Brasilia', type: 'Embassy' },
    { id: 'emb-019', name: 'US Embassy Canberra', lat: -35.3060, lng: 149.1240, country: 'Australia', city: 'Canberra', type: 'Embassy' },
    { id: 'emb-020', name: 'US Embassy Pretoria', lat: -25.7420, lng: 28.2310, country: 'South Africa', city: 'Pretoria', type: 'Embassy' },
    { id: 'emb-021', name: 'EU Embassy Washington', lat: 38.9075, lng: -77.0492, country: 'USA', city: 'Washington DC', type: 'Delegation' },
    { id: 'emb-022', name: 'US Consulate Ho Chi Minh', lat: 10.7820, lng: 106.6990, country: 'Vietnam', city: 'Ho Chi Minh', type: 'Consulate' },
    { id: 'emb-023', name: 'US Embassy Bern', lat: 46.9430, lng: 7.4320, country: 'Switzerland', city: 'Bern', type: 'Embassy' },
    { id: 'emb-024', name: 'US Embassy Oslo', lat: 59.9200, lng: 10.7200, country: 'Norway', city: 'Oslo', type: 'Embassy' },
    { id: 'emb-025', name: 'US Embassy Stockholm', lat: 59.3460, lng: 18.0880, country: 'Sweden', city: 'Stockholm', type: 'Embassy' },
  ];
  return NextResponse.json({ embassies, total: embassies.length, timestamp: new Date().toISOString() });
}
