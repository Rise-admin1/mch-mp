'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ProductShowcase = () => {
  const router = useRouter()
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = [
    {
      id: 1,
      name: '',
      image: 'https://funyula.s3.ap-south-1.amazonaws.com/funyula-images/image_1.jpeg',
      url: ''
    },
    {
      id: 2,
      name: '',
      image: 'https://funyula.s3.ap-south-1.amazonaws.com/funyula-images/image_2.jpeg',
      url: ''
    },
    {
      id: 3,
      name: '',
      image: 'https://funyula.s3.ap-south-1.amazonaws.com/funyula-images/image_3.jpeg',
      url: ''
    },
    
  ];

  const videos = [
    {
      id: 1,
      title: 'Samia Women Business Expo (SWOBE #1)',
      youtubeId: 'g-Jgsgpvsek',
      thumbnail: `https://d177n02wywg7h2.cloudfront.net/funyula-images/mqdefault_6s.webp`
    },
    {
      id: 2,
      title: 'Samia Women Business Expo (SWOBE #2)',
      youtubeId: '8NPHTbvtScM',
      thumbnail: `https://d177n02wywg7h2.cloudfront.net/funyula-images/mqdefault_6s1.webp`
    },
    {
      id: 3,
      title: 'Samia Women Business Expo (SWOBE #3)',
      youtubeId: '3SjiyLNJ4zE',
      thumbnail: `https://d177n02wywg7h2.cloudfront.net/funyula-images/mqdefault_6s2.webp`
    },
    {
      id: 4,
      title: 'Campaign Rally Highlights',
      youtubeId: 'AZot_17N5ho',
      thumbnail: `https://dubaianalytica.com/wp-content/uploads/2025/03/98_1.4.1.jpg`
    },
    {
      id: 5,
      title: 'Policy Speech Clip',
      youtubeId: 'unqIDomyhI4',
      thumbnail: `https://dubaianalytica.com/wp-content/uploads/2025/03/10_1.6.2.jpg`
    },
    {
      id: 6,
      title: 'Campaign Commercial',
      youtubeId: 'zoWirgI4Jkg',
      thumbnail: `https://dubaianalytica.com/wp-content/uploads/2025/03/platform.jpg`
    },
    {
      id: 7,
      title: 'Campaign Commercial',
      youtubeId: 'aqj36JUZuy4',
      thumbnail: `https://d177n02wywg7h2.cloudfront.net/funyula-images/20250416_013911000_iOS.jpg`
    },
    {
      id: 8,
      title: 'Campaign Commercial',
      youtubeId: '1f9Z9llnVvw',
      thumbnail: `https://d177n02wywg7h2.cloudfront.net/funyula-images/20250416_145500000_iOS.jpg`
    },
    {
      id: 9,
      title: 'Campaign Commercial',
      youtubeId: 'ONE_NcJZqCc',
      thumbnail: `https://d177n02wywg7h2.cloudfront.net/funyula-images/20250416_145509000_iOS.jpg`
    },
    {
      id: 10,
      title: 'Campaign Commercial',
      youtubeId: 'gz-pnHsCoFg',
      thumbnail: `https://d177n02wywg7h2.cloudfront.net/funyula-images/20250416_145512000_iOS.jpg`
    },
    
  ];

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      (prevIndex + 1) % images.length
    );
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };
  
  // Auto-advance the slider every 5 seconds
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     handleNextImage();
  //   }, 5000);
    
  //   return () => clearInterval(interval);
  // }, []);
  
  // Mock navigate function
  // const navigate = (path) => {
  //   console.log(`Navigating to: ${path}`);
  // };

  return (
    <div className="container  bg-gray-100 flex items-center justify-center ">
      <div className="w-full  bg-white shadow-2xl rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side - Images */}
        <div className="bg-gray-50 p-8 flex flex-col justify-between">
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Media
        </h2>

        {/* Image Slider with Navigation Arrows */}
        <div className="relative w-full h-96 rounded-xl shadow-lg">
          {/* Left Arrow */}
          <button 
            onClick={handlePrevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          {/* Image Container */}
          <div className="relative w-full h-full overflow-hidden rounded-xl">
            <div
              className="absolute w-full h-full flex transition-transform duration-500"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {images.map((item) => (
                <div key={item.id} className="w-full h-full flex-shrink-0">
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Arrow */}
          <button 
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Item Details */}
        <div className="text-center mt-4">
          <h3 className="text-lg font-semibold text-gray-700">
            {images[currentImageIndex].name}
          </h3>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center space-x-2 mt-4">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentImageIndex 
                ? 'bg-red-600' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="mt-8">
        <button 
          onClick={() => {
            router.push('/gallery')
            window.scrollTo(0, 0)
          }}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-bold uppercase 
          tracking-wider hover:bg-red-700 transition-colors shadow-md"
        >
          See More
        </button>
      </div>
    </div>

        {/* Right Side - YouTube Videos */}
        <div className="bg-gray-100 p-8">
          {/* <h2 className="text-3xl font-bold text-gray-800 mb-6">Campaign Media</h2> */}

          {/* Large Active YouTube Video */}
          <div className="mb-6 relative">
            <div className="bg-white  shadow-lg overflow-hidden h-full">
              <div className="aspect-w-16 aspect-h-9 h-96">
                <iframe
                  src={`https://www.youtube.com/embed/${videos[activeVideoIndex].youtubeId}?autoplay=0&modestbranding=1&rel=0`}
                  title={videos[activeVideoIndex].title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>
          </div>

          {/* Video Thumbnails */}
          <div className="grid grid-cols-3 gap-4">
            {videos.map((video, index) => (
              <button
                key={video.id}
                onClick={() => setActiveVideoIndex(index)}
                className={`rounded-lg overflow-hidden transform transition-all 
                  ${activeVideoIndex === index
                    ? 'scale-105 border-2 border-red-600 shadow-lg'
                    : 'hover:scale-105 opacity-70 hover:opacity-100'
                  }`}
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-24 object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductShowcase;