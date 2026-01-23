import api from './api'

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

    // Test database connection
    testDB: async () => {
        const response = await api.get('/test-db')
        return response.data
    }
}
