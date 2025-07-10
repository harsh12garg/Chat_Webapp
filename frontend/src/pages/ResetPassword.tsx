import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

// Validation schema
const ResetPasswordSchema = Yup.object().shape({
  otp: Yup.string()
    .length(6, 'OTP must be exactly 6 digits')
    .matches(/^\d+$/, 'OTP must contain only digits')
    .required('OTP is required'),
  new_password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('New password is required'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('new_password')], 'Passwords must match')
    .required('Confirm password is required'),
});

interface LocationState {
  contact: string;
  contactType: 'email' | 'phone';
}

const ResetPassword: React.FC = () => {
  const { resetPassword, sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minutes
  
  // Get contact info from location state
  const { contact, contactType } = (location.state as LocationState) || {};
  
  // Redirect if no contact info
  useEffect(() => {
    if (!contact || !contactType) {
      toast.error('Missing contact information');
      navigate('/forgot-password');
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
  
  // Handle form submission
  const handleSubmit = async (values: { otp: string; new_password: string; confirm_password: string }) => {
    try {
      setIsSubmitting(true);
      await resetPassword(contact, values.otp, values.new_password, values.confirm_password);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle OTP resend
  const handleResendOtp = async () => {
    try {
      await sendOtp(contact, contactType);
      setResendDisabled(true);
      setCountdown(120); // Reset countdown to 2 minutes
      toast.success(`OTP resent to your ${contactType}`);
    } catch (error) {
      console.error('Error resending OTP:', error);
    }
  };
  
  // Format countdown time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the OTP sent to {contact} and your new password
          </p>
        </div>
        
        <Formik
          initialValues={{
            otp: '',
            new_password: '',
            confirm_password: '',
          }}
          validationSchema={ResetPasswordSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched }) => (
            <Form className="mt-8 space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Enter OTP
                </label>
                <Field
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                    errors.otp && touched.otp
                      ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                  } rounded-md shadow-sm focus:outline-none sm:text-sm text-center tracking-widest`}
                  placeholder="123456"
                />
                <ErrorMessage
                  name="otp"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>
              
              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <Field
                  id="new_password"
                  name="new_password"
                  type="password"
                  className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                    errors.new_password && touched.new_password
                      ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                  } rounded-md shadow-sm focus:outline-none sm:text-sm`}
                  placeholder="New password"
                />
                <ErrorMessage
                  name="new_password"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>
              
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <Field
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                    errors.confirm_password && touched.confirm_password
                      ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                  } rounded-md shadow-sm focus:outline-none sm:text-sm`}
                  placeholder="Confirm password"
                />
                <ErrorMessage
                  name="confirm_password"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the OTP?
                </p>
                {resendDisabled ? (
                  <p className="text-sm text-gray-500">
                    Resend OTP in {formatTime(countdown)}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
              
              <div className="text-center">
                <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  Back to login
                </Link>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default ResetPassword; 