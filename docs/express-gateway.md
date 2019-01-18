# Express Gateway

Express gateway is based on the [express framework](https://expressjs.com/). Documentation is available [here](https://www.express-gateway.io/docs/) and the git repo (as useful as the docs) is [here](https://github.com/ExpressGateway/express-gateway)

This document introduces the express gateway and outlines the development of a keycloak plugin.

## Keycloak plugin
Our plugin makes use of the [express gateway plugin framework](https://www.express-gateway.io/docs/plugins/). Plugins are distributed as npm packages.

### Setup the plugin project
1. Create a directory - e.g. **express-gateway-keycloak** and make it the current working directory
2. Run ```npm init``` and fill out the required details
3. We're developing the plugin using typescript, so add typescript as a dev dependency: ```npm install --save-dev typescript```
4. Add in type definitions for node and express:
    - ```npm install --save-dev @types/node```
    - ```npm install --save-dev @types/express```
5. Add in express gateway: ```npm install --save-dev express-gateway```
6. Add in the store that keycloak and the express session will use to store the keycloak cookie: ```npm install memorystore```
    - NOTE: the session store should be made pluggable - the initial iteration is just using memory store
    - NOTE: initially we're storing the token in a session - we'll update the plugin down the track to support bearer tokens on different routes etc
7. Add [keycloak nodejs connect] as a dependency: ```npm install keycloak-connect```
8. Ensure the ```main``` key is set to ```manifest.js```
9. Because we're using typescript, we need to define a ```tsconfig.json``` file as follows:

    ```json
    {
        "compilerOptions": {
            "sourceMap": true,
            "noImplicitAny": false,
            "moduleResolution": "node",
            "module": "commonjs",
            "declaration": true,
            "target": "es5",
            "allowJs": false,
            "experimentalDecorators": true,
            "lib": ["es5", "scripthost", "es2017"]
        },
        "include": [
            "**/*.ts"
        ],
        "exclude": [
            "node_modules"
        ]
    }
    ```
    
    We also add a script to build the project.

10. In addition, you'll want to setup ```.npmignore``` to exclude unnecessary files when publishing the npm package as follows:

    ```
    *.ts
    tsconfig.json
    ```

11. If it's going into version control, you'll have to setup ```.gitignore``` appropriately as well.

We should have a ```package.json``` that looks (roughly) as follows:

```json
{
  "name": "express-gateway-keycloak",
  "version": "0.0.1",
  "description": "Keycloak plugin for express gateway",
  "main": "manifest.js",
  "scripts": {
    "build": "tsc"
  },
  "author": "",
  "license": "MIT",
  "dependencies": {
    "keycloak-connect": "^4.8.2",
    "memorystore": "^1.6.0"
  },
  "devDependencies": {
    "@types/express": "^4.16.0",
    "@types/node": "^10.12.18",
    "typescript": "^3.2.2",
    "json-schema": "^0.2.3",
    "express-gateway": "^1.14.0"
  }
}
```

### The plugin code
Our initial keycloak plugin looks as follows:

```javascript
import * as eg from "express-gateway";
import { createLoggerWithLabel } from "express-gateway/lib/logger"; 
import * as express from "express";
import * as Keycloak from "keycloak-connect";
import * as session from "express-session";
import * as createMemoryStore from "memorystore";

const logger = createLoggerWithLabel("[EG:plugin:keycloak]");

const MemoryStore = createMemoryStore(session);

interface IKeycloakPluginSettings {
    sessionSecret?: string;
    keycloakConfig?: any;
}

const DefaultKeycloakPluginSettings : IKeycloakPluginSettings = {
    sessionSecret: "kc_secret"
};

const KeycloakPlugin : ExpressGateway.Plugin = {
    version: "1.2.0",
    policies: ["keycloak-protect"],
    init: (ctx : ExpressGateway.PluginContext) => {
        // this is slightly dodgy casting, as they don't expose settings on the public interface - but not sure how else you can access custom settings for a plugin
        const pluginSettings : IKeycloakPluginSettings = { ...DefaultKeycloakPluginSettings, ...(ctx as any).settings };
        logger.info(`Initialising Keycloak Plugin with settings: ${JSON.stringify(pluginSettings, null, "\t")}`);
        const sessionStore = new MemoryStore();
        const keycloak = new Keycloak({ store: sessionStore }, pluginSettings.keycloakConfig);
        keycloak.authenticated = (req) => {
            logger.info("-- Keycloak Authenticated: " + JSON.stringify(req.kauth.grant.access_token.content, null, "\t"));
        };
        keycloak.accessDenied = (req, res) => {
            logger.info("-- Keycloak Access Denied");
            res.status(403).end("Access Denied");
        };
        // setup our keycloak middleware
        ctx.registerGatewayRoute(app => {
            logger.info("Registering Keycloak Middleware");
            app.use(session({ store: sessionStore, secret: pluginSettings.sessionSecret }));
            app.use(keycloak.middleware());
        });
        ctx.registerPolicy({
            name: "keycloak-protect",
            schema: {
                $id: "http://express-gateway.io/schemas/policies/keycloak-protect.json",
                type: "object",
                properties: {
                    role: {
                        description: "the keycloak role to restrict access to",
                        type: "string"
                    },
                    jsProtect: {
                        description: "a js snippet to apply for whether a user has access.",
                        type: "string"
                    }
                }
            },
            policy: (actionParams : any) : express.RequestHandler => {
                logger.info(`-- Keycloak Protect: ${JSON.stringify(actionParams, null, "\t")}`);
                if(actionParams.jsProtect) {
                    keycloak.protect((token, req) => {
                        req.egContext.token = token;
                        return req.egContext.run(actionParams.jsProtect);
                    });
                }
                return keycloak.protect(actionParams.role);
            }
        });
    },
    schema: {
        $id: "http://express-gateway.io/schemas/plugin/keycloak.json",
        type: "object",
        properties: {
            sessionSecret: {
                title: "Session Secret",
                description: "The secret to use in encrypting the session cookie",
                type: "string"
            },
            keycloakConfig: {
                title: "Keycloak Configuration",
                description: "This can be used rather than requiring keycloak.json to be present",
                type: "object"
            }
        }
    }
}

export {
    IKeycloakPluginSettings,
    DefaultKeycloakPluginSettings,
    KeycloakPlugin,
    KeycloakPlugin as default
}
```

The plugin enables the keycloak middleware using an express session via ```registerGatewayRoute``` and then registers the keycloak policy via ```registerPolicy```. This means we can apply the policy in express gateway to protect specific endpoints. The ```manifest.ts``` file simple exports this plugin (the manifest.js file is required by the framework) as follows:

```javascript
import KeycloakPlugin from "./KeycloakPlugin"

export = KeycloakPlugin;
```

Now we're good to go and publish this as an npm package - you'll need an npm account if you're using the public npm registry or an appropriate account for an internal/private (e.g. nexus) npm registry

Ensure you build before you publish (i.e. ```npm run build```) and then ```npm publish```.

## Installing express gateway and our keycloak plugin
The quickest way to get started is to install express gateway globally and use the eg command to setup a project:

1. Install with ```npm install -g express-gateway```
2. Create a new gateway project with ```eg gateway create```
    - Choose an appropriate installation path - e.g. ```eg-sample```
    - You can select either option here - we'll be modifying the configuration with our own pipeline anyway
3. Change into the gateway project directory
4. Install our keycloak plugin using ```eg plugins install keycloak``` - you can say yes to both options and this will update the system.config.yml to register the plugin

## Create a sample endpoint
We'll create a simple express back-end as an endpoint for express gateway.
To setup the project:
1. Create a folder called **eg-sample-endpoint** and make it the current working directory
2. Run ```npm init``` and fill out the details as appropriate
3. Add **express** as a dependency: ```npm install express```
4. Add **yargs** as a dependency: ```npm install yargs```. ```yargs``` allows you to specify arguments at the command line, such as --port=3042
5. Create a file names index.js and set the ```main``` property in ```package.json``` to this
6. The index.js file contains the express app and a simple service under the path ```gimme``` that produces some json output with details of the request (such as headers, query params and so on). The source is as follows:

    ```javascript
    const express = require("express");
    const args = require("yargs").argv;

    const app = express();
    app.get("/gimme", (req, res) => {
        // this will send json
        res.send({
            hostname: req.hostname,
            ip: req.ip,
            url: req.url,
            originalUrl: req.originalUrl,
            method: req.method,
            headers: req.headers,
            query: req.query
        });
    });

    const port = args.port || 3042
    app.listen(args.port || 3042, () => {
        console.log(`-- Gimme listening on port ${port}`);
    });
    ```

7. Add a ```start``` script to your ```package.json``` that executes ```node index.js``` - your ```package.json``` should look roughly as follows:

    ```json
    {
        "name": "eg-sample-endpoint",
        "version": "1.0.0",
        "description": "",
        "main": "index.js",
        "scripts": {
            "start": "node index.js",
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        "author": "",
        "license": "ISC",
        "dependencies": {
            "express": "^4.16.4",
            "yargs": "^12.0.5"
        }
    }
    ```

8. Execute ```npm run start``` and the gimme service should be running on port 3042

## Configure the sample endpoint in express gateway
1. Add a new [service endpoint](https://www.express-gateway.io/docs/configuration/gateway.config.yml/serviceEndpoints/) to ```config/gateway.config.yml``` as follows:
    ```yaml
    serviceEndpoints:
        sample:
            url: "http://localhost:3042"
            proxyOptions:
            headers:
                X-Sample-Header: forsample
    ```

   The hea

2. Add a new [api endpoint](https://www.express-gateway.io/docs/configuration/gateway.config.yml/apiEndpoints/) to ```config/gateway.config.yml``` as follows:
    ```yaml
    apiEndpoints:
        gimme:
            host: '*'
            paths: ['/gimme']
    ```
3. Add a new [pipeline](https://www.express-gateway.io/docs/configuration/gateway.config.yml/pipelines/) to ```config/gateway.config.yml``` as follows:
    ```yaml
    pipelines:
        gimme:
            apiEndpoints:
                - gimme
            policies:
                - proxy:
                    - action:
                        serviceEndpoint: sample
                        changeOrigin: true
    ```

    This pipeline currently only configures a [proxy policy](https://www.express-gateway.io/docs/policies/proxy/). This is one of many [built-in policies](https://www.express-gateway.io/docs/policies/)

4. At this point, your ```config/gateway.config.yml``` should look something like:
    ```yaml
    http:
        port: 8080
    admin:
        port: 9876
        hostname: localhost
    apiEndpoints:
        gimme:
            host: '*'
            paths: ['/gimme']
    serviceEndpoints:
        sample:
            url: "http://localhost:3042"
            proxyOptions:
                headers:
                    X-Sample-Header: forsample
    policies:
        - basic-auth
        - cors
        - expression
        - key-auth
        - log
        - oauth2
        - proxy
        - rate-limit
    pipelines:
        gimme:
            apiEndpoints:
                - gimme
            policies:
                - proxy:
                    - action:
                        serviceEndpoint: sample
                        changeOrigin: true
    ```

5. Run the gateway using ```npm run start```

    You should be able to access to gimme sample service on path [](http://localhost:8080/gimme). Note in the json response, our **X-Sample-Header** header (it will appear as ```x-sample-header```)

## Protect the sample endpoint with the keyclock plugin and policy
Before we can make use of keycloak to protect the sample endpoint, we need to have [keycloak setup](./keycloak-basic-setup.md).

### System Config
Ensure that the plugin is enabled in [config/system.config.yml](https://www.express-gateway.io/docs/configuration/system.config.yml/).
Using ```eg plugins install express-gateway-keycloak``` gives you the option of updating both the configurations to enable the plugin and policies provided by the plugin.

```yml
plugins:
  express-gateway-keycloak:
    package: express-gateway-keycloak
```

We need to include the configuration provided from the keycloak client (configured within keycloak) in the plugin configuration as well. The configuration below assumes:

- the realm is **sample**
- the client configured under the sample realm is **express-gateway** - this would probably be named more specifically for a project.
- the keycloak server is listening at http://localhost:9070

```yml
plugins:
  express-gateway-keycloak:
    package: express-gateway-keycloak
    keycloakConfig:
        realm: sample
        auth-server-url: "http://localhost:9070/auth"
        ssl-required: external
        resource: express-gateway
        public-client: true
        confidential-port: 0
```

### Gateway Config
Now that the plugin is enabled and configured appropriately, we can configure the gateway with the updated pipeline. Ensure the **keycloak-protect** policy is enabled in [config/gateway.config.yml](https://www.express-gateway.io/docs/configuration/gateway.config.yml/) as follows:

```yml
policies:
  - basic-auth
  - cors
  - expression
  - key-auth
  - log
  - oauth2
  - proxy
  - rate-limit
  - keycloak-protect
```

Now we can update the **gimme** pipeline to include the **keycloak-protect** policy as follows:
```yml
pipelines:
  gimme:
    apiEndpoints:
      - gimme
    policies:
      - keycloak-protect:
      - proxy:
        - action:
            serviceEndpoint: sample
            changeOrigin: true
```

To test this out, ensure the gateway is running and try the [gimme service](http://localhost:8080/gimme) again. You should be prompted to login via keycloak. To be able to login, you'll need to ensure you've got a user setup in keycloak, or allow for user self-registration.

### Adding headers based on the keycloak grant
We can add headers based on any state available on the request based on the keycloak grant. One example might be adding a the username and email header to the request using the [expression policy](https://www.express-gateway.io/docs/policies/expression/) as follows:

```yml
pipelines:
  gimme:
    apiEndpoints:
      - gimme
    policies:
      - keycloak-protect:
      - expression:
        - action:
            jscode: 'req.headers["x-kc-user-email"] = req.kauth.grant.access_token.content.email; req.headers["x-kc-username"] = req.kauth.grant.access_token.content.preferred_username;'
      - proxy:
        - action:
            serviceEndpoint: sample
            changeOrigin: true
```

Requests to the [gimme service](http://localhost:8080/gimme) should now include the **x-kc-user-email** and **x-kc-username** headers.

### Protecting the endpoint with a keycloak role
In addition to just requiring that a user has a keycloak login, we can also protect the endpoint using a keycloak role (in this case **sample**) as follows:

```yml
pipelines:
  gimme:
    apiEndpoints:
      - gimme
    policies:
      - keycloak-protect:
        - action:
            role: sample
      - expression:
        - action:
            jscode: 'req.headers["x-kc-user-email"] = req.kauth.grant.access_token.content.email; req.headers["x-kc-username"] = req.kauth.grant.access_token.content.preferred_username;'
      - proxy:
        - action:
            serviceEndpoint: sample
            changeOrigin: true
```

If the user doesn't have this role, then they'll get a 403. This uses a client/application role - you can also specify a realm role using the ```realm:``` prefix - e.g. ```realm:sample```.

### Protecting the endpoint with a js snippet
You can also define the protection logic with a js snippet evaluated using [egContext](https://www.express-gateway.io/docs/policies/customization/eg-context/) as follows:

```yml
pipelines:
  gimme:
    apiEndpoints:
      - gimme
    policies:
      - keycloak-protect:
        - action:
            jsProtect: 'token.hasRole("sample") || token.hasRole("gimme")'
      - expression:
        - action:
            jscode: 'req.headers["x-kc-user-email"] = req.kauth.grant.access_token.content.email; req.headers["x-kc-username"] = req.kauth.grant.access_token.content.preferred_username;'
      - proxy:
        - action:
            serviceEndpoint: sample
            changeOrigin: true
```

## [expres gateway tls configuration](#express-gateway-tls)
1. Get or generate a new root CA key and certificate
```
openssl genrsa -out rootCA.key 2048
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1024 -out rootCA.pem
```

2. Generate a server key and certificate signing request, then sign to get our server certificate:

```
openssl req -nodes -newkey rsa:2048 -keyout server.key -out server.csr
openssl x509 -req -days 365 -in server.csr -CA rootCA.pem -CAkey rootCA.key -set_serial 01 -out server.crt
```

3. Update the gateway config to include https settings as follows:

```yaml
https:
  port: 8443
  tls:
    default:
      key: "server.key"
      cert: "server.crt"
```

To use this with keycloak, keycloak will also have to be configured securely - this is outlined in the [keycloak basic setup](./keycloak-basic-setup.md).

We'll need to update our system.config.yml and update the keycloak plugin configuration to indicate a secure url as follows:
```yaml
plugins:
  express-gateway-keycloak:
    package: express-gateway-keycloak
    keycloakConfig:
      realm: sample
      auth-server-url: "https://localhost:9443/auth"
      ssl-required: external
      resource: express-gateway
      public-client: true
      confidential-port: 0
```

## What's next