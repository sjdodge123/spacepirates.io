**Install Instructions**

- Pull repo/download zip file from -> https://github.com/sjdodge123/spaceroyale.io
- Ensure nvm is installed on local machine -> https://github.com/nvm-sh/nvm#installing-and-updating
- Install node version 5.4.1 -> nvm install 5.4.1
- Verify node version -> node -v
- open command prompt or bash shell and navigate to extracted/pulled folder -> cd ~/Downloads/spaceroyale.io
- install all dependencies from package.json -> npm install
- once install completes run server ->  screen -d -m -S webserver node runServer.js
- open a web browser and navigate to localhost:3000 if all went correctly you should now see the website loaded 

2021 Update: Now with auto deployment to Heroku!

For local install : install node 6.10.3 here https://nodejs.org/dist/v6.10.3/
Once installed set the SRIO environment varibles on your machine
run NPM Install, then NPM Start open a browser and check localhost:3000