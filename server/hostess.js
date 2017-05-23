var c = require('./config.json');
var utils = require('./utils.js');
var messenger = require('./messenger.js');
var factory = require('./factory.js');

//Room settings
var roomList = {},
	maxPlayersInRoom = c.maxPlayersInRoom,
	roomKickTimeout = c.roomKickTimeout;

exports.findARoom = function(clientID){
	if(getRoomCount() == 0){
		var sig = generateRoomSig();
		roomList[sig] = factory.getRoom(sig,maxPlayersInRoom);
		return sig;
	}
	for(var sig2 in roomList){
		if(roomList[sig2].hasSpace()){
			return sig2;
		}
	}
	var sig3 = generateRoomSig();
	roomList[sig3] = factory.getRoom(sig3,maxPlayersInRoom);
	return sig3;
}

exports.joinARoom = function(sig,clientID){
	roomList[sig].join(clientID);
	return roomList[sig];
}

exports.kickFromRoom = function(clientID){
	var room = searchForRoom(clientID);
	if(room != undefined){
		room.leave(clientID);
	}
}

exports.getRoomBySig = function(sig){
	return roomList[sig];
}

exports.getRoomCount = function(){
	return getRoomCount();
}

exports.updateRooms = function(){
	for(var sig in roomList){
		var room = roomList[sig];
		if(!room.game.gameEnded){
			room.update();
		} else if(room.alive){
			room.alive = false;
			messenger.messageRoomBySig(room.sig,"gameOver",room.game.winner);
			setTimeout(reclaimRoom,roomKickTimeout*1000,room.sig);	
		}
	}
}

function getRoomCount(){
	var count = 0;
	for(var sig in roomList){
		count++;
	}
	return count;
}

function searchForRoom(id){
	var room;
	for(var sig in roomList){
		if(roomList[sig].checkRoom(id)){
			room = roomList[sig];
		}
	}
	return room;
}

function generateRoomSig(){
	var sig = utils.getRandomInt(0,99999);
	if(roomList[sig] == null || roomList[sig] == undefined){
		return sig;
	}
	sig = generateRoomSig();
}

function reclaimRoom(sig){
	var room = roomList[sig];
	for(var clientID in room.clientList){
		room.leave(clientID);
	}
	if(room.clientCount == 0){
		delete roomList[sig];
	}
}