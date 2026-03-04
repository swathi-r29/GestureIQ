const testBackend = async () => {
    try {
        // 1. Login
        console.log('Attempting login...');
        const loginRes = await fetch('http://localhost:5000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@gestureiq.com',
                password: 'admin123'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        if (!token) throw new Error('Login failed: ' + JSON.stringify(loginData));
        console.log('Login successful.');

        // 2. List Mudras
        console.log('Fetching mudra list...');
        const listRes = await fetch('http://localhost:5000/api/admin/mudra/list', {
            headers: { 'x-auth-token': token }
        });
        const listData = await listRes.json();
        console.log(`Success! Found ${listData.length} mudras.`);

        const types = listData.reduce((acc, m) => {
            acc[m.handType] = (acc[m.handType] || 0) + 1;
            return acc;
        }, {});
        console.log('Mudra types distribution:', types);

        // 3. Create a test mudra
        console.log('Creating a test double-hand mudra...');
        const createRes = await fetch('http://localhost:5000/api/admin/mudra/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                mudraName: 'TestMudra',
                handType: 'double'
            })
        });
        const createData = await createRes.json();
        console.log('Created:', createData.mudraName);

        // 4. Verify list again
        const listRes2 = await fetch('http://localhost:5000/api/admin/mudra/list', {
            headers: { 'x-auth-token': token }
        });
        const listData2 = await listRes2.json();
        console.log(`Total mudras now: ${listData2.length}`);

    } catch (err) {
        console.error('Test failed:', err.message);
    }
};

testBackend();
