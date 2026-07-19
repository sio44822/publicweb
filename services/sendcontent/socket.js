 /**
  * SendContent Socket.IO — 即時配對、文字與檔案轉發
  */
 import { Server } from 'socket.io';
 import { sessions } from './session-store.js';
 
 const SOCKET_PATH = '/public/sendcontent/socket.io';
 
 export function initSendContentSocket(server) {
   const io = new Server(server, { path: SOCKET_PATH });
 
   io.on('connection', (socket) => {
     console.log('[SendContent] Client connected:', socket.id);
 
     socket.on('join', (data) => {
       const { sid } = data;
       socket.sessionId = sid;
 
       if (!sessions.has(sid)) {
         sessions.set(sid, { code: null, devices: [], created: Date.now() });
       }
 
       const session = sessions.get(sid);
       if (!session.devices.includes(socket.id)) {
         session.devices.push(socket.id);
       }
       socket.join(sid);
 
       if (session.devices.length >= 2) {
         io.to(sid).emit('paired', { code: session.code });
       } else {
         io.to(sid).emit('waiting', { code: session.code });
       }
     });
 
     socket.on('send-text', (data) => {
       const sid = socket.sessionId;
       if (!sid || !sessions.has(sid)) return;
       io.to(sid).emit('receive-text', { text: data.text });
     });
 
     socket.on('send-file', (data) => {
       const sid = socket.sessionId;
       if (!sid || !sessions.has(sid)) return;
       io.to(sid).emit('receive-file', data);
     });
 
     socket.on('disconnect', () => {
       const sid = socket.sessionId;
       if (sid && sessions.has(sid)) {
         const session = sessions.get(sid);
         session.devices = session.devices.filter(id => id !== socket.id);
         if (session.devices.length === 0) sessions.delete(sid);
       }
     });
   });
 
   console.log('[SendContent] Socket.IO ready at', SOCKET_PATH);
   return io;
 }
