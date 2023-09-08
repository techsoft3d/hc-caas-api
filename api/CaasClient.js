const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

let serveraddress, accessPassword = "", accessKey = null, webhook = null;

function _exportToFile(data, filename) {

  function _makeBinaryFile(text) {
      let data = new Blob([text],  {type: "application/octet-stream"});           
      let file = window.URL.createObjectURL(data);   
      return file;
    }


  let link = document.createElement('a');
  link.setAttribute('download', filename);
  link.href = _makeBinaryFile(data);
  document.body.appendChild(link);

  window.requestAnimationFrame(function () {
      let event = new MouseEvent('click');
      link.dispatchEvent(event);
      document.body.removeChild(link);
  });
}              


/**
 * Initializes the CaaS client with the specified server address and configuration.
 *
 * @param {string} serveraddress_in - The URL of the CaaS server.
 * @param {Object} [config=null] - The configuration object for the CaaS client.
 * @param {string} [config.accessPassword=""] - The password for the CaaS API.
 * @param {string} config.accessKey - The access key for the CaaS API.
 * @param {string} config.webhook - The webhook for the CaaS API.
 */
function init(serveraddress_in, config = null) {
  serveraddress = serveraddress_in;
  if (config) {
    accessPassword = config.accessPassword ? config.accessPassword : "";
    accessKey = config.accessKey;
    webhook = config.webhook;
  }
}

function setAccessKey(accessKey_in) {
  accessKey = accessKey_in;
} 

/**
 * Waits until the specified model has finished converting before resolving the Promise.
 *
 * @param {string} storageid - The ID of the model to wait for.
 * @param {number} [interval=1000] - The interval at which to check the model's conversion state (in milliseconds).
 * @returns {Promise<string>} - A Promise that resolves to the model's conversion state when it has finished converting.
 */
async function waitUntilConverted(storageid, interval = 1000) {
  return new Promise(async (resolve, reject) => {
    let checkInterval = setInterval(async () => {
      let info = await getModelData(storageid);
      if (info.conversionState != "PENDING") {
        clearInterval(checkInterval);
        resolve(info.conversionState);
      }
    }, interval);
  });
}


/**
 * Retrieves information about the CaaS API from the server.
 *
 * @returns {Promise<Object>} - A Promise that resolves to an object containing information about the CaaS API.
 */
async function getInfo() {
  let api_arg = {accessPassword: accessPassword, accessKey: accessKey};
  let res = await fetch(serveraddress + '/caas_api/info', { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}



/**
 * Uploads a model file from a file input element to the CaaS server.
 *
 * @param {File} file - The model file to upload.
 * @param {string} [startpath=""] - The starting path for the uploaded file (optional).
 * @param {Object} [args={}] - Additional arguments to pass to the CaaS API (optional).
 * @returns {Promise<Object>} - A Promise that resolves to the response from the CaaS API.
 */async function uploadModelFromFileInput(file, startpath = "", args = {}) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (function (theFile) {
      return async function (e) {
        let result = await caasClient.uploadModel(theFile.name, new Blob([e.target.result]), startpath, args);
        result.inputfilename = theFile.name;
        resolve(result);      
      };
    })(file);
    reader.readAsArrayBuffer(file);
   });
}

async function _uploadModel(formData, startpath = "", args = {}) {
  let api_arg = { conversionCommandLine: args.conversionCommandLine,skipConversion: args.skipConversion,hcVersion: args.hcVersion, webhook: webhook, startPath: startpath, accessPassword: accessPassword, accessKey: accessKey };
  let res = await fetch(serveraddress + '/caas_api/upload', { method: 'POST', body: formData, headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

/**
 * Uploads a model file to the CaaS server.
 *
 * @param {string} filename - The name of the model file.
 * @param {Blob} blob - The model file to upload.
 * @param {string} [startpath=""] - The starting path for the uploaded file (optional).
 * @param {Object} [args={}] - Additional arguments to pass to the CaaS API (optional).
 * @returns {Promise<Object>} - A Promise that resolves to the response from the CaaS API.
 */
async function uploadModel(filename,blob, startpath = "", args = {}) {
  let form = new FormData();
  form.append('file', blob,filename);    
  return await _uploadModel(form, startpath, args);
}


/**
 * Uploads an array of model files to the CaaS server.
 *
 * @param {string[]} filenames - An array of names for the model files.
 * @param {Blob[]} blobs - An array of model files to upload.
 * @param {string} [startmodel=""] - The name of the starting model file (optional).
 * @param {Object} [args={}] - Additional arguments to pass to the CaaS API (optional).
 * @param {string} [args.conversionCommandLine=""] - The command line to use for model conversion (optional).
 * @param {boolean} [args.skipConversion=false] - Whether to skip model conversion (optional).
 * @param {string} [args.hcVersion=""] - The version of HOOPS Communicator to use for model conversion (optional).
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the total size of the uploaded files and the response from the CaaS API.
 */
async function uploadModels(filenames,blobs, startmodel = "", args = {}) {
  let form = new FormData();
  let size = 0;
  for (let i = 0; i < filenames.length; i++) {            
    form.append('files', blobs[i],filenames[i]);  
    size += blobs[i].size;  
  }
  let api_arg  = {conversionCommandLine: args.conversionCommandLine, skipConversion: args.skipConversion, hcVersion: args.hcVersion,webhook: webhook, rootFile:startmodel, accessPassword:accessPassword, accessKey:accessKey};            
  let res = await fetch(serveraddress + '/caas_api/uploadArray', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
  let json =  await res.json();
  return {totalsize:size, data:json};
}


/**
 * Uploads a model file to the CaaS server from the file system.
 *
 * @param {string} filename - The name of the model file.
 * @param {Blob} blob - The model file to upload.
 * @param {string} [startpath=""] - The starting path for the uploaded file (optional).
 * @param {Object} [args={}] - Additional arguments to pass to the CaaS API (optional).
 * @returns {Promise<Object>} - A Promise that resolves to the response from the CaaS API.
 */
async function uploadModelFromFile(pathtofile, startpath = "", args = {}) {
  let form = new FormData();
  form.append('file', fs.createReadStream(pathtofile));    
  return await _uploadModel(form, startpath, args);
}


/**
 * Uploads an array of model files to the CaaS server from the file system.
 *
 * @param {string[]} pathtofiles - An array of filepaths.
 * @param {string} [startmodel=""] - The name of the starting model file (optional).
 * @param {Object} [args={}] - Additional arguments to pass to the CaaS API (optional).
 * @param {string} [args.conversionCommandLine=""] - The command line to use for model conversion (optional).
 * @param {boolean} [args.skipConversion=false] - Whether to skip model conversion (optional).
 * @param {string} [args.hcVersion=""] - The version of HOOPS Communicator to use for model conversion (optional).
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the total size of the uploaded files and the response from the CaaS API.
 */
async function uploadModelFromFiles(pathtofiles, startmodel = "",args ={}) {
  let form = new FormData();

  let size = 0;
  for (let i = 0; i < pathtofiles.length; i++) {            
    form.append('files', fs.createReadStream(pathtofiles[i]));
    let stats = fs.statSync(pathtofiles[i]);
    size += stats.size;        
  }

  let api_arg  = {conversionCommandLine: args.conversionCommandLine, skipConversion: args.skipConversion, hcVersion: args.hcVersion,webhook: webhook, rootFile:startmodel, accessPassword:accessPassword, accessKey:accessKey};            
  let res = await fetch(serveraddress + '/caas_api/uploadArray', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
  let json =  await res.json();
  return {totalsize:size, data:json};
}

/**
 * Retrieves an upload token for the specified model from the CaaS server.
 *
 * @param {string} modelname - The name of the model to retrieve an upload token for.
 * @param {number} size - The size of the model file (in bytes).
 * @param {Object} [args={}] - Additional arguments to pass to the CaaS API (optional).
 * @param {string} [args.hcVersion=""] - The version of HOOPS Communicator to use for model conversion (optional).
 * @param {string} [args.storageid=""] - The ID of the storage to upload the model to (optional).
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the upload token for the specified model.
 */
async function getUploadToken(modelname, size, args = {}) {
  let api_arg = { hcVersion: args.hcVersion, webhook: webhook, accessPassword:accessPassword, accessKey:accessKey, storageid: args.storageid};

  let res;
  try {
    res = await fetch(serveraddress + '/caas_api/uploadToken' + "/" + modelname + "/" + size, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  } catch (ERROR) {
    console.log(ERROR);
    return { ERROR: "Conversion Service can't be reached" };
  }
  return await res.json();
}


/**
 * Retrieves a download token for the specified model from the CaaS server.
 *
 * @param {string} storageid - The ID of the model to retrieve a download token for.
 * @param {string} type - The type of the model to retrieve a download token for.
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the download token for the specified model.
 */
async function getDownloadToken(storageid, type) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};

  let res;
  try {
    res = await fetch(serveraddress + '/caas_api/downloadToken' + "/" + storageid + "/" + type, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  } catch (ERROR) {
    console.log(ERROR);
    return { ERROR: "Conversion Service can't be reached" };
  }
  return await res.json();
}

/**
 * Retrieves a download token for the specified model from the CaaS server.
 *
 * @param {string} storageid - The ID of the model to retrieve a download token for.
 * @param {string} type - The type of the model to retrieve a download token for.
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the download token for the specified model.
 */
async function createEmptyModel(modelname, config= {}) {
  let api_arg = { hcVersion: config.hcVersion, itemname: modelname, webhook: webhook, accessPassword:accessPassword, accessKey:accessKey,
    startPath:config.startPath, processShattered:config.processShattered, conversionCommandLine: config.conversionCommandLine, skipConversion: config.skipConversion
  };
  let res = await fetch(serveraddress + '/caas_api/create', {method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}


/**
 * Retrieves a download token for the specified model from the CaaS server.
 *
 * @param {string} storageid - The ID of the model to retrieve a download token for.
 * @param {string} type - The type of the model to retrieve a download token for.
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the download token for the specified model.
 */
async function reconvertModel(storageid, config = {}) {

  let api_arg = { hcVersion: config.hcVersion, accessPassword:accessPassword, accessKey:accessKey,
    startPath:config.startPath, multiConvert:config.multiConvert, conversionCommandLine:config.conversionCommandLine, processShattered:config.processShattered,
     overrideItem:config.overrideItem, waitUntilConversionDone: config.waitUntilConversionDone};

  let res = await fetch(serveraddress + '/caas_api/reconvert/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

/**
 * Creates a custom image with the specified storage ID on the CaaS server.
 *
 * @param {string} storageid - The storage ID of the model to create a custom image for.
 * @param {Object} [config_in={}] - Additional configuration options for the custom image creation (optional).
 * @param {string} [config_in.customImageCode=""] - The custom image code to use for the model (optional).
 * @param {string} [config_in.conversionCommandLine=""] - The command line to use for model conversion (optional).
 * @returns {Promise<Object>} - A Promise that resolves to the response from the CaaS API.
 */
async function createCustomImage(storageid, config_in) {
  let config = config_in ? config_in : {};
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey, customImageCode: config.customImageCode,conversionCommandLine : config.conversionCommandLine};
  let res = await fetch(serveraddress + '/caas_api/customImage/' + storageid, { method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

/**
 * Retrieves a file of the specified type for the specified model from the CaaS server.
 *
 * @param {string} storageid - The ID of the model to retrieve a file for.
 * @param {string} type - The type of file to retrieve (e.g. "fbx", "usd", "glb", etc.).
 * @param {string} [outputPath=null] - The path to save the retrieved file to (optional).
 * @returns {Promise<ArrayBuffer>|Promise<Object>} - A Promise that resolves to an ArrayBuffer containing the retrieved file, or an object containing an error message if the file is not found.
 */
async function getFileByType(storageid, type, outputPath = null) {
  let api_arg = { accessPassword: accessPassword, accessKey:accessKey };
  let res = await fetch(serveraddress + '/caas_api/file/' + storageid + "/" + type, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  if (res.status == 404) {
    return { ERROR: "File not found" };
  }
  else {
    let buffer = await res.arrayBuffer();
    if (outputPath) {
      if (typeof fs !== 'undefined') {
        fs.writeFileSync(outputPath, Buffer.from(buffer));
      }
      else {
        _exportToFile(buffer, outputPath);
      }
    }
    return buffer;
  }
}

/**
 * Retrieves a file with the specified name for the specified model from the CaaS server.
 *
 * @param {string} storageid - The ID of the model to retrieve a file for.
 * @param {string} name - The name of the file to retrieve.
 * @param {string} [outputPath=null] - The path to save the retrieved file to (optional).
 * @returns {Promise<ArrayBuffer>|Promise<Object>} - A Promise that resolves to an ArrayBuffer containing the retrieved file, or an object containing an error message if the file is not found.
 */
async function getFileByName(storageid, name, outputPath = null) {
  let api_arg = { accessPassword: accessPassword, accessKey:accessKey };
  let res = await fetch(serveraddress + '/caas_api/fileByName/' + storageid + "/" + name, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  if (res.status == 404) {
    return { ERROR: "File not found" };
  }
  else {
    let buffer = await res.arrayBuffer();
    if (outputPath) {
      if (typeof fs !== 'undefined') {
        fs.writeFileSync(outputPath, Buffer.from(buffer));
      }
      else {
        _exportToFile(buffer, outputPath);
      }
    }
    return buffer
  }
}

/**
 * Deletes the model with the specified storage ID from the CaaS server.
 *
 * @param {string} storageid - The storage ID of the model to delete.
 * @returns {Promise<Object>} - A Promise that resolves to the response from the CaaS API.
 */
async function deleteModel(storageid) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/delete/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) }});
  return await res.json();
}

/**
 * Retrieves a streaming session for the specified geometry and render type from the CaaS server.
 *
 * @param {string} [geo=undefined] - The geometry to retrieve a streaming session for (optional).
 * @param {string} [renderType=null] - The render type to retrieve a streaming session for (optional).
 * @param {Array<string>} [accessItems=undefined] - The access items to retrieve a streaming session for (optional).
 * @param {string} [hcVersion=undefined] - The version of HOOPS Communicator to use for the streaming session (optional).
 * @returns {Promise<Object>} - A Promise that resolves to the response from the CaaS API.
 */
async function getStreamingSession(geo = undefined, renderType = null, accessItems = undefined,hcVersion = undefined) {
  let api_arg = { hcVersion: hcVersion, accessPassword:accessPassword, accessKey:accessKey, geo:geo, renderType: renderType,accessItems:accessItems };
  let res = await fetch(serveraddress + '/caas_api/streamingSession',{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
  return await res.json();
};


/**
 * Enables stream access for the specified storage IDs on the specified streaming session.
 *
 * @param {string} streamingSessionId - The ID of the streaming session to enable stream access on.
 * @param {Array<string>} storageids - An array of storage IDs to enable stream access for.
 * @returns {Promise<Object>} - A Promise that resolves to the response from the CaaS API.
 */
async function enableStreamAccess(streamingSessionId,storageids) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/enableStreamAccess/' + streamingSessionId,{ method: 'put',headers:{'CS-API-Arg': JSON.stringify(api_arg),'items':JSON.stringify(storageids)}});
  return await res.json();
};

/**
 * Retrieves a list of models from the CaaS server.
 *
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the list of models.
 */
async function getModels() {
  let api_arg = { accessPassword: accessPassword, accessKey: accessKey };
  let res = await fetch(serveraddress + '/caas_api/items', { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}


/**
 * Retrieves model data for the specified storage IDs from the CaaS server.
 *
 * @param {string|Array<string>} storageids - The storage ID or array of storage IDs to retrieve model data for.
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the model data for the specified storage IDs.
 */
async function getModelData(storageids) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};

  if (storageids instanceof Array) {
    api_arg.itemids = storageids;            
  }
  try {
    let res = await fetch(serveraddress + '/caas_api/data' +  "/" + (api_arg.itemids ? "" : storageids),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
    return await res.json();
  } catch (ERROR) {
    return { ERROR: "Conversion Service can't be reached" };
  }
};


/**
 * Initializes a new WebViewer instance with the specified data and configuration.
 *
 * @param {Object} data - An object containing the data to use for initialization.
 * @param {string} data.port - The port to use for the endpoint URI.
 * @param {string} data.serverurl - The server URL to use for the endpoint URI.
 * @param {string} data.sessionid - The session ID to use for the endpoint URI.
 * @param {string} [config.containerId='viewer'] - The ID of the container element to use for the WebViewer (optional).
 * @param {string} [config.model='_empty'] - The model to use for the WebViewer (optional).
 * @param {string} [data.renderType='client'] - The renderer type to use for the WebViewer (optional).
 * @returns {Communicator.WebViewer} - A new WebViewer instance.
 */
function initializeWebViewer(data, config) {
  if (!config) {
    config = {};
  }
  let viewer = new Communicator.WebViewer({
    containerId: config && config.containerId ? config.containerId : 'viewer',
    endpointUri: (data.port == "443" ? 'wss://' : "ws://") + data.serverurl + ":" + data.port + '?token=' + data.sessionid,
    model: (config.model ? config.model : "_empty"),
    rendererType: ((data.renderType && data.renderType == "server") ? Communicator.RendererType.Server : Communicator.RendererType.Client)
  });
  return viewer;
}

/**
 * Retrieves the status of the CaaS server.
 *
 * @param {boolean} [json=false] - Whether to return the status as JSON (optional).
 * @returns {Promise<Object>} - A Promise that resolves to the response from the CaaS API.
 */
async function getStatus(json) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/status' + (json ? '/true' : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function checkPassword(email,password) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/checkPassword/' + email + "/" + password,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function getUserInfo(email,password) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/userInfo/' + email + "/" + password,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function changeOrgName(email,password, orgid,orgname) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/changeOrgName/' + email + "/" + password + "/" + orgid + "/" + orgname,{method: 'put',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function getUsers(email,password, orgid) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/getUsers/' + email + "/" + password +  (orgid ? ("/" + orgid) : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}



async function retrieveInvite(inviteid) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/retrieveInvite/' + inviteid,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function acceptInvite(inviteid,password) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/acceptInvite/' + inviteid + (password ? ("/" + password) : ""),{method: 'put',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function addUser(email,role = 1,ownerEmail = undefined, ownerPassword = undefined,password = undefined,firstName = undefined, lastName = undefined,organizationID = undefined) {

  let fbody = JSON.stringify({
    'firstName': firstName,
    'lastName': lastName,
    'email': email,
    'password': password,
    'organizationID': organizationID,
    'role': role
  });

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/addUser', {  body: fbody, mode:'cors', method: 'POST',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),
          "Content-type": "application/json; charset=UTF-8"
      } });

  return await res.json();
}


async function updateUser(email,role = undefined,ownerEmail = undefined, ownerPassword = undefined,password = undefined,firstName = undefined, lastName = undefined,organizationID = undefined) {

  let fbody = JSON.stringify({
    'firstName': firstName,
    'lastName': lastName,
    'email': email,
    'password': password,
    'organizationID': organizationID,
    'role': role
  });

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/updateUser', {  body: fbody, mode:'cors', method: 'POST',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),
          "Content-type": "application/json; charset=UTF-8"
      } });

  return await res.json();
}

async function removeUser(email,organizationID,ownerEmail = undefined, ownerPassword = undefined) {


  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/removeUser' + "/" + email + "/" + organizationID, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function deleteUser(email,ownerEmail = undefined, ownerPassword = undefined) {


  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/deleteUser' + "/" + email, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function deleteOrganization(orgid,ownerEmail = undefined, ownerPassword = undefined) {


  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/deleteOrganization' + "/" + orgid, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function setSuperUser(email,superuser,ownerEmail = undefined, ownerPassword = undefined) {


  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/setSuperUser' + "/" + email + "/" + superuser, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function resetPassword(email,ownerEmail = undefined, ownerPassword = undefined) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/resetPassword' + "/" + email, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function addOrganization(organizationname,ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/addOrganization' + "/" + organizationname, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function getOrganizations(ownerEmail, ownerPassword, getAll = false) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/getOrganizations' + (getAll ? ("/" + getAll) : ""), {  mode:'cors', 
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function getOrganization(orgid, ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/getOrganization' + "/" + orgid, {  mode:'cors', 
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function switchOrganization(orgid, ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/switchOrganization' + "/" + orgid, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}



async function getAPIKeys(ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/getAPIKeys', {  mode:'cors', 
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function invalidateAPIKey(key, ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/invalidateAPIKey' + "/" + key, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function editAPIKey(key,name, ownerEmail, ownerPassword) {

  let api_arg = { name: name,accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/editAPIKey' + "/" + key, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function generateAPIKey(name, ownerEmail, ownerPassword) {
  let api_arg = { name: name,accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/generateAPIKey',{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function updateOrgTokens(orgid,tokens, ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/updateOrgTokens' + "/" + orgid + "/" + tokens,{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}



async function updateOrgMaxStorage(orgid,maxstorage, ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/updateOrgMaxStorage' + "/" + orgid + "/" + maxstorage,{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function getStatsByMonth(orgid,month,year, ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/getStatsByMonth' + "/" + orgid + "/" + month + "/" + year,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function injectStats(orgid,stats, ownerEmail, ownerPassword) {
  let api_arg = {stats: stats,accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/injectStats' + "/" + orgid ,{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function updatePassword(newpassword,ownerEmail, ownerPassword) {
  let api_arg = {newpassword: newpassword,accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/updatePassword',{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function getFiles(orgid,ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/getFiles' + "/" + orgid,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function getDataAuth(itemid, orgid,ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/getDataAuth' + "/" + itemid + "/" + orgid,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function deleteAuth(orgid,itemid,ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/deleteAuth' + "/" + orgid + "/" + itemid,{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function getItemFromType(orgid,itemid,type,ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/getItemFromType' + "/" + orgid + "/" + itemid + (type ? ("/" + type) : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  if (res.status == 404) {
    return { ERROR: "File not found" };
  }
  else {
    let buffer = await res.arrayBuffer();  
    return buffer;
  }
}


module.exports = {
  init,
  waitUntilConverted,
  getInfo,
  uploadModel,
  uploadModelFromFileInput,
  uploadModelFromFile,
  uploadModelFromFiles,
  getUploadToken,
  getDownloadToken,
  createEmptyModel,
  reconvertModel,
  createCustomImage,
  getFileByType,
  getFileByName,
  deleteModel,
  getStreamingSession,
  enableStreamAccess,
  getModels,
  getModelData,
  getStatus,
  generateAPIKey,
  addUser,
  checkPassword,
  getUserInfo,
  changeOrgName,
  retrieveInvite,
  acceptInvite,
  getUsers,
  removeUser,
  updateUser,
  addOrganization,
  getOrganizations,
  getOrganization,
  switchOrganization,
  getAPIKeys,
  invalidateAPIKey,
  editAPIKey,
  updateOrgTokens,
  updatePassword,
  getStatsByMonth,
  injectStats,
  initializeWebViewer,
  getFiles,
  setAccessKey,
  deleteAuth,
  getItemFromType,
  setSuperUser,
  deleteUser,
  deleteOrganization,
  updateOrgMaxStorage,
  resetPassword,
  getDataAuth,
  uploadModels
};