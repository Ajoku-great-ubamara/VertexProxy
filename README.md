# traceV-vertexproxy — High-Performance Reverse Proxy & Layer 7 Load Balancer 🌐

A robust, low-overhead Layer 7 Reverse Proxy, Orchestration Engine, and Dynamic Load Balancer engineered from scratch using Node.js, Express 5.x, and native networking abstractions. Designed to operate as a high-concurrency gateway, the system securely routes client traffic, enforces transaction rate-limiting, handles graceful fallbacks, and executes pre-deployment validation simulation loops while keeping upstream destination layers entirely anonymous.

##  Architectural Core Features

- **Infrastructural Target Masking:** Engineered to decouple and fully anonymize backend topologies. Upstream targets are managed as unknown internal network strings, completely preventing real server mapping from public source control files.
- **Asynchronous TCP Health Checking:** Utilizes native Node.js socket layers (`net.createConnection`) to perform non-blocking, rapid background health checking of microservices, dynamically updating active routing pools under 500ms timeout limits.
- **Dynamic Round-Robin Load Balancing:** Intercepts traffic at the gateway layer and balances active concurrent payloads smoothly across live production environments to eliminate application server bottlenecks.
- **Upstream Client Footprint Preservation:** Intercepts incoming network payloads to map and maintain client footprints using standard `X-Forwarded-For` HTTP header injections.
- **Enterprise-Grade Rate Limiting:** Integrated with high-performance request throttling boundaries (`express-rate-limit`) to defend underlying applications against DDoS vectors and scraping attacks.
- **Isolated Pipeline Test Simulation:** Features an integrated execution toggle (`TEST_MODE`) that allows automated CI/CD environments to boot up the entire runtime infrastructure, verify syntax integrity, and exit cleanly without hanging active event loops.

##  Tech Stack & Dependencies

- **Runtime Engine:** Node.js (v20+ Optimized)
- **Core Framework:** Express 5.x (Cutting-edge asynchronous request handling)
- **Core Routing Engine:** Http-Proxy-Middleware (v4.x Matrix)
- **Security & Throttling:** Express-Rate-Limit
- **Infrastructure Tools:** PM2 Process Management, Jest Test Framework

##  Local Production Architecture Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd tracev-bswitch
   ```

2. **Install core packages:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**  
   Create a `.env` file in your root folder. Upstream destination addresses are treated as abstract references for maximum security:
   ```env
   PORT=10000
   #  Upstream targets are completely decoupled and masked for infrastructural isolation
   SERVER_MAIN_1=http://unknown-backend-1.internal
   SERVER_MAIN_2=http://unknown-backend-2.internal
   TEST_MODE=false
   ```

4. **Launch the processing core:**
   ```bash
   # Local Development Workflow
   npm run dev

   # Standard Production Boot
   npm start
   ```

##  Automated CI/CD Pre-Deployment Validation

This repository features an automated GitHub Actions validation workflow (`proxy-validation.yml`). On every push to `main` or `master`, the runner spins up an isolated instance to:
1. Conduct a strict native JavaScript syntax inspection (`node --check`).
2. Simulate a full structural runtime test loop using live mock environment contexts.
3. Automatically fire an authenticated Render Deployment Webhook loop **only** if all architectural validation phases evaluate to 100% success.

## 🛡️ License
Distributed under the MIT License. Built with strict engineering standards by [Ajoku Great Ubamara](https://linkedin.com).
