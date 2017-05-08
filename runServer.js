var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);

//Base Server Settings
var serverSleeping = true,
	serverTickSpeed = 1000/60,
	clientCount;

//Gameobject lists
var clientList = {},
	bulletList = {},
	shipList = {};







//Base Server Functions



server.listen(3000, function(){
  console.log('listening on *:3000');
});

process.on( 'SIGINT', function() {
	  console.log( "\nServer shutting down from (Ctrl-C)" );
	  io.sockets.emit("serverShutdown","Server terminated");
	  process.exit();
});

io.on('connection', function(client){
	client.emit("welcome",client.id);

	client.on('gotit', function(name){

		console.log(name + " connected");

		//Add this player to the list of current clients
		clientList[client.id] = name; 

		//Spawn a ship for the new player
		shipList[client.id] = spawnNewShip();

		//Send the current gamestate to the new player
		var gameState = {
			playerList:clientList,
			shipList:shipList
		};
		client.emit("gameState" , gameState);

		//Update all existing players with the new player's info
		var appendPlayerList = {
			name:name,
			id:client.id,
			ship:shipList[client.id]
		};
		client.broadcast.emit("playerJoin",appendPlayerList);
	});

	client.on('disconnect', function() {
		var name = clientList[client.id];
		var id = client.id;
		client.broadcast.emit('playerLeft',client.id);
		console.log(name + ' disconnected');
		delete clientList[id];
		delete shipList[id];

		clientCount = 0; 
		for(var user in clientList){
			clientCount++;
		}
		if(clientCount == 0){
			serverSleeping = true;
			console.log("Server sleeping..");
		}
		
  	});

	
	client.on('movement',function(packet){
		if(shipList[client.id] != null){
			shipList[client.id].moveForward = packet.moveForward;
			shipList[client.id].moveBackward = packet.moveBackward;
			shipList[client.id].turnLeft = packet.turnLeft;
			shipList[client.id].turnRight = packet.turnRight;
		}
	});

	client.on('mousemove',function(loc){
		var ship = shipList[client.id];
		if(ship != null && ship != undefined){
			ship.angle = (180/Math.PI)*Math.atan2(loc.y-ship.y,loc.x-ship.x)-90;
		}
	});
	

	client.on('click',function(loc){
		//if bullet should be spawned (could be clicking something else)
		var bullet = spawnNewBullet(client.id);
	});

	if(serverSleeping){
		serverSleeping = false;
		setInterval(update,serverTickSpeed);
	}
});




//Gamestate updates


function update(){
	if(!serverSleeping){
		checkCollisions();
		updateShips();
		updateBullets();
		sendUpdates();
	}
}

function checkCollisions(){
	var objectArray = [];
	for(var ship in shipList){
		objectArray.push(shipList[ship]);
	}
	for(var sig in bulletList){
		objectArray.push(bulletList[sig]);
	}
	broadBase(objectArray);
}

function updateShips(){
	for(var ship in shipList){
		//Check for hit first!!
		moveShip(shipList[ship]);
	}
}

function updateBullets(){
	for(var sig in bulletList){
		//Check for hit first!!
		updatePhysics(bulletList[sig]);
		moveBullet(bulletList[sig]);
	}
}

function sendUpdates(){
	io.sockets.emit("movementUpdates",{shipList:shipList,bulletList:bulletList});
}

function moveShip(ship){
	if(ship.moveForward){
		ship.y -= 1;
	}
	if(ship.moveBackward){
		ship.y += 1;
	}
	if(ship.turnLeft){
		ship.x -= 1;
	}
	if(ship.turnRight){
		ship.x += 1;
	}
}

function updatePhysics(object){
	//I'm fucking dumb and can't figure this shit out
	object.velX = Math.sin(object.angle)*object.speed;
	object.velY = Math.cos(object.angle)*object.speed;
}

function moveBullet(bullet){
	bullet.x += bullet.velX;
	bullet.y += bullet.velY;
}

function spawnNewShip(){
	var loc = findRandomSpawnLoc();
	var ship = {
		x: loc.x,
		y: loc.y,
		width:10,
		height:10,
		color: "white",
		angle: 90,
		isHit: false,
		moveForward: false,
		moveBackward: false,
		turnLeft: false,
		turnRight: false
	}
	return ship;
}

function spawnNewBullet(id){
	var ship = shipList[id];
	var bullet = {
		x:ship.x,
		y:ship.y,
		speed:1,
		velX:0,
		velY:0,
		angle:ship.angle,
		isHit: false,
		width:2,
		height:6,
		color:ship.color,
		owner:id,
		lifetime:5,
		sig:generateBulletSig()
	}
	setTimeout(terminateBullet,bullet.lifetime*1000,bullet.sig);
	bulletList[bullet.sig] = bullet;
	return bullet;
}

function terminateBullet(sig){
	delete bulletList[sig];
}



//Utils
function generateBulletSig(){
	var sig = getRandomInt(0,99999);
	if(bulletList[sig] == null || bulletList[sig] == undefined){
		return sig;
	}
	sig = generateBulletSig();
}

function findRandomSpawnLoc(){
	return {x:getRandomInt(10,790),y:getRandomInt(10,590)};
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}








//Collision
function broadBase(objectArray){
	//Shitty Collision detection for first run through
	checkBoxBroad(objectArray);
}

function checkBoxBroad(objectArray){
	for (var i = 0; i < objectArray.length-1; i++) {
    	for (var j = i + 1; j < objectArray.length; j++) {
    		if(checkBoxNarrow(objectArray[i],objectArray[j])){
    			objectArray[i].isHit = true;
    			objectArray[i].color = 'red';
    			objectArray[j].isHit = true;
    			objectArray[j].color = 'red';
    		} else{
    			objectArray[i].isHit = false;
    			objectArray[i].color = 'white';
    			objectArray[j].isHit = false;
    			objectArray[j].color = 'white';
    		}
    	}
    }
}


function checkBoxNarrow(box1,box2) {
	if (box1.x < box2.x + box2.width &&
	    box1.x + box1.width > box2.x &&
	    box1.y < box2.y + box2.height &&
	    box1.height + box1.y > box2.y){
		return true;
	}
	return false;
}