import api from './api'

import type { ProfileResponse } from '../types/auth.types'

export const authService = {
    // Login
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password })
        return response.data
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

    // Update Profile
    updateProfile: async (profileData: {
        fullname?: string | null;
        citizen_id?: string | null;
        permanent_address?: string | null;
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
