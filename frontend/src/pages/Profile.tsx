import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import axios from 'axios';
import Layout from '../components/Layout';

// Validation schema
const ProfileSchema = Yup.object().shape({
  full_name: Yup.string().max(255, 'Name is too long'),
});

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.profile_picture || null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Handle file selection for profile picture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle profile picture upload
  const handleUploadProfilePicture = async () => {
    if (!selectedFile) return;
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await axios.post('/api/users/me/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update user profile with new picture URL
      toast.success('Profile picture updated successfully!');
      setPreviewUrl(response.data.profile_picture);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle form submission for profile update
  const handleSubmit = async (values: { full_name: string }) => {
    try {
      setIsSubmitting(true);
      
      // Upload profile picture if selected
      if (selectedFile) {
        await handleUploadProfilePicture();
      }
      
      // Update user profile
      await updateProfile(values);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Profile Information
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Update your personal details and profile picture.
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center mb-6">
              <div className="mb-4 sm:mb-0 sm:mr-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={user.full_name || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 text-2xl font-medium">
                        {user.full_name?.[0] || user.email?.[0] || 'U'}
                      </span>
                    )}
                  </div>
                  
                  <label
                    htmlFor="profile-picture"
                    className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-1 cursor-pointer hover:bg-primary-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                  
                  <input
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleUploadProfilePicture}
                    disabled={isUploading}
                    className="mt-2 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Picture'}
                  </button>
                )}
              </div>
              
              <div className="flex-1 w-full">
                <Formik
                  initialValues={{
                    full_name: user.full_name || '',
                  }}
                  validationSchema={ProfileSchema}
                  onSubmit={handleSubmit}
                >
                  {({ isSubmitting: formSubmitting }) => (
                    <Form className="space-y-4">
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                          Full Name
                        </label>
                        <Field
                          id="full_name"
                          name="full_name"
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Your full name"
                        />
                        <ErrorMessage
                          name="full_name"
                          component="div"
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <div className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm">
                          {user.email || 'No email provided'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Phone Number
                        </label>
                        <div className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm">
                          {user.phone_number || 'No phone number provided'}
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={isSubmitting || formSubmitting}
                          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                          {isSubmitting || formSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile; 