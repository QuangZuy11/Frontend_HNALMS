import api from './api'

import type { ProfileResponse, LoginResponse } from '../types/auth.types'

export const authService = {
    // Login - Backend expects username and password
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await api.post('/auth/login', { 
            username: email,  // Use email as username
            password: password 
        })
        return response.data
    },

    // Register - Create new account
    register: async (data: {
        username: string;
        phoneNumber: string;
        email: string;
        password: string;
        role: string;
    }): Promise<LoginResponse> => {
        const response = await api.post('/auth/register', data)
        return response.data
    },

    // Change Password - Backend expects oldPassword and newPassword
    changePassword: async (data: {
        currentPassword: string;
        newPassword: string;
    }) => {
        const payload = {
            oldPassword: data.currentPassword,
            newPassword: data.newPassword,
        };
        const response = await api.post('/auth/change-password', payload);
        return response.data;
    },

    // Logout
    logout: async () => {
        const response = await api.post('/auth/logout')
        return response.data
    },

    // Forgot Password
    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/forgot-password', { email })
        return response.data
    },

    // Get Profile
    getProfile: async (): Promise<ProfileResponse> => {
        const response = await api.get('/auth/me')
        return response.data
    },

    // Update Profile - Backend expects cccd, dob, gender fields
    updateProfile: async (profileData: {
        fullname?: string | null;
        cccd?: string | null;
        address?: string | null;
        dob?: string | null;
        gender?: 'male' | 'female' | 'other' | null;
    }): Promise<ProfileResponse> => {
        const response = await api.put('/auth/profile', profileData)
        return response.data
    },

    // Test database connection
    testDB: async () => {
        const response = await api.get('/test-db')
        return response.data
    }
}
