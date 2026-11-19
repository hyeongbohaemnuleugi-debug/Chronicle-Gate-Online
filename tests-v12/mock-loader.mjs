// Test-only ESM interception. Runs the actual game socket handlers against an
// in-memory Socket.IO double, without requiring a network download of npm packages.
const expressStub=`function express(){
  function app(req,res){res.statusCode=404;res.end('test-only');}
  for(const name of ['disable','use','get','post','put','delete']) app[name]=()=>app;
  return app;
}
express.json=()=>((_req,_res,next)=>next());
express.static=()=>((_req,_res,next)=>next());
export default express;`;
const socketStub=`export class Server {
 constructor(){this._events=new Map();this.sockets={sockets:new Map()};globalThis.__mockIo=this;}
 on(name,fn){this._events.set(name,fn);return this;}
 to(room){const io=this;return {emit(name,payload){for(const s of io.sockets.sockets.values())if(s.rooms.has(room)||s.id===room)s.emit(name,payload);}}}
 emit(name,payload){for(const s of this.sockets.sockets.values())s.emit(name,payload);}
}`;
export async function resolve(specifier,context,nextResolve){
 if(specifier==='express')return {url:'data:text/javascript,'+encodeURIComponent(expressStub),shortCircuit:true};
 if(specifier==='socket.io')return {url:'data:text/javascript,'+encodeURIComponent(socketStub),shortCircuit:true};
 return nextResolve(specifier,context);
}
