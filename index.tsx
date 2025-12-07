import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Add this if you have a CSS file

// Remove the window.process polyfill - Vite handles this differently
// This was causing conflicts with Vite's environment variable system

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: 20, 
          backgroundColor: '#000', 
          color: '#D4AF37', 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            News Pulse AI Encountered an Error
          </h1>
          <p style={{ marginBottom: '1rem' }}>Please try refreshing the page.</p>
          <pre style={{ 
            color: '#666', 
            fontSize: '12px', 
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#111',
            borderRadius: '4px',
            maxWidth: '90vw',
            overflow: 'auto'
          }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Check if we're in a browser environment
const canRender = typeof window !== 'undefined';

if (canRender) {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    // Create a fallback if root element doesn't exist
    const fallbackDiv = document.createElement('div');
    fallbackDiv.innerHTML = `
      <div style="
        padding: 40px; 
        background: #000; 
        color: #D4AF37; 
        height: 100vh; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center;
        font-family: Inter, sans-serif;
        text-align: center;
      ">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">News Pulse AI</h1>
        <p>Unable to find root element. Please check your HTML.</p>
      </div>
    `;
    document.body.appendChild(fallbackDiv);
  } else {
    try {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.StrictMode>
      );
    } catch (error) {
      console.error('Failed to render React app:', error);
      rootElement.innerHTML = `
        <div style="
          padding: 40px; 
          background: #000; 
          color: #D4AF37; 
          height: 100vh; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center;
          font-family: Inter, sans-serif;
          text-align: center;
        ">
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">React Render Error</h1>
          <p>Failed to initialize application.</p>
          <pre style="margin-top: 20px; color: #666; font-size: 12px;">
            ${error instanceof Error ? error.message : 'Unknown error'}
          </pre>
        </div>
      `;
    }
  }
} else {
  // Server-side rendering fallback
  console.warn('React cannot render in non-browser environment');
}
