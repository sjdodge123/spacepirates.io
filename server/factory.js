'use strict';

var c = require('./config.json');

exports.getWorld = function() {
    return new World(0,0,300,300);
};

exports.getTimer = function(callback,delay){
	return new Timer(callback,delay);
};

exports.getRect = function(x,y,width,height){
	return new Rect(x,y,width,height);
}
exports.getCircle = function(x,y,radius){
	return new Circle(x,y,radius);
}
exports.getShip = function(x,y,width,height,color){
	return new Ship(x,y,width,height,color);
}

exports.getRoom = function(sig,size){
	return new Room(sig,size);
}

class Room {
	constructor(sig,size){
		this.sig = sig;
		this.size = size;
		this.world = new World(0,0,c.worldWidth,c.worldHeight);
		this.clientList = {};
		this.planetList = {};
		this.asteroidList = {};
		this.bulletList = {};
		this.shipList = {};
		this.clientCount = 0;
		this.game = new Game(this.world,this.clientList,this.bulletList,this.shipList,this.asteroidList,this.planetList);
	}
	join(client){
		client.join(this.sig);
		this.clientCount++;
	}
	leave(client){
		client.leave(this.sig)
		this.clientCount--;
	}
	update(){
		this.game.update();
	}
	
	checkRoom(clientID){
		for(var id in this.clientList){
			if(id == clientID){
				return true;
			}
		}
		return false;
	}
	hasSpace(){
		if(this.clientCount < this.size){
			if(!this.game.active && !this.game.gameEnded){
				return true;
			}
		}
		return false;
	}
	
}

class Game {
	constructor(world,clientList,bulletList,shipList,asteroidList,planetList){
		this.world = world;
		this.clientList = clientList;
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.planetList = planetList;
		this.asteroidList = asteroidList;

		//Gamerules
		this.minPlayers = c.minPlayers;
		this.density = c.asteroidDensity;
		this.lobbyWaitTime = c.lobbyWaitTime;1
		this.shrinkTime = c.startingShrinkTimer;

		this.shrinkTimer = null;
		this.boundTimer = null;
		this.shrinkTimeLeft = 60;
		this.gameEnded = false;
		this.winner = null;
		this.active = false;
		this.lobbyTimer = null;
		this.lobbyTimeLeft = this.lobbyWaitTime;

		this.gameBoard = new GameBoard(world,clientList,bulletList,shipList,asteroidList,planetList);
	}

	start(){
		this.active = true;
		this.gameBoard.populateWorld(this.density);
		this.randomLocShips();
		this.world.drawFirstBound();

		var gamew = this;
		this.boundTimer = setInterval(function(){gamew.world.shrinkBound();},this.shrinkTime*1000);
		this.resetShrinkTimer();
	}

	resetShrinkTimer(){
		var gameW = this;
		delete this.shrinkTimer;
		this.shrinkTimer = new Timer(function(){gameW.resetShrinkTimer();},this.shrinkTime*1000);
	}

	reset(){
		this.world.reset();
		this.shrinkTimer.reset();
		clearInterval(this.boundTimer);
	}

	gameover(){
		this.active = false;
		for(var shipID in this.shipList){
			console.log(this.clientList[shipID]+" wins!");
			this.winner = shipID;
			this.gameEnded = true;
		}
	}

	update(){
		if(this.active){
			this.shrinkTimeLeft = this.shrinkTimer.getTimeLeft().toFixed(1);
			this.checkForWin();
		} else{
			this.checkForGameStart()
		}
		this.gameBoard.update(this.active);
	}

	checkForWin(){
		if(this.getShipCount() == 1){
			this.gameover();
		}
	}

	checkForGameStart(){
		if(this.getShipCount() >= this.minPlayers){
			if(this.lobbyTimer == null){
				var game = this;
				this.lobbyTimer = new Timer(function(){game.start();},this.lobbyWaitTime*1000);
			} else{
				this.lobbyTimeLeft = this.lobbyTimer.getTimeLeft().toFixed(1);
			}
		}
	}

	getShipCount(){
		var shipCount = 0;
		for(var shipID in this.shipList){
			shipCount++;
		}
		return shipCount;
	}
	randomLocShips(){
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			var loc = this.world.getRandomLoc();
			ship.x = loc.x;
			ship.y = loc.y;
		}
	}
}

class GameBoard {
	constructor(world,clientList,bulletList,shipList,asteroidList,planetList){
		this.world = world;
		this.clientList = clientList;
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.asteroidList = asteroidList;
		this.planetList = planetList;
		this.collisionEngine = new CollisionEngine();
	}
	update(active){
		this.checkCollisions(active);
		this.updateShips(active);
		this.updateBullets();
		this.updateAsteroids();
	}
	updateShips(active){
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			//TODO: Check for hit first!!
			if(active){
				this.world.checkForMapDamage(ship);
			}
			ship.update();
		}
	}
	updateBullets(){
		for(var sig in this.bulletList){
			var bullet = this.bulletList[sig];
			if(bullet.alive == false){
				delete this.bulletList[sig];
				continue;
			}
			bullet.update();
		}
	}
	updateAsteroids(){
		for(var asteroidSig in this.asteroidList){
			var asteroid = this.asteroidList[asteroidSig];
			if(asteroid.alive == false){
				delete this.asteroidList[asteroidSig];
				continue;
			}
			asteroid.update();
			
		}
	}
	checkCollisions(active){
		if(active){
			var objectArray = [];
			for(var ship in this.shipList){
				objectArray.push(this.shipList[ship]);
			}
			for(var asteroidSig in this.asteroidList){
				objectArray.push(this.asteroidList[asteroidSig]);
			}
			for(var planetSig in this.planetList){
				objectArray.push(this.planetList[planetSig]);
			}
			for(var sig in this.bulletList){
				objectArray.push(this.bulletList[sig]);
			}
			this.collisionEngine.broadBase(objectArray);
		}
	}
	
	spawnNewBullet(ship){
		var sig = this.generateBulletSig();
		var bullet = ship.fire(sig);
		this.bulletList[sig] = bullet;
		setTimeout(this.terminateBullet,bullet.lifetime*1000,{sig:sig,bulletList:this.bulletList});
	}
	terminateBullet(packet){
		if(packet.bulletList[packet.sig] != undefined){
			delete packet.bulletList[packet.sig];
		}
	}
	generateBulletSig(){
		var sig = this.getRandomInt(0,99999);
		if(this.bulletList[sig] == null || this.bulletList[sig] == undefined){
			return sig;
		}
		return this.generateBulletSig();
	}
	generateAsteroidSig(){
		var sig = this.getRandomInt(0,99999);
		if(this.asteroidList[sig] == null || this.asteroidList[sig] == undefined){
			return sig;
		}
		return this.generateAsteroidSig();
	}
	generatePlanetSig(){
		var sig = this.getRandomInt(0,99999);
		if(this.planetList[sig] == null || this.planetList[sig] == undefined){
			return sig;
		}
		return this.generatePlanetSig();
	}
	getRandomInt(min,max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
	}
	populateWorld(density){
		if(c.generateAsteroids){
			for(var i = 0; i<density;i++){
				var loc = this.world.getRandomLoc();
				var sig = this.generateAsteroidSig();
				this.asteroidList[sig] = new Asteroid(loc.x,loc.y,this.getRandomInt(c.asteroidMinSize,c.asteroidMaxSize),sig);
			}
		}
		if(c.generatePlanets){
			for(var i = 0; i<density;i++){
				var loc = this.world.getRandomLoc();
				var sig = this.generatePlanetSig();
				this.planetList[sig] = new Planet(loc.x,loc.y,this.getRandomInt(c.planetMinSize,c.planetMaxSize),sig);
			}
		}
	}
}


class Shape {
	constructor(x,y,color){
		this.x = x;
		this.y = y;
		this.color = color;
	}
	inBounds(shape){
		if(shape instanceof Rect){
			return this.testRect(shape);
		}
		if(shape instanceof Circle){
			return this.testCircle(shape);
		}
		return false;
	}
}

class Rect extends Shape{
	constructor(x,y,width,height,color){
		super(x,y,color);
		this.width = width;
		this.height = height;
	}
	testRect(rect){
		if(this.x < rect.x &&
           this.x + this.width > rect.x &&
           this.y < rect.y &&
           this.y + this.height > rect.y
           ){
           return true;
        }
        return false;
	}
	testCircle(circle){
		var distX = Math.abs(circle.x - this.x-this.width/2);
		var distY = Math.abs(circle.y - this.y-this.height/2);
		if(distX > (this.width/2 + circle.radius)){return false;}
		if(distY > (this.height/2 + circle.radius)){return false;}
		if(distX <= (this.width/2)){return true;}
		if(distY <= (this.height/2)){return true;}
		var dx = distX-this.width/2;
		var dy = distY-this.height/2;
		return (dx*dx+dy*dy<=(circle.radius*circle.radius));
	}
}

class Circle extends Shape{
	constructor(x,y,radius,color){
		super(x,y,color);
		this.radius = radius;
	}
	testRect(rect){
		var distance = Math.sqrt(Math.pow(rect.x-this.x,2) + Math.pow(rect.y-this.y,2));
		if(distance+rect.width <= this.radius){
			return true;
		}
		return false;
	}

	testCircle(circle){
		var distance = Math.sqrt(Math.pow(circle.x-this.x,2) + Math.pow(circle.y-this.y,2));
		if(distance+circle.radius <= this.radius){
			return true;
		}
		return false;
	}
	getRandomCircleLoc(minR,maxR){
		var r = Math.floor(Math.random()*(maxR - minR));
		var angle = Math.floor(Math.random()*(Math.PI*2 - 0));
		return {x:r*Math.cos(angle)+this.x,y:r*Math.sin(angle)+this.y};
	}
}

class World extends Rect{
	constructor(x,y,width,height){
		super(x,y,width,height,"orange");
		this.baseBoundRadius = width;
		this.damageRate = 2;
		this.damagePerTick = 15;
		this.whiteBound = new WhiteBound(width/2,height/2,this.baseBoundRadius);
		this.blueBound = new BlueBound(width/2,height/2,this.baseBoundRadius);
		this.center = {x:width/2,y:height/2};	
	}

	drawNextBound(){
		this.whiteBound = this._drawWhiteBound();
	}
	drawFirstBound(){
		var newRadius = this.blueBound.radius/3;
		var x = this.getRandomInt(this.x+newRadius,this.x+this.width-newRadius);
		var y = this.getRandomInt(this.y+newRadius,this.y+this.height-newRadius);
		this.whiteBound = new WhiteBound(x,y,newRadius);
	}
	_drawWhiteBound(){
		var newRadius = this.blueBound.radius/2;
		var distR = this.blueBound.radius-newRadius;
		var loc = this.blueBound.getRandomCircleLoc(0,distR);
		var whiteBound = new WhiteBound(loc.x,loc.y,newRadius);
		return whiteBound;
	}
	getRandomLoc(){
		 return {x:Math.floor(Math.random()*(this.width - this.x)) + this.x,y:Math.floor(Math.random()*(this.height - this.y)) + this.y};
	}
	getRandomInt(min,max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
	}
	shrinkBound(){
		//TODO: This should occur over many frames
		this.blueBound = new BlueBound(this.whiteBound.x,this.whiteBound.y,this.whiteBound.radius);
		if(this.blueBound.radius == this.whiteBound.radius){
			this.drawNextBound();
		}
	}
	reset(){
		this.whiteBound = new WhiteBound(this.width/2,this.height/2,this.baseBoundRadius);
		this.blueBound = new BlueBound(this.width/2,this.height/2,this.baseBoundRadius);
	}
	checkForMapDamage(object){
		if(this.blueBound.inBounds(object) == false){
			if(object.damageTimer == false){
				object.damageTimer = true;
				setTimeout(this.dealDamage,this.damageRate*1000,{object:object,
					bounds:this.blueBound,
					rate:this.damageRate,
					damage:this.damagePerTick,
					callback:this.dealDamage});
			}
		}
	}
	dealDamage(packet){
		if(packet.bounds.inBounds(packet.object)){
			packet.object.damageTimer = false;
		} else {
			packet.object.health -= packet.damage;
			setTimeout(packet.callback,packet.rate*1000,packet);
		}
	}

	spawnNewShip(id,color){
		var loc = this.getRandomLoc();
		return new Ship(loc.x,loc.y,10,10,color,id)
	}
}

class Bound extends Circle{
	constructor(x,y,radius,color){
		super(x,y,radius,color);
	}
}

class WhiteBound extends Bound{
	constructor(x,y,radius){
		super(x,y,radius,'white');
	}
}

class BlueBound extends Bound{
	constructor(x,y,radius){
		super(x,y,radius,'blue');
	}
}

class Ship extends Rect{
	constructor(x,y,width,height,color,id){
		super(x,y,width,height,color);
		this.health = 100;
		this.baseColor = color;
		this.hitColor = "red";
		this.angle = 90;
		this.isHit = false;
		this.damageTimer = false;
		this.moveForward = false;
		this.moveBackward = false;
		this.turnLeft = false;
		this.turnRight = false;
		this.alive = true;
		this.id = id;
	}
	update(){
		this.checkHP();
		this.move();
	}
	fire(sig){
		return new Bullet(this.x,this.y,2,6,this.baseColor,this.angle,this.id,sig);
	}
	move(){
		if(this.moveForward){
			this.y -= 1;
		}
		if(this.moveBackward){
			this.y += 1;
		}
		if(this.turnLeft){
			this.x -= 1;
		}
		if(this.turnRight){
			this.x += 1;
		}
	}
	handleHit(object){
		if(object.owner != this.id && object.alive && object.damage != null){
			this.health -= object.damage;
		}
	}
	checkHP(){
		if(this.health < 1){
			this.alive = false;
		}
	}
}

class Bullet extends Rect{
	constructor(x,y,width,height,color,angle,owner,sig){
		super(x,y,width,height,color);
		this.angle = angle;
		this.alive = true;
		this.owner = owner;
		this.sig = sig;

		this.lifetime = 5;
		this.speed = 5;
		this.velX = 0;
		this.velY = 0;
		this.damage = 30;	
	}
	update(){
		this.velX = Math.cos((this.angle+90)*(Math.PI/180))*this.speed;
		this.velY = Math.sin((this.angle+90)*(Math.PI/180))*this.speed;
		this.move();
	}
	move(){
		this.x += this.velX;
		this.y += this.velY;
	}
	handleHit(object){
		if(object.id != this.owner){
			this.alive = false;
		}
	}
}

class Asteroid extends Circle{
	constructor(x,y,radius,sig){
		super(x,y,radius,"orange");
		this.sig = sig;
		this.damage = 0;
		this.health = 40;
		this.alive = true;
	}

	update(){

	}
	handleHit(object){
		if(object.alive && object.damage != null){
			this.health -= object.damage;
		}
		if(this.health < 1){
			this.alive = false;
		}
	}
}

class Planet extends Circle {
	constructor(x,y,radius,sig){
		super(x,y,radius,"SkyBlue");
		this.sig = sig;
	}
	handleHit(object){
		return;
	}
}

class CollisionEngine {
	constructor(){

	}
	broadBase(objectArray){
		for (var i = 0; i < objectArray.length; i++) {
    		for (var j = 0; j < objectArray.length; j++) {
	    		if(objectArray[i] == objectArray[j]){
	    			continue;
	    		}
	    		var obj1 = objectArray[i],
	    			obj2 = objectArray[j];

	    		if(this.checkDistance(obj1,obj2)){
    				obj1.handleHit(obj2);
    				obj2.handleHit(obj1);
	    		}
    		}
    	}
	}

	checkDistance(obj1,obj2){
		var distance = Math.sqrt(Math.pow((obj2.x - obj1.x),2) + Math.pow((obj2.y - obj1.y),2));
		if( (distance <= obj1.radius || distance <= obj1.width) || (distance <= obj2.radius || distance <= obj2.width) ){
			return true;
		}
		return false;
	}
}

class Timer {
	constructor(callback,delay){
		this.callback = callback;
		this.delay = delay;
		this.running = false;
		this.started = null;
		this.remaining = delay;
		this.id = null;
		this.start();
	}
	start() {
        this.running = true;
        this.started = new Date()
        this.id = setTimeout(this.callback, this.remaining);
    }

    pause(){
    	this.running = false;
    	clearTimeout(this.id);
    	this.remaining -= new Date() - this.started;
    }
    getTimeLeft(){
    	if(this.running){
    		this.pause();
    		this.start();
    	}
    	if(this.remaining <= 0){
    		clearTimeout(this.id);
    	}
    	return this.remaining/1000;
    }
    reset(){
    	this.running = false;
    	clearTimeout(this.id);
    	this.remaining = this.delay;
    	this.started = null;
    }
    isRunning(){
    	return this.running;
    }
}