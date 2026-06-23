const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const postData = JSON.stringify(data);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function test() {
    try {
        console.log('Logging in as HR...');
        const auth = await post('http://localhost:5000/api/auth/login', {
            email: 'hr@lms.com',
            password: 'Hr@123'
        });
        const token = auth.data.token || auth.data.data?.token;

        console.log('\nFetching ALL leave types (/api/leave-types/all)...');
        const resAll = await get('http://localhost:5000/api/leave-types/all', token);
        console.log('Status:', resAll.status);
        const typesAll = resAll.data.data || resAll.data || [];
        console.log('Found', typesAll.length, 'leave types:');
        typesAll.forEach(t => {
            console.log(`- ID: ${t.id} | Name: ${t.name} | Code: ${t.code} | Active: ${t.isActive}`);
        });

        console.log('\nFetching active leave types only (/api/leave-types)...');
        const resActive = await get('http://localhost:5000/api/leave-types', token);
        console.log('Status:', resActive.status);
        const typesActive = resActive.data.data || resActive.data || [];
        console.log('Found', typesActive.length, 'active leave types:');
        typesActive.forEach(t => {
            console.log(`- ID: ${t.id} | Name: ${t.name} | Code: ${t.code} | Active: ${t.isActive}`);
        });

    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
