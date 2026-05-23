import Link from 'next/link'

const Hero = () => {
  return (
    <div className="relative h-screen flex items-center justify-center bg-[url('https://vqj.umo.mybluehost.me/website_6d79077b/wp-content/uploads/2025/03/112_1.15.2.jpg')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="container relative z-10 
        md:absolute 
        md:bottom-30 
        md:right-[96px]
        px-4 
        xl:px-4 
        2xl:px-0
        mb-4 md:mb-48
      ">
        <div className="max-w-2xl
          3xl:mb-100
          px-4 
          xl:px-0
        ">
          <h1 className="text-3xl  md:text-4xl lg:text-5xl xl:text-5xl 2xl:text-[52px] 
            font-black md:font-extrabold  
            text-white 
            leading-tight
            mb-4 
            uppercase  
            text-left
            break-words
          ">
            "A NEW FUTURE FOR FUNYULA BEGINS<br/>RIGHT NOW."
          </h1>

          <p className="text-[1rem] sm:text-xl md:text-[16px] 
            font-semibold 
            text-white 
            mb-6 
            text-left
          ">
            MICHAEL H. MUGENYA, incoming Member of Parliament for Funyula Constituency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 
            justify-center 
            xl:justify-start
          ">
            <Link href="/contribute" className="btn-primary w-full sm:w-auto text-center max-w-[300px] mx-auto xl:mx-0">
              SUPPORT THE CAUSE
            </Link>
            <a
              href="/get-involved"
              className="border-2 
                border-white 
                text-white 
                hover:bg-white 
                hover:text-trump-light-navy 
                font-bold 
                py-3 
                px-6 
                uppercase 
                tracking-wider 
                transition-all 
                duration-200 
                w-full 
                sm:w-auto 
                text-center 
                max-w-[300px] 
                mx-auto 
                xl:mx-0
              "
            >
              GET INVOLVED
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
