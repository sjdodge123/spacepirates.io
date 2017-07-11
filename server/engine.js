"use strict";
var utils = require('./utils.js');
var c = utils.loadConfig();

var forceConstant = c.forceConstant;

exports.getEngine = function(bulletList,shipList,asteroidList,planetList,nebulaList,tradeShipList){
	return new Engine(bulletList,shipList,asteroidList,planetList,nebulaList,tradeShipList);
}
exports.slowDown = function(obj,dt,amt){
	slowDown(obj,dt,amt);
}
exports.preventEscape = function(obj,bound){
	preventEscape(obj,bound);
}
exports.preventMovement = function(obj,wall,dt){
	preventMovement(obj,wall,dt);
}

exports.checkDistance = function(obj1, obj2){
	return checkDistance(obj1, obj2);
}
class Engine {
	constructor(bulletList,shipList,asteroidList,planetList,nebulaList,tradeShipList){
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.asteroidList = asteroidList;
		this.planetList = planetList;
		this.nebulaList = nebulaList;
		this.tradeShipList = tradeShipList;
		this.dt = 0;
		this.worldWidth = 0;
		this.worldHeight = 0;
		this.quadTree = null;
	}

	update(dt){
		this.dt = dt;
		this.updateBullets();
		this.updateShips();
	}

	updateBullets(){
		for (var bulletSig in this.bulletList){
			var bullet = this.bulletList[bulletSig];
			bullet.velX = Math.cos((bullet.angle+90)*(Math.PI/180))*bullet.speed;
			bullet.velY = Math.sin((bullet.angle+90)*(Math.PI/180))*bullet.speed;
			bullet.newX += bullet.velX * this.dt;
			bullet.newY += bullet.velY * this.dt;

			for (var i = 0; i < bullet.vertices.length; i++){
				bullet.vertices[i].x += bullet.velX * this.dt;
				bullet.vertices[i].y += bullet.velY * this.dt;
			}

		}
	}

	updateShips(){
		for (var shipSig in this.shipList){
			var ship = this.shipList[shipSig];
			var dirX = 0;
			var dirY = 0;

			if (ship.isAI){
				dirX = ship.targetDirX*.8;
				dirY = ship.targetDirY*.8;
			}
			else{
				if(ship.moveForward && ship.moveBackward == false && ship.turnLeft == false && ship.turnRight == false){
					dirY = -1;
					dirX = 0;
				}
				else if(ship.moveForward == false && ship.moveBackward && ship.turnLeft == false && ship.turnRight == false){
					dirY = 1;
					dirX = 0;
				}
				else if(ship.moveForward == false && ship.moveBackward == false && ship.turnLeft && ship.turnRight == false){
					dirY = 0;
					dirX = -1;
				}
				else if(ship.moveForward == false && ship.moveBackward == false && ship.turnLeft == false && ship.turnRight){
					dirY = 0;
					dirX = 1;
				}
				else if(ship.moveForward && ship.moveBackward == false && ship.turnLeft && ship.turnRight == false){
					dirY = -Math.sqrt(2)/2;
					dirX = -Math.sqrt(2)/2;
				}
				else if(ship.moveForward && ship.moveBackward == false && ship.turnLeft == false && ship.turnRight){
					dirY = -Math.sqrt(2)/2;
					dirX = Math.sqrt(2)/2;
				}
				else if(ship.moveForward == false && ship.moveBackward && ship.turnLeft && ship.turnRight == false){
					dirY = Math.sqrt(2)/2;
					dirX = -Math.sqrt(2)/2;
				}
				else if(ship.moveForward == false && ship.moveBackward && ship.turnLeft == false && ship.turnRight){
					dirY = Math.sqrt(2)/2;
					dirX = Math.sqrt(2)/2;
				}
			}
			if(ship.velocity < ship.maxVelocity){
				ship.velX += ship.acel * dirX * this.dt - .075*ship.velX;
				ship.velY += ship.acel * dirY * this.dt- .075*ship.velY;
			}
			ship.velocity = utils.getMag(ship.velX,ship.velY);
			ship.newX += ship.velX * this.dt;
			ship.newY += ship.velY * this.dt;
		}
	}

	broadBase(objectArray){
		this.quadTree.clear();
		for (var i = 0; i < objectArray.length; i++) {
			this.quadTree.insert(objectArray[i]);
  		}
  		for(var j=0; j<objectArray.length;j++){
  			var obj1 = objectArray[j];
  			var collisionList = [];
  			collisionList = this.quadTree.retrieve(collisionList,obj1);
  			this.narrowBase(obj1,collisionList);
  		}
	}

	narrowBase(obj1,collisionList){
		var dyingBulletList = [];
		for(var i=0; i<collisionList.length;i++){
			var obj2 = collisionList[i];
			if(obj1 == obj2){
				continue;
			}
    		if(obj1.inBounds(obj2)){
  				if(obj1.handleHit(obj2)){
					dyingBulletList.push(obj1);
				}
  				if(obj2.handleHit(obj1)){
					dyingBulletList.push(obj2);
				}
    		}
		}

		for (var j=0; j<dyingBulletList.length;j++){
			dyingBulletList[j].killSelf();
		}
	}

	checkCollideAll(loc,obj){
		var result = false;
		var testLoc = {x:loc.x, y:loc.y, radius:(obj.width || obj.radius)};
		var objectArray = [];
		for(var shipSig in this.shipList){
			objectArray.push(this.shipList[shipSig]);
		}
		for(var asteroidSig in this.asteroidList){
			objectArray.push(this.asteroidList[asteroidSig]);
		}
		for(var nebulaSig in this.nebulaList){
			objectArray.push(this.nebulaList[nebulaSig]);
		}
		for(var planetSig in this.planetList){
			objectArray.push(this.planetList[planetSig]);
		}
		for(var sig in this.bulletList){
			objectArray.push(this.bulletList[sig]);
		}
		for(var i = 0; i < objectArray.length; i++){
			result = checkDistance(testLoc, objectArray[i]);
			if(result){
				return true;
			}
		}
		return result;
	}

	explodeObject(xLoc, yLoc, maxDamage,  radius){
		for (var shipSig in this.shipList){
			var ship = this.shipList[shipSig];
			var distance = utils.getMag(xLoc - ship.x, yLoc - ship.y);
			if(distance  <= (radius + ship.height)){
				var velContX = (forceConstant/Math.pow(distance,2))*(ship.x - xLoc)/distance;
				var velContY = (forceConstant/Math.pow(distance,2))*(ship.y - yLoc)/distance;
				ship.velX += velContX;
				ship.velY += velContY;
				ship.takeDamage(maxDamage * Math.abs(radius-distance)/radius);
			}
		}
	}
	setWorldBounds(width,height){
		this.worldWidth = width;
		this.worldHeight = height;
		this.quadTree = new QuadTree(0,this.worldWidth,0,this.worldHeight,c.quadTreeMaxDepth,c.quadTreeMaxCount,-1);
	}
}

class QuadTree {
	constructor(minX, maxX, minY, maxY, maxDepth, maxChildren, level){
		this.maxDepth = maxDepth;
		this.maxChildren = maxChildren;
		this.minX    = minX;
		this.maxX    = maxX;
		this.minY    = minY;
		this.maxY    = maxY;
		this.width   = maxX - minX;
		this.height  = maxY - minY;
		this.level   = level;
		this.nodes   = [];
		this.objects = [];
	}
	clear(){
		this.objects = [];
		this.nodes = [];
	}
	splitNode(){
		var subWidth  = Math.floor((this.width)/2);
		var subHeight = Math.floor((this.height)/2);

		this.nodes.push(new QuadTree(this.minX, this.minX + subWidth, this.minY, this.minY + subHeight, this.maxDepth, this.maxChildren, this.level + 1));
		this.nodes.push(new QuadTree(this.minX + subWidth, this.maxX, this.minY, this.minY + subHeight, this.maxDepth, this.maxChildren, this.level + 1));
		this.nodes.push(new QuadTree(this.minX, this.minX + subWidth, this.minY + subHeight, this.maxY, this.maxDepth, this.maxChildren, this.level + 1));
		this.nodes.push(new QuadTree(this.minX + subWidth, this.maxX, this.minY + subHeight, this.maxY, this.maxDepth, this.maxChildren, this.level + 1));
	}
	getIndex(obj){
		var index = -1;
		var horizontalMidpoint = this.minX + this.width/2;
		var verticalMidpoint   = this.minY + this.height/2;

		var extents = obj.getExtents();

		if (extents.minX > this.minX && extents.maxX < horizontalMidpoint){
			var leftQuadrant = true;
		}
		if (extents.maxX < this.maxX && extents.minX > horizontalMidpoint){
			var rightQuadrant = true;
		}

		if (extents.minY > this.minY && extents.maxY < verticalMidpoint){
			if (leftQuadrant){
				index = 0;
			}
			else if (rightQuadrant){
				index = 1;
			}
		}
		else if (extents.maxY < this.maxY && extents.minY > verticalMidpoint){
			if (leftQuadrant){
				index = 2;
			}
			else if (rightQuadrant){
				index = 3;
			}
		}
		return index;
	}

	insert(obj){
		if (this.nodes[0] != null){
			var index = this.getIndex(obj);
			if (index != -1){
				this.nodes[index].insert(obj);

				return;
			}
		}
		this.objects.push(obj);

		if (this.objects.length > this.maxChildren && this.level < this.maxDepth){
			if (this.nodes[0] == null){
				this.splitNode();
			}

			var i = 0;
			while(i < this.objects.length){
				var index = this.getIndex(this.objects[i]);
				if (index != -1){
					this.nodes[index].insert(this.objects[i]);
					this.objects.splice(i, 1);
				}
				else{
					i++;
				}
			}
		}
	}
	retrieve(returnObjects, obj){
		var index = this.getIndex(obj);
		if (index != -1 && this.nodes[0] != null){
			this.nodes[index].retrieve(returnObjects, obj);
		}
        returnObjects.push.apply(returnObjects, this.objects);
		return returnObjects;
	}
}

function checkDistance(obj1,obj2){
	var objX1 = obj1.newX || obj1.x;
	var objY1 = obj1.newY || obj1.y;
	var objX2 = obj2.newX || obj2.x;
	var objY2 = obj2.newY || obj2.y;
	var distance = utils.getMag(objX2 - objX1,objY2 - objY1);
  	distance -= obj1.radius || obj1.height/2;
	distance -= obj2.radius || obj2.height/2;
	if(distance <= 0){
		return true;
	}
	return false;
}

function preventMovement(obj,wall,dt){
	var bx = wall.x - obj.x;
	var by = wall.y - obj.y;
	var bMag = utils.getMag(bx,by);
	var bxDir = bx/bMag;
	var byDir = by/bMag;
	var dot = bxDir*obj.velX+byDir*obj.velY;
	var ax = dot * bxDir;
	var ay = dot * byDir;
	obj.velX -= ax;
	obj.velY -= ay;
	obj.newX = obj.x+obj.velX*dt;
	obj.newY = obj.y+obj.velY*dt;
}

function slowDown(obj,dt,amt){
	obj.velX = obj.velX*(1-amt);
	obj.velY = obj.velY*(1-amt);
	obj.newX = obj.x+obj.velX*dt;
	obj.newY = obj.y+obj.velY*dt;
}

function preventEscape(obj,bound){
	if(obj.newX - obj.radius < bound.x){
		obj.newX = obj.x;
		obj.velX = -obj.velX * 0.25;
	}
	if(obj.newX + obj.radius > bound.x + bound.width){
		obj.newX = obj.x;
		obj.velX = -obj.velX * 0.25;
	}
	if (obj.newY - obj.radius < bound.y){
		obj.newY = obj.y;
		obj.velY = -obj.velY * 0.25;
	}
	if(obj.newY + obj.radius > bound.y + bound.height){
		obj.newY = obj.y;
		obj.velY = -obj.velY * 0.25;
	}
}
