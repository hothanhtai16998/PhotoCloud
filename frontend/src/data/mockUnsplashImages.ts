
export interface UnsplashImage {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  blurHash: string;
  alt: string;
  user: {
    id: string;
    name: string;
    username: string;
    profileImage: string;
  };
  likes: number;
  downloads: number;
  color: string; // Dominant color for placeholder
}

// Generate mock images with realistic data
export const generateMockImages = (count: number): UnsplashImage[] => {
  const images: UnsplashImage[] = [];
  
  // Realistic aspect ratios (portrait, landscape, square)
  const aspectRatios = [
    0.67, // Portrait (2:3)
    0.75, // Portrait (3:4)
    1.0,  // Square
    1.33, // Landscape (4:3)
    1.5,  // Landscape (3:2)
    1.78, // Landscape (16:9)
  ];
  
  // Sample blur hashes (these would come from backend in real app)
  const blurHashes = [
    'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
    'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
    'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4',
  ];
  
  const colors = ['#1a1a1a', '#2d3748', '#4a5568', '#718096', '#a0aec0'];
  
  for (let i = 0; i < count; i++) {
    const aspectRatio = aspectRatios[Math.floor(Math.random() * aspectRatios.length)]!;
    const width = 1080;
    const height = Math.round(width / aspectRatio);
    const blurHash = blurHashes[i % blurHashes.length]!;
    const color = colors[i % colors.length]!;
    
    images.push({
      id: `mock-${i}`,
      width,
      height,
      aspectRatio,
      urls: {
        raw: `https://picsum.photos/id/${i + 100}/${width}/${height}`,
        full: `https://picsum.photos/id/${i + 100}/${width}/${height}`,
        regular: `https://picsum.photos/id/${i + 100}/1080/${Math.round(1080 / aspectRatio)}`,
        small: `https://picsum.photos/id/${i + 100}/400/${Math.round(400 / aspectRatio)}`,
        thumb: `https://picsum.photos/id/${i + 100}/200/${Math.round(200 / aspectRatio)}`,
      },
      blurHash,
      alt: `Beautiful photo ${i + 1}`,
      user: {
        id: `user-${i % 10}`,
        name: `Photographer ${i % 10}`,
        username: `photo${i % 10}`,
        profileImage: `https://i.pravatar.cc/150?img=${i % 10}`,
      },
      likes: Math.floor(Math.random() * 1000),
      downloads: Math.floor(Math.random() * 500),
      color,
    });
  }
  
  return images;
};
