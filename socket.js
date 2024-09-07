import { Server } from 'socket.io';

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    // 處理連接
    socket.on('update', (data) => {
      // 處理更新
      io.emit('update', data);
    });
  });

  console.log('Socket is initialized');
  res.end();
}
