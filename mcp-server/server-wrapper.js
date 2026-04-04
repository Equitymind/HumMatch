#!/usr/bin/env node
/**
 * Dual-mode server: MCP (stdio) + HTTP API
 * Run as: node server-wrapper.js [--http PORT]
 */

const http = require('http');
const { spawn } = require('child_process');

const HTTP_MODE = process.argv.includes('--http');
const PORT = process.env.PORT || process.argv[process.argv.indexOf('--http') + 1] || 3000;

if (HTTP_MODE) {
  // HTTP API mode for Render deployment
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', songs: 3726 }));
    } else if (req.url === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({
        name: 'HumMatch MCP Server',
        version: '1.0.0',
        songs: 3726,
        endpoints: {
          health: '/health',
          mcp: 'Use as MCP server via npx'
        }
      }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  server.listen(PORT, () => {
    console.log(\`HumMatch MCP HTTP server running on port \${PORT}\`);
  });
} else {
  // MCP stdio mode (default)
  const mcp = spawn('node', ['dist/index.js'], {
    stdio: 'inherit'
  });
  
  mcp.on('exit', code => process.exit(code));
}
