import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const mines = [
    { id: 1, name: 'Mirny Diamond Mine', lat: 62.5283, lng: 113.9950, country: 'Russia', type: 'Diamond Mine', depth_m: 525, description: 'Giant hole, second largest excavated pit, airspace closed for helicopters' },
    { id: 2, name: 'Witwatersrand Gold Mines', lat: -26.2041, lng: 28.0455, country: 'South Africa', type: 'Gold Mine', depth_m: 4000, description: 'Deepest gold mines in the world, produced 40% of world gold' },
    { id: 3, name: 'Super Pit (Fimiston Open Pit)', lat: -30.7750, lng: 121.5100, country: 'Australia', type: 'Gold Mine', depth_m: 600, description: 'Largest open pit gold mine in Australia, 3.5km long' },
    { id: 4, name: 'Chuquicamata', lat: -22.2900, lng: -68.9000, country: 'Chile', type: 'Copper Mine', depth_m: 850, description: 'Largest open pit copper mine in the world' },
    { id: 5, name: 'San José Mine', lat: -27.0000, lng: -70.2500, country: 'Chile', type: 'Gold Mine', depth_m: 700, description: 'Site of 2010 collapse, 33 miners trapped for 69 days' },
    { id: 6, name: 'El Dorado (Legendary)', lat: 5.0000, lng: -74.0000, country: 'Colombia', type: 'Gold Mine', depth_m: 0, description: 'Legendary city of gold, lake Guatavita ceremony site' },
    { id: 7, name: 'Mponeng Gold Mine', lat: -26.4361, lng: 27.4333, country: 'South Africa', type: 'Gold Mine', depth_m: 4200, description: 'Deepest mine in the world, temperatures reach 66°C' },
    { id: 8, name: 'Kolar Gold Fields', lat: 12.9600, lng: 78.2700, country: 'India', type: 'Gold Mine', depth_m: 3000, description: 'One of deepest gold mines, operated from 1880 to 2001' },
    { id: 9, name: 'Bingham Canyon Mine', lat: 40.5200, lng: -112.1500, country: 'USA', type: 'Copper Mine', depth_m: 1200, description: 'Largest man-made excavation on Earth, visible from space' },
    { id: 10, name: 'Cullinan Diamond Mine', lat: -25.6600, lng: 28.5200, country: 'South Africa', type: 'Diamond Mine', depth_m: 1073, description: 'Source of largest rough diamond ever found (3,106 carats)' },
    { id: 11, name: 'Kimberley Diamond Mine (Big Hole)', lat: -28.7389, lng: 24.7597, country: 'South Africa', type: 'Diamond Mine', depth_m: 240, description: 'Famous hand-dug hole, 50,000 miners dug with picks and shovels' },
    { id: 12, name: 'Wieliczka Salt Mine', lat: 49.9833, lng: 20.0500, country: 'Poland', type: 'Salt Mine', depth_m: 327, description: 'UNESCO site with underground chapels, lakes, carved from salt' },
    { id: 13, name: 'Siberian Gulag Gold Mines (Kolyma)', lat: 62.0000, lng: 150.0000, country: 'Russia', type: 'Gold Mine', depth_m: 500, description: 'Infamous Stalin-era gulags, millions died in gold extraction' },
    { id: 14, name: 'Grasberg Mine', lat: -4.0500, lng: 137.1200, country: 'Indonesia', type: 'Gold Mine', depth_m: 1500, description: 'Largest gold mine and third largest copper mine in the world' },
    { id: 15, name: 'Yanacocha Mine', lat: -6.9900, lng: -78.5400, country: 'Peru', type: 'Gold Mine', depth_m: 400, description: 'Largest gold mine in South America, 5 open pits' },
    { id: 16, name: 'Muruntau Gold Mine', lat: 41.5000, lng: 64.6000, country: 'Uzbekistan', type: 'Gold Mine', depth_m: 600, description: 'Largest gold mine in the world by production' },
    { id: 17, name: 'Kennecott Copper Mine', lat: 61.4800, lng: -144.4400, country: 'USA', type: 'Copper Mine', depth_m: 551, description: 'Located in Alaska, now a National Historic Landmark' },
    { id: 18, name: 'Diamond City (Kimberley)', lat: -28.7400, lng: 24.7700, country: 'South Africa', type: 'Diamond Mine', depth_m: 200, description: 'Collection of diamond mines that produced most of world diamonds' },
    { id: 19, name: 'Gansu Coal Mine (Ghost Mine)', lat: 36.0000, lng: 104.0000, country: 'China', type: 'Coal Mine', depth_m: 800, description: 'Abandoned after 2010 disaster, local legends of ghost miners' },
    { id: 20, name: 'Sado Gold Mine', lat: 38.0300, lng: 138.3800, country: 'Japan', type: 'Gold Mine', depth_m: 300, description: 'Historical gold mine on Sado Island, operated from 1601' },
    { id: 21, name: 'Picher Lead-Zinc Mine', lat: 36.9900, lng: -94.8300, country: 'USA', type: 'Abandoned Mine', depth_m: 200, description: 'Ghost town turned Superfund site, sinkholes and chat piles' },
    { id: 22, name: 'Centralia Mine Fire', lat: 40.8030, lng: -76.3400, country: 'USA', type: 'Coal Mine', depth_m: 300, description: 'Underground coal fire burning since 1962, town abandoned' },
    { id: 23, name: 'Jáchymov Uranium Mine', lat: 50.3600, lng: 12.9300, country: 'Czech Republic', type: 'Uranium Mine', depth_m: 500, description: 'First uranium mine used for Marie Curie research, later Soviet nukes' },
    { id: 24, name: 'Shinkolobwe Uranium Mine', lat: -11.0000, lng: 26.5500, country: 'DRC', type: 'Uranium Mine', depth_m: 400, description: 'Supplied uranium for Manhattan Project atomic bombs' },
    { id: 25, name: 'Mina de la Dificultad (Ghost Mine)', lat: 37.6800, lng: -2.2800, country: 'Spain', type: 'Ghost Mine', depth_m: 150, description: 'Abandoned lead mine, local legends of buried treasure' },
    { id: 26, name: 'Potosi Silver Mine (Cerro Rico)', lat: -19.6200, lng: -65.7500, country: 'Bolivia', type: 'Underground Mine', depth_m: 500, description: 'Mountain of silver that funded Spanish Empire, 8 million miners died' },
    { id: 27, name: 'Sutter\'s Mill / Coloma Gold', lat: 38.8000, lng: -120.8900, country: 'USA', type: 'Gold Mine', depth_m: 50, description: 'Where California Gold Rush began in 1848' },
    { id: 28, name: 'Kounrad Copper Mine', lat: 47.1100, lng: 75.0300, country: 'Kazakhstan', type: 'Copper Mine', depth_m: 400, description: 'Massive open pit in the Kazakh steppe, now a radioactive lake' },
    { id: 29, name: 'Bralorne Gold Mine', lat: 50.7800, lng: -122.8200, country: 'Canada', type: 'Gold Mine', depth_m: 2000, description: 'Closed in 1971, legendary among ghost town explorers' },
    { id: 30, name: 'Tambo Gold Mine', lat: -30.0000, lng: -70.5000, country: 'Chile', type: 'Gold Mine', depth_m: 600, description: 'Located in Elqui Valley, connected to UFO theories' },
  ];
  return NextResponse.json({ mines, total: mines.length, timestamp: new Date().toISOString() });
}
