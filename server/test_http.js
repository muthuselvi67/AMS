const http = require('http');

const data = JSON.stringify({
    date: '2026-07-08',
    check_in_time: '2026-07-08 09:30:00',
    check_out_time: '2026-07-08 21:30:00',
    reason: 'check out'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/regularization',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        // Using a dummy JWT or no auth just to see if we get a 401 or the actual error
        // But wait, the API requires auth. I'll just use the token I saw earlier or a dummy one.
        // Actually, if it requires auth, it might return 401. Let's see.
    }
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', d => {
        body += d;
    });
    res.on('end', () => {
        console.log('Body:', body);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
