const http = require('http');

// Test timesheets/all endpoint
function testEndpoint(path, token, callback) {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const req = http.request(options, res => {
        let body = '';
        res.on('data', d => { body += d; });
        res.on('end', () => {
            console.log(`\n--- ${path} ---`);
            console.log(`Status: ${res.statusCode}`);
            try {
                const parsed = JSON.parse(body);
                console.log('Response:', JSON.stringify(parsed).substring(0, 200));
            } catch(e) {
                console.log('Raw body (first 300 chars):', body.substring(0, 300));
                console.log('JSON parse error:', e.message);
            }
            if (callback) callback();
        });
    });
    req.on('error', error => { console.error('Error:', error); });
    req.end();
}

// First get a token by logging in
const loginData = JSON.stringify({ email: 'admin@learnlike.in', password: 'admin123' });
const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
};

const loginReq = http.request(loginOptions, res => {
    let body = '';
    res.on('data', d => { body += d; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(body);
            console.log('Login status:', res.statusCode, parsed.status);
            const token = parsed.token || parsed.data?.token || '';
            if (token) {
                console.log('Got token:', token.substring(0, 50) + '...');
                testEndpoint('/timesheets/all', token, () => {
                    testEndpoint('/users', token, null);
                });
            } else {
                console.log('No token found. Response:', JSON.stringify(parsed).substring(0, 300));
            }
        } catch(e) {
            console.log('Login parse error:', e.message, body.substring(0, 300));
        }
    });
});
loginReq.on('error', error => { console.error('Login error:', error); });
loginReq.write(loginData);
loginReq.end();
