import * as eg from "express-gateway";
import * as express from "express";
import * as Keycloak from "keycloak-connect";
const session = require("express-session");

const KeycloakPlugin : ExpressGateway.Plugin = {
    version: "1.2.0",
    init: (ctx : ExpressGateway.PluginContext) => {
        const memoryStore = new session.MemoryStore();
        const keycloak = new Keycloak({ store: memoryStore });
        // setup our keycloak middleware
        ctx.registerGatewayRoute(app => {
            // TODO: the secret from some config
            app.use(session({ secret: "dunno", cookie: { maxAge: 60000 }}));
            app.use(keycloak.middleware());
        });
        ctx.registerPolicy({
            name: "keycloak",
            policy: (actionParams : any) : express.RequestHandler => {
                return keycloak.protect(actionParams.role);
            }
        });
    }
}

export {
    KeycloakPlugin,
    KeycloakPlugin as default
}