require('dotenv').config();
const express = require("express");
const { createProxyMiddleware } = require('http-proxy-middleware');
const net = require('net'); // 🌐 Native network module for TCP pings

const app = express();

// 1. Target configurations
const SERVER_B = process.env.SERVER_MAIN_1 || 'http://localhost:5000'; 
const SERVER_C = process.env.SERVER_MAIN_2 || 'http://localhost:3000'; 
const targets = [SERVER_B, SERVER_C];

// Track health status of each server
let serverStatus = {
    [SERVER_B]: true,
    [SERVER_C]: true
};

let requestCounter = 0;

// 🩺 2. Proactive TCP Socket Health Checker (From Script 1)
const checkServerHealth = (serverUrl) => {
    const url = new URL(serverUrl);
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    const hostname = url.hostname;

    const socket = net.createConnection(port, hostname);
    socket.setTimeout(500); // 500ms timeout window

    socket.on('connect', () => {
        if (!serverStatus[serverUrl]) {
            console.log(`[🔄 RECOVERY] ${serverUrl} is back online.`);
            serverStatus[serverUrl] = true;
        }
        socket.destroy();
    });

    socket.on('error', () => { markAsDown(serverUrl); socket.destroy(); });
    socket.on('timeout', () => { markAsDown(serverUrl); socket.destroy(); });
};

const markAsDown = (serverUrl) => {
    if (serverStatus[serverUrl]) {
        console.warn(`[⚠️ FAILOVER] ${serverUrl} down! Removed from routing pool.`);
        serverStatus[serverUrl] = false;
    }
};

// Check backends every 1 second
setInterval(() => {
    targets.forEach(checkServerHealth);
}, 1000);

// ⚖️ 3. Smart Selection Logic
const getActiveServer = () => {
    const healthyServers = targets.filter(server => serverStatus[server]);

    // Fallback if everything is dead
    if (healthyServers.length === 0) {
        return targets[0]; 
    }

    const selected = healthyServers[requestCounter % healthyServers.length];
    requestCounter++;
    return selected;
};

// 🔀 4. Advanced Proxy Integration (From Script 2)
const loadBalancerProxy = createProxyMiddleware({
    target: targets[0], // Default base fallback
    changeOrigin: true,
    
    // Dynamically choose target based on active health checks
    router: (req) => {
        return getActiveServer();
    },

    on: {
        proxyReq: (proxyReq, req, res) => {
            const time = new Date().toLocaleTimeString();
            console.log(`\n============== 🔀 NEW INBOUND REQUEST [${time}] ==============`);
            console.log(`📥 Route:  ${req.method} ${req.originalUrl} ──> 🎯 Target: ${proxyReq.host}`);
        },
        proxyRes: (proxyRes, req, res) => {
            console.log(`✅ [Proxy Status] Target responded with status: ${proxyRes.statusCode}`);
            console.log(`===========================================================`);
        },
        error: (err, req, res) => {
            console.error(`\n❌ ============== PROXY ERROR INTERCEPT ==============`);
            console.error(`💥 Message: Express proxy gateway failed to pipe request.`);
            console.error(`🛠️ Details:`, err.message);
            console.error(`================================================================`);
            
            res.status(502).json({ 
                error: "Bad Gateway", 
                message: "Target server was unreachable during active request delivery." 
            });
        }
    }
});

// 5. Mount gateway middleware 
app.use('/', loadBalancerProxy);

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`🚀 ========================================================`);
    console.log(`🚀 HYBRID LOAD BALANCER ONLINE: http://localhost:${PORT}`);
    console.log(`🚀 Tracking Live Targets: [ ${targets.join(' , ')} ]`);
    console.log(`🚀 ========================================================`);
});