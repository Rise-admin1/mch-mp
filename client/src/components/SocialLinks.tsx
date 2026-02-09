import Image from 'next/image'

const SocialLinks = () => {
  const socialLinks = [
    { id: 'twitter', name: 'X (Twitter)', icon: '/images/twitter.png', url: 'https://www.youtube.com/@Funyula2027' },
    { id: 'tiktok', name: 'TikTok', icon: '/images/tiktok.png', url: 'https://www.youtube.com/@Funyula2027' },
    { id: 'facebook', name: 'Facebook', icon: '/images/facebook.png', url: 'https://www.youtube.com/@Funyula2027' },
    { id: 'instagram', name: 'Instagram', icon: '/images/instagram.png', url: 'https://www.youtube.com/@Funyula2027' },
    { id: 'youtube', name: 'YouTube', icon: '/images/youtube.png', url: 'https://www.youtube.com/@Funyula2027' },
  ];

  return (
    <section className="py-10 bg-white border-t border-gray-200 relative">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center gap-8 md:gap-12">
          {socialLinks.map((social) => (
            <a
              key={social.id}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.name}
              className="transform transition-transform hover:scale-110 block relative h-8 w-8"
            >
              <Image
                src={social.icon}
                alt={social.name}
                fill
                className="object-contain"
                sizes="32px"
              />
            </a>
          ))}
        </div>
      </div>

      {/* Bottom red line */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-trump-light-accent mt-6"></div>
    </section>
  );
};

export default SocialLinks;
