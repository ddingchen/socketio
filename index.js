var app = require('http').createServer(handler)
var io = require('socket.io')(app);

app.listen(8888);

function handler (req, res) {
  console.log('Server created!');
}

var rooms = {};

io.on('connection', function (socket) {

  // 有新用户进入指定房间
  socket.on('enter-room', function (roomId, response) {
    var roomName = getRoomName(roomId);
    var countOfMembers = countOfMembersInRoom(roomName);
    if(countOfMembers >= 2) {
      response('no_more_chair');
      return;
    }
    // 如果有房主，通过房主获取当前游戏信息（如果游戏正在进行中，获取游戏进度）
    var roomHost = hostOfRoom(roomName);
    // 进入房间
    socket.join(roomName);
    // 如果房间已满两人，则开始游戏
    countOfMembers = countOfMembersInRoom(roomName);
    if(countOfMembers == 2) {
      io.to(roomHost).emit('request-game-progress');
    }
  });

  // 载入房间的游戏进度
  socket.on('share-game-progress', function(info) {
    var roomName = getRoomName(info.roomId);
    if(info.currentGame.round === 0) {
      // 游戏未开始，则开始游戏
      var roomMembers = io.sockets.adapter.rooms[roomName];
      var colors = randomUpperHand(roomMembers.sockets);
      io.to(roomName).emit('game-start', colors);
      return;
    }
    // 游戏正在进行中，则让房间其他玩家读取游戏进度
    socket.broadcast.to(roomName).emit('reload-game-progress', info);
  });

  // 玩家结束自己的回合
  socket.on('turn-over', function(info) {
    console.log('turn over');
    var roomName = getRoomName(info.roomId);
    io.to(roomName).emit('next-turn', info.newBoard);
  })

  // 玩家断开连接
  socket.on('disconnect', function() {

  })

});

function hostOfRoom(roomName) {
  var info = io.sockets.adapter.rooms[roomName];
  if(info && info.sockets && info.length == 1) {
    return Object.keys(info.sockets)[0];
  }
}

function countOfMembersInRoom(roomName) {
  var info = io.sockets.adapter.rooms[roomName];
  if(!info) {
    return 0;
  }
  return info.length;
}

function getRoomName(roomId) {
  return 'abalone.' + roomId;
}

function randomUpperHand(sockets) {
  var colors = {};
  Object.keys(sockets).forEach(function(socketId, index) {
    colors[socketId] = index ? 'black' : 'white';
  });
  return colors;
}