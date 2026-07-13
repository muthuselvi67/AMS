const http = require('http');

const loginData = JSON.stringify({ email: 'muthuselvi@learnlike.in', password: '87654321' });

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
};

const req = http.request(options, res => {
    console.log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', d => { body += d; });
    res.on('end', () => {
        console.log('Response:', body.substring(0, 500));
        try {
            const parsed = JSON.parse(body);
            console.log('status:', parsed.status);
            console.log('message:', parsed.message);
        } catch(e) {
            console.log('Parse error:', e.message);
        }
    });
});

req.on('error', error => { console.error('Error:', error.message); });
req.write(loginData);
req.end();
