function updateGameboard(){
	updateBullets();
}

function updateBullets(){
	for(var sig in bulletList){
		var bullet = this.bulletList[sig];
		bullet.velX = Math.cos((bullet.angle+90)*(Math.PI/180))*bullet.speed;
		bullet.velY = Math.sin((bullet.angle+90)*(Math.PI/180))*bullet.speed;
		bullet.x += bullet.velX * deltaTime;
		bullet.y += bullet.velY * deltaTime;
	}
}

function terminateBullet(sig){
	if(bulletList[sig] != undefined){
		delete bulletList[sig];
	}
}

function terminateAsteroid(sig){
	if(asteroidList[sig] != undefined){
		delete asteroidList[sig];
	}
}


function spawnAsteroids(packet){
	packet = JSON.parse(packet);

	for(var i=0;i<packet.length;i++){
		var asteroid = packet[i];
		if(asteroidList[asteroid[0]] == null){
			asteroidList[asteroid[0]] = {};
			asteroidList[asteroid[0]].health = config.asteroidBaseHealth;
			asteroidList[asteroid[0]].sig = asteroid[0];
			asteroidList[asteroid[0]].x = asteroid[1];
			asteroidList[asteroid[0]].y = asteroid[2];
			asteroidList[asteroid[0]].angle = asteroid[3];
			asteroidList[asteroid[0]].radius = asteroid[4];
			asteroidList[asteroid[0]].artType = asteroid[5];
		}
	}
}

function spawnPlanets(packet){
	packet = JSON.parse(packet);

	for(var i=0;i<packet.length;i++){
		var planet = packet[i];
		if(planetList[planet[0]] == null){
			planetList[planet[0]] = {};
			planetList[planet[0]].sig = planet[0];
			planetList[planet[0]].x = planet[1];
			planetList[planet[0]].y = planet[2];
			planetList[planet[0]].radius = planet[3];
			planetList[planet[0]].artType = planet[4];
		}
	}
}

function spawnNebula(packet){
	packet = JSON.parse(packet);

	for(var i=0;i<packet.length;i++){
		var nebula = packet[i];
		if(nebulaList[nebula[0]] == null){
			nebulaList[nebula[0]] = {};
			nebulaList[nebula[0]].sig = nebula[0];
			nebulaList[nebula[0]].x = nebula[1];
			nebulaList[nebula[0]].y = nebula[2];
			nebulaList[nebula[0]].radius = nebula[3];
		}
	}
}

function worldResize(payload){
	payload = JSON.parse(payload);
	world = {};
	world.x = payload[0];
	world.y = payload[1];
	world.width = payload[2];
	world.height = payload[3];
	world.blueBound = {};
	world.blueBound.x = payload[4];
	world.blueBound.y = payload[5];
	world.blueBound.radius = payload[6];
	world.whiteBound = {};
	world.whiteBound.x = payload[7];
	world.whiteBound.y = payload[8];
	world.whiteBound.radius = payload[9];
	console.log("blueBound: " + world.blueBound.radius);
	console.log("whiteBound: " + world.whiteBound.radius);
}

function whiteBoundShrinking(payload){
	payload = JSON.parse(payload);
	if(world.whiteBound != null){
		world.whiteBound.x = payload[0];
		world.whiteBound.y = payload[1];
		world.whiteBound.radius = payload[2];
	}
}

function blueBoundShrinking(payload){
	payload = JSON.parse(payload);
	if(world.blueBound != null){
		world.blueBound.x = payload[0];
		world.blueBound.y = payload[1];
		world.blueBound.radius = payload[2];
	}
}

function weaponFired(payload){
	var id,ship,weaponName,weaponLevel,numBullets,i,bullet;

	payload = JSON.parse(payload);
	id = payload[0];
	ship = shipList[id];
	weaponName = payload[1];
	weaponLevel = payload[2];
	numBullets = payload[3];

	for(i=4;i<numBullets+4;i++){
		bullet = payload[i];
		if(bulletList[bullet[0]] == null){
			bulletList[bullet[0]] = {};
			bulletList[bullet[0]].velX = 0;
			bulletList[bullet[0]].velY = 0;
			bulletList[bullet[0]].owner = id;
			bulletList[bullet[0]].x = bullet[1];
			bulletList[bullet[0]].y = bullet[2];
			bulletList[bullet[0]].angle = bullet[3];
			bulletList[bullet[0]].speed = bullet[4];
			bulletList[bullet[0]].width = bullet[5];
			bulletList[bullet[0]].height = bullet[6];

			setTimeout(terminateBullet,config.bulletLifetime*1000 + 200,bullet[0]);
		}
	}
	if(id == myID){
		lastFired = new Date();
	}
	if(camera.inBounds(ship)){
		if(weaponName == "Blaster"){
        	playSound(blasterShot);
    	}
    	if(weaponName == "PhotonCannon"){
        	playSound(photonCannonShot);
    	}
    	if(weaponName == "MassDriver"){
    		if(weaponLevel == 3){
    			playSound(massDriverShot2);
    		} else{
    			playSound(massDriverShot1);
    		}
    	}
	}
}