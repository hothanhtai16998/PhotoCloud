import { createRoot } from 'react-dom/client';
import { TimedCardSlider } from '../components/TimedCardSlider';
const slides = [
  { place: 'Nagano Prefecture', region: 'Japan Alps', title: 'NAGANO\nPREFECTURE', image: 'photo-1493976040374-85c8e12f0c0e', description: 'Ancient streets, quiet temples and mountain silhouettes. Discover a different rhythm beneath the Japanese Alps.' },
  { place: 'Sahara Desert · Morocco', region: 'Marrakech Merzouga', title: 'MARRAKECH\nMERZOUGA', image: 'photo-1509316785289-025f5b846b35', description: 'Beyond the city, a sea of golden dunes stretches to the horizon. Follow the light into the heart of the Sahara.' },
  { place: 'Sierra Nevada · USA', region: 'Yosemite National Park', title: 'YOSEMITE\nNATIONAL PARK', image: 'photo-1472396961693-142e6e269027', description: 'Granite peaks, forest trails and wide open skies. Find your own path through a landscape shaped by time.' },
  { place: 'Tarifa · Spain', region: 'Los Lances Beach', title: 'LOS LANCES\nBEACH', image: 'photo-1473116763249-2faaef81ccda', description: 'Where the Atlantic meets the Mediterranean, the wind carries you towards endless beaches and sunlit evenings.' },
  { place: 'Cappadocia · Turkey', region: 'Göreme Valley', title: 'GÖREME\nVALLEY', image: 'photo-1557972359-152b6ebd3eb3', description: 'Rise above sculpted valleys and hidden cave houses. A hundred balloons welcome the first light of a new day.' },
  { place: 'Switzerland Alps', region: 'Saint Antonien', title: 'SAINT\nANTONIEN', image: 'photo-1464822759023-fed622ff2c3b', description: 'Snow-covered summits, alpine lakes and peaceful mountain villages. Let the world slow down for a while.' },
];
const url = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2000&q=85`;

createRoot(document.getElementById('root')!).render(<TimedCardSlider brandName="GLOBE EXPRESS" slides={slides.map(slide => ({...slide, image: url(slide.image)}))} />);
