const caasClient = require('./api/CaasClient');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";  //temporary fix for certificate issue with CaaS

(async () => {
    caasClient.init('https://caas.techsoft3d.com',{accessKey :"ENTER YOUR ACCESS KEY HERE"});   
    let res = await caasClient.getModels();
    console.log(res);    
})();