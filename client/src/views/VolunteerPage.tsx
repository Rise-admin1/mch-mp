'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { setupRecaptcha } from '../utils/firebase'
import { BACKEND_URL } from '../utils/ipUrl'

const VolunteerPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    subLocation: '',
    message: '',
    privacyPolicy: false
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  useEffect(() => {
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
      try {
        recaptchaVerifierRef.current = setupRecaptcha('volunteer-recaptcha-container');
        recaptchaVerifierRef.current.render().then(() => {
          console.log('Volunteer reCAPTCHA rendered');
        });
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
      }
    }
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  // Validation functions
  const validateField = (name: string, value: string | boolean): string => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        return value.toString().trim().length < 2 ? `${name === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters` : '';
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value.toString()) ? 'Please enter a valid email address' : '';
      case 'phone':
        const phoneRegex = /^[0-9+\-\s()]+$/;
        return !phoneRegex.test(value.toString()) || value.toString().trim().length < 10 ? 'Please enter a valid phone number' : '';
      case 'location':
      case 'subLocation':
        return value.toString().trim().length < 2 ? `${name === 'location' ? 'Location' : 'Sub Location'} must be at least 2 characters` : '';
      case 'privacyPolicy':
        return !value ? 'You must agree to the privacy policy' : '';
      default:
        return '';
    }
  };

  const validateAllFields = (): boolean => {
    const errors: {[key: string]: string} = {};
    let isValid = true;

    // Validate all required fields
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent resubmission if already submitting
    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    // Validate all fields
    if (!validateAllFields()) {
      setErrorMessage('Please fill in all required fields correctly');
      return;
    }
    
    setIsSubmitting(true);
    
    try { 
      const sendVolunteerResponse = await axios.post(`${BACKEND_URL}/api/volunteer/submit`, formData);
      setSuccessMessage(sendVolunteerResponse.data.message);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: '',
        subLocation: '',
        message: '',
        privacyPolicy: false
      });
    } catch(error) {
      setErrorMessage('An error occurred, please try again later');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-['Montserrat',sans-serif] text-gray-800">
      {/* Hero section with background */}
      <div className="relative">
        <div className="relative w-full h-[300px] sm:h-[400px] bg-cover bg-center" style={{ backgroundImage: `url(https://dubaianalytica.com/wp-content/uploads/2025/03/get_involved.jpg)` }}>
          <div className="absolute bg-[#d61936] text-white text-center py-4 sm:py-8 px-4 left-0 right-0 top-[230px] sm:top-80 w-11/12 sm:w-3/5 mx-auto">
            <h2 className="text-2xl sm:text-4xl font-bold mb-2">SIGN UP TO JOIN VOLUNTEERS LIKE YOU!</h2>
            <h3 className="text-xl sm:text-2xl font-bold">HELP HON. MUGENYA RESTORE THE LOST GLORY OF SAMIA!</h3>
          </div>
        </div>
      </div>

      {/* Form section */}
      <div className="max-w-5xl mx-auto px-4 pt-24 sm:pt-32 pb-10">
        <p className="text-sm sm:text-base mb-8 mt-16 md:mt-0">
        The forgotten people of Samia are the heart and soul of our great community. The only force strong enough to revive our struggling economy, restore dignity to our schools and hospitals, and secure a better future is you, the people of this land. To reclaim what we have lost and restore the fabric of our glorious Samia, and build a thriving, self-reliant Funyula constituency, we need every farmer, every youth, every family to stand together, demand change, and make their voices heard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                name="firstName"
                placeholder="FIRST NAME *"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                  fieldErrors.firstName 
                    ? 'border-red-500 focus:ring-red-300' 
                    : 'border-gray-300 focus:ring-gray-300'
                } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {fieldErrors.firstName && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="lastName"
                placeholder="LAST NAME *"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                  fieldErrors.lastName 
                    ? 'border-red-500 focus:ring-red-300' 
                    : 'border-gray-300 focus:ring-gray-300'
                } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {fieldErrors.lastName && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.lastName}</p>
              )}
            </div>
            <div>
              <input
                type="email"
                name="email"
                placeholder="EMAIL *"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                  fieldErrors.email 
                    ? 'border-red-500 focus:ring-red-300' 
                    : 'border-gray-300 focus:ring-gray-300'
                } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="tel"
                name="phone"
                placeholder="PHONE *"
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                  fieldErrors.phone 
                    ? 'border-red-500 focus:ring-red-300' 
                    : 'border-gray-300 focus:ring-gray-300'
                } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {fieldErrors.phone && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.phone}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="location"
                placeholder="Location *"
                value={formData.location}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                  fieldErrors.location 
                    ? 'border-red-500 focus:ring-red-300' 
                    : 'border-gray-300 focus:ring-gray-300'
                } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {fieldErrors.location && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.location}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="subLocation"
                placeholder="Sub Location *"
                value={formData.subLocation}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                  fieldErrors.subLocation 
                    ? 'border-red-500 focus:ring-red-300' 
                    : 'border-gray-300 focus:ring-gray-300'
                } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {fieldErrors.subLocation && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.subLocation}</p>
              )}
            </div>
          </div>

          <div>
            <textarea
              name="message"
              placeholder="MESSAGE"
              value={formData.message}
              onChange={handleChange}
              rows={5}
              disabled={isSubmitting}
              className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                'border-gray-300 focus:ring-gray-300'
              } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            ></textarea>
          </div>

          <div>
            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                name="privacyPolicy"
                checked={formData.privacyPolicy}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={`mt-1 ${isSubmitting ? 'cursor-not-allowed' : ''}`}
              />
              <span className={`text-sm sm:text-base ${isSubmitting ? 'text-gray-500' : ''}`}>
                By providing this information you are acknowledging and agreeing to the{' '}
                <a href="#" className="text-[#d61936] font-bold">PRIVACY POLICY</a>
              </span>
            </label>
            {fieldErrors.privacyPolicy && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.privacyPolicy}</p>
            )}
          </div>

          <div className="flex flex-col items-start">
            <div id="volunteer-recaptcha-container" ref={recaptchaContainerRef} className="mb-4"></div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white font-bold py-3 sm:py-4 flex items-center justify-center text-sm sm:text-base transition-all ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#d61936] hover:bg-[#b01529]'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                SUBMITTING...
              </>
            ) : (
              <>
                <span className="mr-2">SUBMIT</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* <p className="text-center text-[#d61936] font-bold text-sm sm:text-lg mt-6">
        Don't want to fill out the form? Text "Volunteer" to TEXTCODE
        </p> */}

        <p className="text-xs sm:text-sm text-gray-600 mt-6">
        By providing your phone number, you are consenting to receive calls and recurring SMS messages or texts, to that number from each of the participating committees in Mugenya's 2027 Committee. Msg & data rates may apply. Terms & conditions/privacy policy apply
        </p>
      </div>

      {/* Donate Section */}
      <div className="bg-[#263a66] text-white text-center py-12">
        <h2 className="text-2xl sm:text-4xl font-bold">Donate</h2>
        <div className="w-12 h-1 bg-[#d61936] mx-auto mt-4"></div>
      </div>
    </div>
  );
};

export default VolunteerPage;