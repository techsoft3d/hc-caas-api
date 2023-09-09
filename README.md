# CaaS Node/Client-Side API (hc-caas-api)

## Overview

This is the Node.js client-side API for the Communicator as a Service (CaaS) project. It is used to communicate with a CaaS Server Instance. You can use it to convert models to SC/SCZ files, generate images or generate STEP/PDF and other formats. You can either connect to your own instance of CaaS or to the official CaaS Server API available at [https://caas.techsoft3d.com](https://caas.techsoft3d.com).

## Installation


### Server-Side
To install the API, run the following command:

```
npm install hc-caas-api
```

### Client-Side
Copy the caas.min.js file from the dist folder into your project.



## Initialization and Authentication

To initialize the library simply provide the URL of the CaaS server instance you wish to connect to. 

To use the API with the official CaaS server, you will need to obtain an API key. You can request an account at [https://caas-admin.techsoft3d.com](https://caas-admin.techsoft3d.com). Once you have an account, you can generate an API key from the "API Keys" tab. You will need to provide this key when initializing this library. If you are using your own instance of CaaS, authentication is an optional feature.

**Remember that your API key is secret and should not be shared with others or exposed in your client-side code in production!** 


```
 caasClient.init('https://caas.techsoft3d.com',{accessKey :"ENTER YOUR ACCESS KEY HERE"});   
```


## Example Usage

### Simple Conversion
In this example a file is uploaded to the CaaS server from the file system, converted to SC/SCZ and PNG with the default settings. The function `waitUntilConverted` is used to wait until the conversion is complete. The SCS file is then downloaded to the file system after the conversion is complete. 

```
let info = await caasClient.uploadModelFromFile("./testfiles/bnc.hsf");
await caasClient.waitUntilConverted(info.itemid);
await caasClient.getFileByType(info.itemid, "scs", "./output/" + "bnc.hsf.scs");
```

### Conversion with custom polling
In this slightly more elaborate example two files are uploaded to CaaS for conversion and a custom polling mechanism is used to check for completed conversions
```
let pendingModels = [];
pendingModels.push((await caasClient.uploadModelFromFile("./testfiles/bnc.hsf")).itemid);
pendingModels.push((await caasClient.uploadModelFromFile("./testfiles/axe.CATPART")).itemid);

let intervalid = setInterval(async () => {
    if (!pendingModels.length) {
        clearInterval(intervalid);
        return;
    }
    let res = await caasClient.getModelData(pendingModels);
    if (pendingModels.length == 1) {
        res = [res];
    }
    console.log(pendingModels + " " + res.length);
    for (let i=0; i<res.length; i++) {
        console.log(res[i].name + ":" + res[i].conversionState);            
        if (res[i].conversionState != "PENDING") {              
            pendingModels.splice(i, 1);
            caasClient.getFileByType(res[i].storageID, "scs", "./output/" + res[i].name + ".scs");
        }
    }            
}, 1000);
```


### Conversions with Webhooks
Instead of polling to wait for completed conversions a more elegant solution is to use webhooks. If a webhook is passed during intialization, the CaaS server will send a POST request to the webhook URL when a conversion is complete. The POST request will contain a JSON object with information about the converted model.

```
caasClient.init('http://localhost:3001', {webhook:'http://localhost:3000/webhook'});

await caasClient.uploadModelFromFile("./testfiles/bnc.hsf");
await caasClient.uploadModelFromFile("./testfiles/axe.CATPart");

app.use(express.json());
app.post('/webhook', async (req, res) => {
    console.log("Received webhook for " + req.body.name + ".scs") 
    await caasClient.getFileByType(req.body.id, "scs", "./output/" + req.body.name + ".scs");      
    res.sendStatus(200);
});

app.listen(3000);
```

### Custom Conversion Settings
It is possible to override the default conversion settings of CaaS and instead provide your own command line. In this case, we are exporting a STEP file instead of generating SCS/SCZ/PNG files.
```
let info = await caasClient.uploadModelFromFile("./testfiles/axe.CATPART",null,{conversionCommandLine:["--output_step",""]});
await caasClient.waitUntilConverted(info.itemid);
await caasClient.getFileByType(info.itemid, "step", "./output/" + "axe.step");   
```


### Adding Conversion Settings
It is also possible to add additional command line options by specifying a `*` as the first commnand line argument. In this example we also pass in a custom XML settings file that will be used during conversion.
```
let info = await caasClient.uploadModelFromFiles(["./testfiles/axe.CATPART", "././testfiles/he_settings.xml"],"axe.CATPART", {conversionCommandLine:["*","--xml_settings","he_settings.xml"]});
await caasClient.waitUntilConverted(info.data.itemid);
let modelData = await caasClient.getModelData(info.data.itemid);
console.log(modelData);
```

### SCS Viewing
To view an scs model in the browser simply call `getFileByType` with the itemid of the model. In production you would do this in your server application. This buffer can then be send to the webviewer client. In this example we are using express to serve the buffer to the client.

Server:
```
let result =  await caasClient.getFileByType(item.storageID,"scs"); 
if (result.ERROR) {
    res.status(404).json(result);
}
else {
    res.send(Buffer.from(result));
}
```

Client:
```
// Get the SCS file from your server via fetch
let ab = await res.arrayBuffer();
await hwv.model.loadSubtreeFromScsBuffer(hwv.model.getRootNode(), new Uint8Array(ab));
```

Client Only:
For testing purposes you can also get the SCS file directly from the CaaS server in the web client using the client-side version of the API:
```
let buffer =  await caasClient.getFileByType(item.storageID,"scs"); 
if (!buffer.ERROR) {
   await hwv.model.loadSubtreeFromScsBuffer(hwv.model.getRootNode(), new Uint8Array(buffer));
}

```

### Streaming with SCZ Files
To utilize the streaming functionality you need to request a streaming session and make one or more models accessible for streaming. The session data object returned can then be used to start the webviewer with. You don't have to initially pass any modelids to the `getStreamingSession` function. In that case specify "_empty" for the model to load. In a typical application the actual name of the model will be stored as part of your business logic alongside its id when the model was originally converted though you can retrieve all the relevant data of a model with the `getModelData` function.

```

```
/// In production this call should be performed server-side and the result should be passed to the client
let sessiondata = await caasClient.getStreamingSession({accessItems: ["cf41d235-76e3-4903-b6be-6fdc0a5176a5"]);
let sessionid = sessiondata.sessionid;   // The session id is needed to add additional models to the session later

if (!sessiondata.ERROR) {
    viewer = new Communicator.WebViewer({
        containerId: "mycontainer"
        endpointUri: sessiondata.endpointUri,
        model: "bnc.hsf"
        rendererType: Communicator.RendererType.Client)
    });
}
```

### Adding additional models to a streaming session
To add additional models to a streaming session you can use the `enableStreamAccess` function. This function takes an existing sessionid and an array of model ids.

```
/// In production this call should be performed server-side
let saresult = await caasClient.enableStreamAccess(sessionid,[itemid1,itemid2]);

hwv.model.loadSubtreeFromModel(hwv.model.getRootNode(),"model1");
```






