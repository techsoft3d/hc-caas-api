const FormData = require('form-data');
const fetch = require('node-fetch');




/** This class provides a wrapper for the CaaS REST API*/
class CaasClient {
    /**
         * Creates a CaaS  Object
         * @param  {string} serveraddress - Address of CaaS User Management Server
         */
    constructor(serveraddress, accessPassword,webhook) {      
        this.serveraddress = serveraddress;
        this.accessPassword = accessPassword;
        this.webhook = webhook;    
    }


    async getInfo() {
        let api_arg = {accessPassword:this.accessPassword};
        let res = await fetch(this.serveraddress + '/caas_api/info', { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.json();
    }


    async uploadModelFromFile(pathtofile, startpath = "") {
        let form = new FormData();
        form.append('file', fs.createReadStream(pathtofile));    
        let api_arg  = {webhook: this.webhook, startPath:startpath, accessPassword:this.accessPassword};            
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

        let api_arg  = {webhook: this.webhook, rootFile:startmodel, accessPassword:this.accessPassword};            
        let res = await fetch(this.serveraddress + '/caas_api/uploadArray', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
        return await res.json();;
    }

    async getUploadToken(modelname, storageid = null) {
        let api_arg = { webhook: this.webhook,accessPassword:this.accessPassword, storageid: storageid};
    
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
        let api_arg = { accessPassword:this.accessPassword};
    
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
        let api_arg = { itemname: modelname,webhook: this.webhook, startPath:startpath, accessPassword:this.accessPassword};
        let res = await fetch(this.serveraddress + '/caas_api/create', {method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.json();
    }

    async reconvertModel(storageid, multiconvert) {
        let api_arg  = {startPath:startpath, multiConvert:multiconvert,accessPassword:this.accessPassword};
        let res = await fetch(this.serveraddress + '/caas_api/reconvert/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.json();
    }

    async createCustomImage(storageid, customImageCode) {
        let api_arg = { accessPassword:this.accessPassword, customImageCode: customImageCode };
        let res = await fetch(this.serveraddress + '/caas_api/customImage/' + storageid, { method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.json();
    }

    async getFileByType(storageid, type) {
        let api_arg = { accessPassword:this.accessPassword};
        let res = await fetch(this.serveraddress + '/caas_api/file/' + storageid + "/" + type, {headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
        return await res.arrayBuffer();
    }

    async deleteModel(storageid) {
        let api_arg = { accessPassword:this.accessPassword};
        let res = await fetch(this.serveraddress + '/caas_api/delete/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) }});
        return await res.json();
    }
    

    async getStreamingSession(geo, renderType = null) {
        let api_arg = { accessPassword:this.accessPassword,geo:geo, renderType: renderType };
        let res = await fetch(this.serveraddress + '/caas_api/streamingSession',{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
        return await res.json();
    };


    async enableStreamAccess(streamingSessionId,storageids) {
        let api_arg = { accessPassword:this.accessPassword};
        let res = await fetch(this.serveraddress + '/caas_api/enableStreamAccess/' + streamingSessionId,{ method: 'put',headers:{'CS-API-Arg': JSON.stringify(api_arg),'items':JSON.stringify(storageids)}});
        return await res.json();
    };


    async getModelData(storageid) {
        let api_arg = { accessPassword:this.accessPassword};
        let res = await fetch(this.serveraddress + '/caas_api/data' + "/" + storageid,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
        return await res.json();
    };

    async getStatus(json) {
        let api_arg = { accessPassword:this.accessPassword};
        let res = await fetch(this.serveraddress + '/caas_api/status' + (json ? '/true' : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
        return await res.json();
    }
}


module.exports = CaasClient;

