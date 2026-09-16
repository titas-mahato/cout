// cout Chat Client Configuration
// When you deploy your backend to Render.com, paste your live backend URL below:
const PRODUCTION_BACKEND_URL = "https://cout-backend.onrender.com"; 

window.COUT_CONFIG = {
  // If running locally, connect to the local server port.
  // When running on GitHub Pages or external domain, use PRODUCTION_BACKEND_URL.
  getServerUrl: function() {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:';
    
    if (isLocal && window.location.port) {
      return `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
    } else if (isLocal) {
      return 'http://localhost:3000';
    }

    // Return production Render URL
    return localStorage.getItem('cout_custom_server') || PRODUCTION_BACKEND_URL;
  }
};
