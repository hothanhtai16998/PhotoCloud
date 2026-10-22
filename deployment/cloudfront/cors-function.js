// CloudFront Function to add CORS headers dynamically
// This works on all CloudFront plans (including free tier)
// 
// How to use:
// 1. Go to CloudFront Console > Functions
// 2. Create a new function
// 3. Paste this code
// 4. Publish the function
// 5. Go to your distribution > Behaviors > Edit
// 6. Under "Function associations" > Viewer response, select your function

function handler(event) {
    var request = event.request;
    var response = event.response;
    var headers = response.headers;
    
    // Get the origin from the request
    var origin = request.headers.origin ? request.headers.origin.value : '*';
    
    // List of allowed origins
    var allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://uploadanh.cloud',
        'https://www.uploadanh.cloud',
        'https://photoapp-pgq4.onrender.com'
    ];
    
    // Check if origin is in allowed list, or allow all in development
    var allowOrigin = '*';
    if (origin && origin !== 'null') {
        // Check if it's a localhost origin (development)
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            allowOrigin = origin; // Echo back the origin for localhost
        } else if (allowedOrigins.includes(origin)) {
            allowOrigin = origin;
        }
    }
    
    // Add CORS headers
    headers['access-control-allow-origin'] = { value: allowOrigin };
    headers['access-control-allow-methods'] = { value: 'GET, HEAD, OPTIONS' };
    headers['access-control-allow-headers'] = { value: '*' };
    headers['access-control-max-age'] = { value: '3600' };
    
    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
        return {
            statusCode: 204,
            statusDescription: 'No Content',
            headers: headers
        };
    }
    
    return response;
}

