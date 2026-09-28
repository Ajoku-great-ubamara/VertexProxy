require('dotenv').config();
const http = require('http');
const https = require('https');
const net = require('net'); // 🌐 Added native network module for raw TCP pings

// 🌐 1. Target server configurations
const SERVER_B = process.env.SERVER_MAIN_1 || 'http://localhost:5000'; 
const SERVER_C = process.env.SERVER_MAIN_2 || 'http://localhost:3000'; 

// Track health status of each server
let serverStatus = {
    [SERVER_B]: true,
    [SERVER_C]: true
};

//b Counter to alternate requests for load balancing
let requestCounter = 0;

// 🛡️ Helper function to choose between http or https dynamically
const getHttpClient = (urlStr) => {
    return urlStr.startsWith('https') ? https : http;
};

// 🩺 2. Super Lightweight TCP Socket Health Checker (No HTTP requests!)
const checkServerHealth = (serverUrl) => {
    const url = new URL(serverUrl);
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    const hostname = url.hostname;

    // Open a quick raw connection to the port
    const socket = net.createConnection(port, hostname);
    
    // Set a very short timeout so it doesn't hang
    socket.setTimeout(500);

    socket.on('connect', () => {
        if (!serverStatus[serverUrl]) {
            console.log(`[🔄 RECOVERY] ${serverUrl} port is open. Back online.`);
            serverStatus[serverUrl] = true;
        }
        socket.destroy(); // Safely close immediately
    });

    socket.on('error', () => {
        markAsDown(serverUrl);
        socket.destroy();
    });

    socket.on('timeout', () => {
        markAsDown(serverUrl);
        socket.destroy();
    });
};

const markAsDown = (serverUrl) => {
    if (serverStatus[serverUrl]) {
        console.warn(`[⚠️ FAILOVER] ${serverUrl} connection failed! Removing from rotation.`);
        serverStatus[serverUrl] = false;
    }
};

// Check ports every 1 second (1000ms) - completely safe now!
setInterval(() => {
    checkServerHealth(SERVER_B);
    checkServerHealth(SERVER_C);
}, 1000);

// ⚖️ Dynamic Load Balancing Selection Logic
const getActiveServer = () => {
    const healthyServers = Object.keys(serverStatus).filter(server => serverStatus[server]);

    if (healthyServers.length === 0) {
        return SERVER_B; 
    }

    const selected = healthyServers[requestCounter % healthyServers.length];
    requestCounter++;
    return selected;
};

// 🚀 3. Core Traffic Cop Routing Engine
const proxyServer = http.createServer((clientReq, clientRes) => {
    const activeServer = getActiveServer();
    console.log(`[🎯 INBOUND] Forwarding ${clientReq.method} ${clientReq.url} ──> ${activeServer}`);

    const targetUrl = new URL(clientReq.url, activeServer);
    const forwarder = getHttpClient(activeServer);

    const proxyOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: clientReq.method,
        headers: {
            ...clientReq.headers,
            'host': targetUrl.hostname 
        }
    };

    const targetReq = forwarder.request(proxyOptions, (targetRes) => {
        clientRes.writeHead(targetRes.statusCode, targetRes.headers);
        targetRes.pipe(clientRes);
    });

    targetReq.on('error', (err) => {
        console.error(`[💥 ROUTING ERROR] Cannot connect to ${activeServer}:`, err.message);
        markAsDown(activeServer); 
        
        clientRes.writeHead(502, { 'Content-Type': 'application/json' });
        clientRes.end(JSON.stringify({ success: false, error: "Bad Gateway. Target server unavailable." }));
    });

    clientReq.pipe(targetReq);
});

const PORT = process.env.PORT || 8080;
proxyServer.listen(PORT, () => {
    console.log(`[✅ ENGINE ACTIVE] TCP-based Load balancer running on port ${PORT}`);
});
