require('dotenv').config();
const express = require("express");
const { createProxyMiddleware } = require('http-proxy-middleware');
const net = require('net'); 

const app = express();

// 🚀 CRITICAL: Tells Express it is behind a proxy so it can extract real user IPs
app.set('trust proxy', true);

const SERVER_B = process.env.SERVER_MAIN_1 || 'http://localhost:5000'; 
const SERVER_C = process.env.SERVER_MAIN_2 || 'http://localhost:3000'; 
const targets = [SERVER_B, SERVER_C];

let serverStatus = {[SERVER_B]: true, [SERVER_C]: true};
let requestCounter = 0;

// Health checker code remains unchanged...
const checkServerHealth = (serverUrl) => {
    const url = new URL(serverUrl);
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    const socket = net.createConnection(port, url.hostname);
    socket.setTimeout(500); 
    socket.on('connect', () => { if (!serverStatus[serverUrl]) serverStatus[serverUrl] = true; socket.destroy(); });
    socket.on('error', () => { serverStatus[serverUrl] = false; socket.destroy(); });
    socket.on('timeout', () => { serverStatus[serverUrl] = false; socket.destroy(); });
};
setInterval(() => targets.forEach(checkServerHealth), 1000);

const getActiveServer = () => {
    const healthyServers = targets.filter(server => serverStatus[server]);
    if (healthyServers.length === 0) return targets[0]; 
    const selected = healthyServers[requestCounter % healthyServers.length];
    requestCounter++;
    return selected;
};

// 🔀 Advanced Proxy Integration
const loadBalancerProxy = createProxyMiddleware({
    target: targets[0], 
    changeOrigin: true,
    router: (req) => getActiveServer(),
    on: {
        proxyReq: (proxyReq, req, res) => {
            // 🔥 This sends the user's REAL IP to Server B and Server C
            // Your main servers' rate limiters need this to know who to block!
            proxyReq.setHeader('X-Forwarded-For', req.ip);
        }
    }
});

// ⚡ NO rate limiter here. Just pass directly to the backend servers!
app.use('/', loadBalancerProxy);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Load balancer running on port ${PORT}`));
