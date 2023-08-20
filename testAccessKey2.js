const caasClient = require('./api/CaasClient');

(async () => {

    caasClient.init('http://localhost:3001',{accessPassword:"123",accessKey:"64e0c049ee35186f57799847"});

   // await caasClient.addUser("guido@techsoft3d.com",undefined, undefined,"ts3d","Guido", "Hoffmann");
    await caasClient.addUser("peter@techsoft3d.com",undefined,undefined,undefined,undefined,undefined,"64e0cc4adbac4feddaba4ea1");
 //   let info = await caasClient.generateAPIKey("guido2@techsoft3d.com", "ts3d");
    // let i=0;
    
})();