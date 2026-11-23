#!/usr/bin/env node
/** Dependency-free local HTTP mode. Does not mount Socket.IO, accounts or remote services. */
import http from 'node:http';
import { createStaticHandler } from '../game-server/http-service.js';
const port = Number(process.env.OFFLINE_PORT || 4173);
const serve = createStaticHandler({ offline: true });
const server = http.createServer((request, response) => {
  serve(request, response).catch(error => {
    console.error('[offline]', error.code || error.name || 'request failed');
    if (!response.headersSent) response.writeHead(500, { 'Content-Length': 0 });
    response.end();
  });
});
server.listen(port, '127.0.0.1', () => console.log(`Chronicle Gate 오프라인: http://127.0.0.1:${port}/\n브라우저에서 위 주소를 열어 주세요. 이 창을 닫으면 게임 서버가 종료됩니다.\n외부 인터넷/회원가입/API 키가 필요하지 않습니다. 종료: Ctrl+C`));
const stop = () => { server.close(() => { process.exitCode = 0; }); server.closeIdleConnections?.(); };
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
