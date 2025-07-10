import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import axios from 'axios';

// Validation schema
const OtpSchema = Yup.object().shape({
  otp: Yup.string()
    .length(6, 'OTP must be exactly 6 digits')
    .matches(/^\d+$/, 'OTP must contain only digits')
    .required('OTP is required')
});

interface LocationState {
  contact: string;
  contactType: 'email' | 'phone';
}

const OtpVerification: React.FC = () => {
  const { verifyOtp, sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Get contact info from location state
  const { contact, contactType } = (location.state as LocationState) || {};
  
  // Redirect if no contact info
  useEffect(() => {
    if (!contact || !contactType) {
      toast.error('Missing contact information');
      navigate('/login');
    }
  }, [contact, contactType, navigate]);
  
  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendDisabled && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setResendDisabled(false);
    }
  }, [resendDisabled, countdown]);
  
  // Handle OTP digit input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(0);
    }
    
    if (!/^\d*$/.test(value)) {
      return;
    }
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);
    
    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits are filled
    if (newOtpDigits.every(digit => digit !== '') && newOtpDigits.join('').length === 6) {
      handleVerifyOtp(newOtpDigits.join(''));
    }
  };
  
  // Handle backspace key
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index] === '' && index > 0) {
        // Move to previous input when backspace is pressed on an empty input
        inputRefs.current[index - 1]?.focus();
      }
    }
  };
  
  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    if (!/^\d+$/.test(pastedData)) {
      return;
    }
    
    const digits = pastedData.slice(0, 6).split('');
    const newOtpDigits = [...otpDigits];
    
    digits.forEach((digit, index) => {
      if (index < 6) {
        newOtpDigits[index] = digit;
      }
    });
    
    setOtpDigits(newOtpDigits);
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtpDigits.findIndex(digit => digit === '');
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
    
    // Auto-submit when all digits are filled
    if (newOtpDigits.every(digit => digit !== '') && newOtpDigits.join('').length === 6) {
      handleVerifyOtp(newOtpDigits.join(''));
    }
  };
  
  // Handle OTP verification
  const handleVerifyOtp = async (otpValue: string) => {
    try {
      setIsSubmitting(true);
      setVerificationError(null);
      
      // Call the verify OTP endpoint directly to get the token
      const response = await axios.post('/auth/verify-otp', {
        contact: contact,
        otp: otpValue
      });
      
      // If verification is successful and returns a token, store it
      if (response.data && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        
        // Set axios default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        toast.success('Account verified and logged in successfully!');
        navigate('/dashboard');
      } else {
        // Fall back to the original behavior if no token is returned
        await verifyOtp(contact, otpValue);
        toast.success('OTP verified successfully!');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setVerificationError(error.response?.data?.detail || 'OTP verification failed. Please try again.');
      toast.error(error.response?.data?.detail || 'OTP verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (values: { otp: string }) => {
    handleVerifyOtp(values.otp);
  };
  
  // Handle OTP resend
  const handleResendOtp = async () => {
    try {
      setVerificationError(null);
      await sendOtp(contact, contactType);
      setResendDisabled(true);
      setCountdown(120); // Reset countdown to 2 minutes
      toast.success(`OTP resent to your ${contactType}`);
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      setVerificationError(error.response?.data?.detail || 'Failed to resend OTP. Please try again.');
      toast.error(error.response?.data?.detail || 'Failed to resend OTP. Please try again.');
    }
  };
  
  // Format countdown time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Mask contact information for privacy
  const maskContact = (value: string, type: 'email' | 'phone'): string => {
    if (!value) return '';
    
    if (type === 'email') {
      const [username, domain] = value.split('@');
      if (!username || !domain) return value;
      
      const maskedUsername = username.length > 2 
        ? `${username.substring(0, 2)}${'*'.repeat(username.length - 2)}`
        : username;
      
      return `${maskedUsername}@${domain}`;
    } else {
      // Phone number
      return value.length > 4
        ? `${'*'.repeat(value.length - 4)}${value.substring(value.length - 4)}`
        : value;
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify your {contactType}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a 6-digit OTP to <span className="font-medium">{maskContact(contact, contactType)}</span>
          </p>
        </div>
        
        {verificationError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{verificationError}</p>
              </div>
            </div>
          </div>
        )}
        
        <Formik
          initialValues={{ otp: otpDigits.join('') }}
          validationSchema={OtpSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ errors, touched, setFieldValue }) => (
            <Form className="mt-8 space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Enter verification code
                </label>
                
                {/* Hidden field for form validation */}
                <Field
                  id="otp"
                  name="otp"
                  type="hidden"
                  value={otpDigits.join('')}
                />
                
                {/* OTP input boxes */}
                <div className="flex justify-between mt-2 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={otpDigits[index]}
                      onChange={(e) => {
                        handleOtpChange(index, e.target.value);
                        setFieldValue('otp', otpDigits.join(''));
                      }}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className={`w-12 h-12 text-center text-xl font-semibold border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                        errors.otp && touched.otp
                          ? 'border-red-300 text-red-900'
                          : 'border-gray-300 text-gray-900'
                      }`}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
                
                <ErrorMessage
                  name="otp"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || otpDigits.some(digit => digit === '')}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?
                </p>
                {resendDisabled ? (
                  <p className="text-sm text-gray-500">
                    Resend code in {formatTime(countdown)}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default OtpVerification; 