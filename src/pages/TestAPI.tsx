// Test API page
import { useState } from 'react'

function TestAPI() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const testAPI = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/test-db')
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const result = await response.json()
            setData(result)
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Test API: http://localhost:9999/test-db</h1>

            <button
                onClick={testAPI}
                style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    backgroundColor: '#646cff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}
                disabled={loading}
            >
                {loading ? 'Loading...' : 'Test API'}
            </button>

            {error && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {data && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    borderRadius: '5px'
                }}>
                    <h3>Response Data:</h3>
                    <pre style={{
                        backgroundColor: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '5px',
                        overflow: 'auto',
                        color: '#000'
                    }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}

export default TestAPI
