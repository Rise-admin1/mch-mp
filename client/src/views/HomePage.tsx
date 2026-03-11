import Hero from '../components/Hero';
import AutoScrollBanner from '../components/AutoScrollBanner';
import SignupForm from '../components/SignupForm';
import Agenda47 from '../components/Agenda47';
import VideoSection from '../components/VideoSection';
import ProductsSection from '../components/ProductsSection';
import SocialLinks from '../components/SocialLinks';
import MerchPopup from '../components/MerchPopup';

const HomePage = () => {
  return (
    <div className="flex flex-col">
      {/* Autoscrolling banner at top */}
      <AutoScrollBanner />

      {/* Hero section first */}
      <div className="relative">
        <Hero />
      </div>

      {/* Signup form positioned to overlap hero slightly */}
      <div className="relative -mt-20 z-20">
        <SignupForm />
      </div>

      {/* Rest of the sections */}
      <div className="z-10 mt-0">
        <Agenda47 />
        {/* <VideoSection /> */}
        <ProductsSection />

      </div>

      {/* Popup appears above everything */}
      {/* <MerchPopup /> */}
    </div>
  );
};

export default HomePage;
