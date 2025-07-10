import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import axios from 'axios';

// Validation schema
const RegisterSchema = Yup.object().shape({
  full_name: Yup.string().required('Full name is required'),
  contact_type: Yup.string().required('Contact type is required').oneOf(['email', 'phone']),
  email: Yup.string().when('contact_type', {
    is: (val: string) => val === 'email',
    then: () => Yup.string().email('Invalid email').required('Email is required'),
    otherwise: () => Yup.string().email('Invalid email').notRequired(),
  }),
  phone_number: Yup.string().when('contact_type', {
    is: (val: string) => val === 'phone',
    then: () => Yup.string().matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').required('Phone number is required'),
    otherwise: () => Yup.string().notRequired(),
  }),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
    .required('Password is required'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

interface RegisterFormValues {
  full_name: string;
  contact_type: 'email' | 'phone';
  email: string;
  phone_number: string;
  password: string;
  confirm_password: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  
  // Initial form values
  const initialValues: RegisterFormValues = {
    full_name: '',
    contact_type: 'email',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  };
  
  // Handle form submission
  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      setIsSubmitting(true);
      setRegistrationError(null);
      
      // Prepare registration data
      const registrationData = {
        full_name: values.full_name,
        email: values.contact_type === 'email' ? values.email : undefined,
        phone_number: values.contact_type === 'phone' ? values.phone_number : undefined,
        password: values.password,
        confirm_password: values.confirm_password,
      };
      
      // Register user directly with API
      const registerResponse = await axios.post('/auth/register', registrationData);
      
      // Show success message
      toast.success('Registration successful! Verifying your account...');
      
      // Get the contact value based on contact type
      const contact = values.contact_type === 'email' ? values.email : values.phone_number;
      
      // Navigate to OTP verification page with contact info
      navigate('/otp-verification', { 
        state: { 
          contact,
          contactType: values.contact_type 
        } 
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      setRegistrationError(
        error.response?.data?.detail || 
        'Registration failed. Please check your information and try again.'
      );
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Password strength indicator
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: 'No password', color: 'bg-gray-200' };
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    
    const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    
    return {
      strength,
      label: strengthLabels[strength - 1] || 'Very weak',
      color: strengthColors[strength - 1] || 'bg-red-500'
    };
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        {registrationError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{registrationError}</p>
              </div>
            </div>
          </div>
        )}
        
        <Formik
          initialValues={initialValues}
          validationSchema={RegisterSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue, handleBlur }) => (
            <Form className="mt-8 space-y-6">
              <div className="rounded-md shadow-sm -space-y-px">
                <div className="mb-4">
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <Field
                    id="full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                      errors.full_name && touched.full_name
                        ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                    } text-gray-900 focus:outline-none focus:z-10 sm:text-sm`}
                    placeholder="Full name"
                  />
                  <ErrorMessage
                    name="full_name"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Method
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="contact_type"
                        value="email"
                        checked={values.contact_type === 'email'}
                        onChange={() => setFieldValue('contact_type', 'email')}
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
                        onChange={() => setFieldValue('contact_type', 'phone')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Phone</span>
                    </label>
                  </div>
                </div>
                
                {values.contact_type === 'email' ? (
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                        errors.email && touched.email
                          ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                      } text-gray-900 focus:outline-none focus:z-10 sm:text-sm`}
                      placeholder="Email address"
                    />
                    <ErrorMessage
                      name="email"
                      component="div"
                      className="text-red-500 text-xs mt-1"
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <Field
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      autoComplete="tel"
                      className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                        errors.phone_number && touched.phone_number
                          ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                      } text-gray-900 focus:outline-none focus:z-10 sm:text-sm`}
                      placeholder="Phone number (with country code)"
                    />
                    <ErrorMessage
                      name="phone_number"
                      component="div"
                      className="text-red-500 text-xs mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: +[country code][number], e.g., +12025550123
                    </p>
                  </div>
                )}
                
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                      errors.password && touched.password
                        ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                      } text-gray-900 focus:outline-none focus:z-10 sm:text-sm`}
                    placeholder="Password"
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                  
                  {/* Password strength indicator */}
                  {values.password && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-600 mb-1">
                        Password strength: {getPasswordStrength(values.password).label}
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getPasswordStrength(values.password).color}`} 
                          style={{ width: `${(getPasswordStrength(values.password).strength / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <Field
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                      errors.confirm_password && touched.confirm_password
                        ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                    } text-gray-900 focus:outline-none focus:z-10 sm:text-sm`}
                    placeholder="Confirm password"
                  />
                  <ErrorMessage
                    name="confirm_password"
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
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
              
              <div className="text-center text-sm">
                <p>
                  By signing up, you agree to our{' '}
                  <Link to="#" className="font-medium text-primary-600 hover:text-primary-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="#" className="font-medium text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Register; 