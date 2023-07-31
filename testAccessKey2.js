const caasClient = require('./api/CaasClient');

(async () => {

    let myCaas = new caasClient('http://localhost:3001',null,"64c80d94c6729cdda81dc9bc");


    await myCaas.addUser("Guido", "Hoffmann", "guido2@techsoft3d.com","ts3d");
   // let info = await myCaas.generateAPIKey("guido@techsoft3d.com", "ts3d");
    // let i=0;
    
})();