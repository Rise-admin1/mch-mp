'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { setupRecaptcha, sendVerificationCode, verifyCode } from '../utils/firebase'
import { BACKEND_URL } from '../utils/ipUrl'

interface SignupFormProps {
  variant?: 'default' | 'footer' | 'modal';
}

const SignupForm = ({ variant = 'default' }: SignupFormProps) => {
  const recaptchaId = `recaptcha-container-${variant}`;
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifyPhoneNumber, setVerifyPhoneNumber] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  // Initialize reCAPTCHA when component mounts
  useEffect(() => {
    // Clear any existing reCAPTCHA
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
      
      // Set up new reCAPTCHA
      try {
        recaptchaVerifierRef.current = setupRecaptcha(recaptchaId);
        console.log('reCAPTCHA initialized for', variant);
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
        setError('Failed to initialize verification. Please refresh the page and try again.');
      }
    }
    
    // Clean up on unmount
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Form submitted:', { fullName, location, subLocation, phoneNumber });
  
      // Format phone number to E.164 format (required by Firebase)
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
      
      console.log('Formatted phone number:', formattedPhoneNumber);
      
      if (!recaptchaVerifierRef.current) {
        throw new Error('Verification not initialized. Please refresh the page and try again.');
      }
      
      // Send verification code using Firebase
      console.log('Sending verification code to:', formattedPhoneNumber);
      const result = await sendVerificationCode(formattedPhoneNumber, recaptchaVerifierRef.current);
      console.log('result', result);
      
      setConfirmationResult(result);
      setVerifyPhoneNumber(true);
      setSuccessMessage(`Verification code sent to ${formattedPhoneNumber}. Please check your phone and enter the code below.`);
      
      console.log('Verification code sent successfully!');
      
      // Also send data to your backend
      const formData = {
        fullName,
        location,
        subLocation,
        phoneNumber: formattedPhoneNumber
      };
  
      // const response = await axios.post(`${BACKEND_URL}/api/volunteer/pdf`, formData);
     
    } 
    catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.message || 'An error occurred while submitting the form. Please try again later.');
      
      // Reset reCAPTCHA on error
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = setupRecaptcha(recaptchaId);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log('Verification code submitted:', verificationCode);
      
      if (!confirmationResult) {
        throw new Error('Verification session expired. Please try again.');
      }
      
      // Verify code using Firebase
      console.log('Verifying code...');
      const result = await verifyCode(confirmationResult, verificationCode);
      console.log('Code verified successfully!', result);
      
      // Also send verification to your backend
      const verificationData = {
        phoneNumber: formatPhoneNumber(phoneNumber),
        verificationCode,
        fullName,
        location,
        subLocation
      };
      
      setSuccessMessage('Verification successful! Redirecting...');
      
      const response = await axios.post(`${BACKEND_URL}/api/volunteer/pdf`, verificationData);

      if (response.status === 200) {
        if(response.data.pdf){
          window.open('https://fpfplatform.funyula.com/', '_blank');
        }else{
          alert(response.data.message);
        }

         
          
          // Reset all form fields after successful verification
          setFullName('');
          setLocation('');
          setSubLocation('');
          setPhoneNumber('');
          setVerificationCode('');
          setVerifyPhoneNumber(false);
          setConfirmationResult(null);
          setSuccessMessage(null);
      }
    }
    catch (error: any) {
      console.error('Error verifying code:', error);
      setError(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format phone number to E.164 format
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Always return with +254 prefix
    return `+254${cleaned}`;
  };

  const renderVerificationForm = () => (
    <form onSubmit={handleVerifyCode} className="mt-4 flex flex-col gap-4">
      <div className="text-center text-trump-light-navy font-medium">
        A verification code has been sent to your phone. Please enter it below.
      </div>
      <input
        type="text"
        placeholder="Enter 6-digit verification code"
        className="w-full px-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
        maxLength={6}
        pattern="[0-9]{6}"
        required
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {successMessage && (
        <div className="text-green-600 bg-green-50 p-3 rounded-lg text-center font-medium">
          {successMessage}
        </div>
      )}
      <button
        type="submit"
        className="w-full bg-trump-light-accent text-white py-3.5 px-6 rounded-lg transition-all hover:bg-trump-light-accent/90 hover:shadow-lg active:transform active:scale-[0.98] flex items-center justify-center gap-4 font-semibold text-base sm:text-lg"
        aria-label="Verify code"
        disabled={loading}
      >
        {loading ? 'VERIFYING...' : 'VERIFY CODE'}
      </button>
    </form>
  );

  if (variant === 'footer') {
    return (
      <div className="w-full max-w-md ">
        <form
          onSubmit={handleSubmit}
          className={`grid grid-cols-1 sm:grid-cols-2 gap-2 w-full ${verifyPhoneNumber ? 'hidden' : ''}`}
        >
          <input
            type="text"
            placeholder="Enter Your Full Name"
            className="w-full px-3 py-2 text-trump-light-navy focus:outline-none border border-gray-200 rounded"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Location"
            className="w-full px-3 py-2 text-trump-light-navy focus:outline-none border border-gray-200 rounded"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Sub Location"
            className="w-full px-3 py-2 text-trump-light-navy focus:outline-none border border-gray-200 rounded"
            value={subLocation}
            onChange={(e) => setSubLocation(e.target.value)}
            required
          />
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
              +254
            </div>
            <input
              type="tel"
              placeholder="Phone Number"
              className="w-full pl-12 pr-3 py-2 text-trump-light-navy focus:outline-none border border-gray-200 rounded"
              value={phoneNumber}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, '');
                setPhoneNumber(value);
              }}
              required
            />
          </div>
          <div id={recaptchaId} ref={recaptchaContainerRef} className="sm:col-span-2 flex justify-center my-2"></div>
          {error && <div className="text-red-500 text-sm sm:col-span-2">{error}</div>}
          {successMessage && (
            <div className="text-green-600 bg-green-50 p-3 rounded-lg text-center font-medium sm:col-span-2">
              {successMessage}
            </div>
          )}
          <button
            type="submit"
            className="sm:col-span-2 w-full bg-trump-light-accent text-white py-2 px-4 transition-colors hover:bg-trump-light-accent/90 flex items-center justify-center gap-2 rounded font-bold"
            aria-label="Download your copy"
            disabled={loading}
          >
            {loading ? 'SENDING...' : 'DOWNLOAD YOUR COPY'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>
        
        {verifyPhoneNumber && (
          <div className="w-full">
            <form onSubmit={handleVerifyCode} className="grid grid-cols-1 gap-2">
              <div className="col-span-1 text-center text-trump-light-navy text-sm mb-2">
                Enter the 6-digit verification code sent to your phone
              </div>
              <input
                type="text"
                placeholder="6-digit code"
                className="w-full px-3 py-2 text-trump-light-navy focus:outline-none border border-gray-200 rounded"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                maxLength={6}
                pattern="[0-9]{6}"
                required
              />
              {error && <div className="text-red-500 text-sm">{error}</div>}
              {successMessage && (
                <div className="text-green-600 bg-green-50 p-3 rounded-lg text-center font-medium">
                  {successMessage}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-trump-light-accent text-white py-2 px-4 transition-colors hover:bg-trump-light-accent/90 flex items-center justify-center gap-2 rounded"
                aria-label="Verify code"
                disabled={loading}
              >
                {loading ? 'VERIFYING...' : 'VERIFY CODE'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="flex flex-col lg:flex-row min-h-[600px]">
        {/* Left side - Form */}
        <div className="flex-1 bg-white">
          <div className="bg-trump-light-accent py-4 md:py-6">
            <div className="container mx-auto px-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white text-center mb-2">
                DOWNLOAD THE FUNYULA 2027 
              </h2>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-2">
               AND BEYOND MANIFESTO
              </h2>
            </div>
          </div>

          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {!verifyPhoneNumber ? (
              <form
                onSubmit={handleSubmit}
                className="max-w-xl mx-auto flex flex-col gap-4"
              >
                <input
                  type="text"
                  placeholder="Enter Your Full Name"
                  className="w-full px-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Location"
                  className="w-full px-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Sub Location"
                  className="w-full px-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
                  value={subLocation}
                  onChange={(e) => setSubLocation(e.target.value)}
                  required
                />
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
                    +254
                  </div>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full pl-14 pr-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
                    value={phoneNumber}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '');
                      setPhoneNumber(value);
                    }}
                    required
                  />
                </div>
                <div id={recaptchaId} ref={recaptchaContainerRef} className="flex justify-center my-2"></div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {successMessage && (
                  <div className="text-green-600 bg-green-50 p-3 rounded-lg text-center font-medium">
                    {successMessage}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-trump-light-accent text-white py-3.5 px-6 rounded-lg transition-all hover:bg-trump-light-accent/90 hover:shadow-lg active:transform active:scale-[0.98] flex items-center justify-center gap-4 font-semibold text-base sm:text-lg"
                  aria-label="Download your copy"
                  disabled={loading}
                >
                  {loading ? 'SENDING...' : 'DOWNLOAD YOUR COPY'}
                </button>
              </form>
            ) : (
              <div className="max-w-xl mx-auto">
                {renderVerificationForm()}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Image */}
        <div className="flex-1 bg-gradient-to-br from-trump-light-accent/10 to-trump-light-accent/20 flex items-center justify-center p-8">
          <div className="text-center">
            <img 
              src="https://d177n02wywg7h2.cloudfront.net/funyula-images/20250420_081646000_iOS.jpg" 
              alt="Hon. Michael Mugenya with community members" 
              className="w-full max-w-md mx-auto rounded-lg shadow-lg mb-6"
            />
            <h3 className="text-2xl font-bold text-trump-light-navy mb-4">
              Join the Movement
            </h3>
            <p className="text-trump-light-navy/80 text-lg leading-relaxed">
              Be part of the transformation of Funyula. Download the comprehensive manifesto and join thousands of supporters working towards a better future.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section 
      id="join-movement" 
      className="bg-white shadow-2xl border border-gray-200 rounded-sm w-full md:w-2/3 lg:w-1/2 xl:w-2/5 mx-auto md:mx-32 relative z-10 overflow-hidden"
    >
      <div className="bg-trump-light-accent py-4 md:py-6">
        <div className="container mx-auto px-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white text-center mb-2">
            DOWNLOAD THE FUNYULA 2027 
          </h2>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-2">
           AND BEYOND MANIFESTO
          </h2>
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        {!verifyPhoneNumber ? (
          <form
            onSubmit={handleSubmit}
            className="max-w-xl mx-auto flex flex-col gap-4"
          >
            <input
              type="text"
              placeholder="Enter Your Full Name"
              className="w-full px-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Location"
              className="w-full px-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Sub Location"
              className="w-full px-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
              value={subLocation}
              onChange={(e) => setSubLocation(e.target.value)}
              required
            />
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
                +254
              </div>
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full pl-14 pr-4 py-3 text-trump-light-navy bg-gray-50 focus:outline-none border border-gray-200 rounded-lg focus:border-trump-light-accent focus:ring-2 focus:ring-trump-light-accent/20 transition-all"
                value={phoneNumber}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '');
                  setPhoneNumber(value);
                }}
                required
              />
            </div>
            <div id={recaptchaId} ref={recaptchaContainerRef} className="flex justify-center my-2"></div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {successMessage && (
              <div className="text-green-600 bg-green-50 p-3 rounded-lg text-center font-medium">
                {successMessage}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-trump-light-accent text-white py-3.5 px-6 rounded-lg transition-all hover:bg-trump-light-accent/90 hover:shadow-lg active:transform active:scale-[0.98] flex items-center justify-center gap-4 font-semibold text-base sm:text-lg"
              aria-label="Download your copy"
              disabled={loading}
            >
              {loading ? 'SENDING...' : 'DOWNLOAD YOUR COPY'}
            </button>
          </form>
        ) : (
          <div className="max-w-xl mx-auto">
            {renderVerificationForm()}
          </div>
        )}
      </div>

      {/* Subtle shadow effect */}
      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-b from-transparent to-gray-100/50"></div>
    </section>
  );
};

export default SignupForm;