const caasClient = require('./api/CaasClient');

(async () => {

    caasClient.init('http://localhost:3001',null,"64c80d94c6729cdda81dc9bc");


    await caasClient.addUser("Guido", "Hoffmann", "guido2@techsoft3d.com","ts3d");
   // let info = await caasClient.generateAPIKey("guido@techsoft3d.com", "ts3d");
    // let i=0;
    
})();