import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

// Validation schema
const ForgotPasswordSchema = Yup.object().shape({
  contact_type: Yup.string().required('Contact type is required').oneOf(['email', 'phone']),
  contact: Yup.string().when('contact_type', {
    is: (val: string) => val === 'email',
    then: () => Yup.string().email('Invalid email').required('Email is required'),
    otherwise: () => Yup.string().matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').required('Phone number is required'),
  }),
});

const ForgotPassword: React.FC = () => {
  const { sendOtp } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle form submission
  const handleSubmit = async (values: { contact_type: 'email' | 'phone'; contact: string }) => {
    try {
      setIsSubmitting(true);
      await sendOtp(values.contact, values.contact_type);
      toast.success(`OTP sent to your ${values.contact_type}`);
      
      // Navigate to reset password page
      navigate('/reset-password', { 
        state: { 
          contact: values.contact,
          contactType: values.contact_type 
        } 
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email or phone number to receive a verification code
          </p>
        </div>
        
        <Formik
          initialValues={{
            contact_type: 'email',
            contact: '',
          }}
          validationSchema={ForgotPasswordSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue }) => (
            <Form className="mt-8 space-y-6">
              <div className="rounded-md shadow-sm -space-y-px">
                <div className="py-4">
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="contact_type"
                        value="email"
                        checked={values.contact_type === 'email'}
                        onChange={() => {
                          setFieldValue('contact_type', 'email');
                          setFieldValue('contact', '');
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Email</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="contact_type"
                        value="phone"
                        checked={values.contact_type === 'phone'}
                        onChange={() => {
                          setFieldValue('contact_type', 'phone');
                          setFieldValue('contact', '');
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Phone</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="contact" className="sr-only">
                    {values.contact_type === 'email' ? 'Email address' : 'Phone number'}
                  </label>
                  <Field
                    id="contact"
                    name="contact"
                    type={values.contact_type === 'email' ? 'email' : 'tel'}
                    autoComplete={values.contact_type === 'email' ? 'email' : 'tel'}
                    className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                      errors.contact && touched.contact
                        ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                    } text-gray-900 focus:outline-none focus:z-10 sm:text-sm`}
                    placeholder={values.contact_type === 'email' ? 'Email address' : 'Phone number (with country code)'}
                  />
                  <ErrorMessage
                    name="contact"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send verification code'}
                </button>
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

export default ForgotPassword; 