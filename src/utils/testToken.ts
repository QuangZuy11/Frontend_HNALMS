// Utility to test token validity
// Run this in browser console: testToken()

export const testToken = async () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('=== Token Debug Info ===');
    console.log('Token exists:', !!token);
    console.log('Token length:', token?.length);
    console.log('Token preview:', token?.substring(0, 50) + '...');
    console.log('User object:', user ? JSON.parse(user) : null);
    
    if (!token) {
        console.error('❌ No token found in localStorage');
        return;
    }
    
    // Test API call
    try {
        const response = await fetch('http://localhost:9999/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.trim()}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API Response Status:', response.status);
        const data = await response.json();
        console.log('API Response Data:', data);
        
        if (response.ok) {
            console.log('✅ Token is valid!');
        } else {
            console.error('❌ Token is invalid:', data.message);
        }
    } catch (error) {
        console.error('❌ API call failed:', error);
    }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
    (window as any).testToken = testToken;
}
