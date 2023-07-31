const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');




/** This class provides a wrapper for the CaaS REST API*/
class CaasClient {
    /**
         * Creates a CaaS  Object
         * @param  {string} serveraddress - Address of CaaS User Management Server
         */
    constructor(serveraddress, accessPassword = null,accessKey = null,webhook = null) {      
        this.serveraddress = serveraddress;
        this.accessPassword = accessPassword;
        this.accessKey = accessKey;
        this.webhook = webhook;    
    }

    waitUntilConverted(storageid, interval = 1000) {
        return new Promise(async (resolve, reject) => {
            let checkInterval = setInterval(async () => {
                let info = await this.getModelData(storageid);
                if (info.conversionState != "PENDING") {
                    clearInterval(checkInterval);
                    resolve(info.conversionState);
                }
            }, interval);
        });
    }

    
    async getInfo() {
        let api_arg = {accessPassword:this.accessPassword,accessKey:this.accessKey};
        let res = await fetch(this.serveraddress + '/caas_api/info', { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.json();
    }


    async uploadModelFromFile(pathtofile, startpath = "") {
        let form = new FormData();
        form.append('file', fs.createReadStream(pathtofile));    
        let api_arg  = {webhook: this.webhook, startPath:startpath, accessPassword:this.accessPassword,accessKey:this.accessKey};            
        let res = await fetch(this.serveraddress + '/caas_api/upload', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
        return await res.json();;
    }

    async uploadModelFromFiles(pathtofiles, startmodel = "") {
        let form = new FormData();

        let size = 0;
        for (let i = 0; i < pathtofiles.length; i++) {            
            form.append('files', fs.createReadStream(pathtofiles[i]));
            let stats = fs.statSync(pathtofiles[i]);
            size += stats.size;        
        }

        let api_arg  = {webhook: this.webhook, rootFile:startmodel, accessPassword:this.accessPassword,accessKey:this.accessKey};            
        let res = await fetch(this.serveraddress + '/caas_api/uploadArray', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
        return await res.json();;
    }

    async getUploadToken(modelname, storageid = null) {
        let api_arg = { webhook: this.webhook,accessPassword:this.accessPassword,accessKey:this.accessKey, storageid: storageid};
    
        let res;
        try {
            res = await fetch(this.serveraddress + '/caas_api/uploadToken' + "/" + modelname, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        } catch (error) {
            console.log(error);
            return { error: "Conversion Service can't be reached" };
        }
        return await res.json();;
    }

    async getDownloadToken(storageid, type) {
        let api_arg = { accessPassword:this.accessPassword,accessKey:this.accessKey};
    
        let res;
        try {
            res = await fetch(this.serveraddress + '/caas_api/downloadToken' + "/" + storageid + "/" + type, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        } catch (error) {
            console.log(error);
            return { error: "Conversion Service can't be reached" };
        }
        return await res.json();
    }

    async createEmptyModel(modelname, startpath ="", storageid = null) {
        let api_arg = { itemname: modelname,webhook: this.webhook, startPath:startpath, accessPassword:this.accessPassword,accessKey:this.accessKey};
        let res = await fetch(this.serveraddress + '/caas_api/create', {method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.json();
    }

    async reconvertModel(storageid, multiconvert) {
        let api_arg  = {startPath:startpath, multiConvert:multiconvert,accessPassword:this.accessPassword,accessKey:this.accessKey};
        let res = await fetch(this.serveraddress + '/caas_api/reconvert/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.json();
    }

    async createCustomImage(storageid, customImageCode) {
        let api_arg = { accessPassword:this.accessPassword,accessKey:this.accessKey, customImageCode: customImageCode };
        let res = await fetch(this.serveraddress + '/caas_api/customImage/' + storageid, { method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.json();
    }

    async getFileByType(storageid, type, outputPath = null) {
        let api_arg = { accessPassword: this.accessPassword,accessKey:this.accessKey };
        let res = await fetch(this.serveraddress + '/caas_api/file/' + storageid + "/" + type, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        if (res.status == 404) {
            return { ERROR: "File not found" };
        }
        else {
            let buffer = await res.arrayBuffer();
            if (outputPath) {
                fs.writeFileSync(outputPath, Buffer.from(buffer));
            }
            return {arrayBuffer: buffer};
        }
    }

    async deleteModel(storageid) {
        let api_arg = { accessPassword:this.accessPassword,accessKey:this.accessKey};
        let res = await fetch(this.serveraddress + '/caas_api/delete/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) }});
        return await res.json();
    }
    

    async getStreamingSession(geo, renderType = null) {
        let api_arg = { accessPassword:this.accessPassword,accessKey:this.accessKey,geo:geo, renderType: renderType };
        let res = await fetch(this.serveraddress + '/caas_api/streamingSession',{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
        return await res.json();
    };


    async enableStreamAccess(streamingSessionId,storageids) {
        let api_arg = { accessPassword:this.accessPassword,accessKey:this.accessKey};
        let res = await fetch(this.serveraddress + '/caas_api/enableStreamAccess/' + streamingSessionId,{ method: 'put',headers:{'CS-API-Arg': JSON.stringify(api_arg),'items':JSON.stringify(storageids)}});
        return await res.json();
    };


    async getModels() {
        let api_arg = { accessPassword:this.accessPassword,accessKey:this.accessKey};
        let res = await fetch(this.serveraddress + '/caas_api/items',{ headers:{'CS-API-Arg': JSON.stringify(api_arg)}});
        return await res.json();
    };


    async getModelData(storageids) {
        let api_arg = { accessPassword:this.accessPassword,accessKey:this.accessKey};

        if (storageids instanceof Array) {
            api_arg.itemids = storageids;            
        }
        let res = await fetch(this.serveraddress + '/caas_api/data' +  "/" + (api_arg.storageids ? "" : storageids),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
        return await res.json();
    };

    async getStatus(json) {
        let api_arg = { accessPassword:this.accessPassword,accessKey:this.accessKey};
        let res = await fetch(this.serveraddress + '/caas_api/status' + (json ? '/true' : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
        return await res.json();
    }
}


module.exports = CaasClient;

