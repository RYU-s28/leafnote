import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unknown runtime error',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: 720, width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>LeafNote failed to render</h1>
            <p style={{ marginTop: 12, color: '#374151' }}>Open browser console for full stack trace. Runtime error:</p>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f9fafb', borderRadius: 8, padding: 12, border: '1px solid #e5e7eb' }}>{this.state.message}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
)
