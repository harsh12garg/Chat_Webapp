import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

// Validation schema
const LoginSchema = Yup.object().shape({
  username: Yup.string().required('Email or phone number is required'),
  password: Yup.string().required('Password is required')
});

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle form submission
  const handleSubmit = async (values: { username: string; password: string }) => {
    try {
      setIsSubmitting(true);
      await login(values.username, values.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>
        
        <Formik
          initialValues={{ username: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched }) => (
            <Form className="mt-8 space-y-6">
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="username" className="sr-only">
                    Email or Phone Number
                  </label>
                  <Field
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                      errors.username && touched.username
                        ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                    } text-gray-900 rounded-t-md focus:outline-none focus:z-10 sm:text-sm`}
                    placeholder="Email or phone number"
                  />
                  <ErrorMessage
                    name="username"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                      errors.password && touched.password
                        ? 'border-red-300 placeholder-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500'
                    } text-gray-900 rounded-b-md focus:outline-none focus:z-10 sm:text-sm`}
                    placeholder="Password"
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Login; 