import Link from 'next/link'

const Agenda47 = () => {
  return (
    <section className="pt-32 pb-20 bg-trump-light-primary text-trump-light-navy relative">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundRepeat: 'repeat',
        }}
      ></div>

      <div className="container mx-auto px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="lg:w-3/5">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-black md:leading-tight">
            VISION2027 FUTURE-PROOF FUNYULA PLATFORM
            </h2>
            <p className="text-base md:text-lg mb-6 text-gray-700 leading-relaxed">
            Funyula needs determined and visionary leadership at every level of its Wards to address the poverty and backwardness that pose threats to our very survival: Our poor-performing Educational Institutions, our non-functional Healthcare facilities, poorly maintained and neglected Infrastructure, rising unemployment, inadequate Water supply, constant Electricity blackouts, the Security of Samia, and much more.
            </p>
            <p className="text-base md:text-lg mb-8 text-gray-700 leading-relaxed">
            To make clear that commitment, my proposal offers the Samia people the 2027 Future-Proof Funyula Platform to Make Funyula Constituency sustainable, and restore the fabric of our glorious Samia! It is a vision that begins with the following nine focus points that I will accomplish very quickly post the 2027 election win. I will collaborate with professionals from the community, respected elder statesmen and women of Samia, and both elected and appointed officials, including Permanent Secretaries (PSs), Principal Secretaries (PSs), Provincial Commissioners (PCs), Deputy County Commissioners (DCs), District Officers (DOs), Members of Parliament (MPs), Members of County Assembly (MCAs), Councillors, and Chiefs from the Constituency.
            </p>
            <Link
              href="/platform"
              className="inline-flex items-center border border-trump-light-accent text-trump-light-accent hover:bg-trump-light-accent hover:text-white px-8 py-3 uppercase font-bold transition-colors"
            >
              <span>PLATFORM</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </Link>
          </div>
          <div className="lg:w-1/2">
            <img
              src="https://vqj.umo.mybluehost.me/website_6d79077b/wp-content/uploads/2025/03/platform.jpg"
              alt="Funyula Constituency"
              className="w-full h-auto rounded-md shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Red divider */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-trump-light-accent"></div>
    </section>
  );
};

export default Agenda47;
