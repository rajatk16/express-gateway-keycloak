import * as eg from "express-gateway";
import * as express from "express";
import * as Keycloak from "keycloak-connect";
import * as session from "express-session";
import * as me from "memorystore";

const MemoryStore = me(session);

const KeycloakPlugin : ExpressGateway.Plugin = {
    version: "1.2.0",
    init: (ctx : ExpressGateway.PluginContext) => {
        const sessionStore = new MemoryStore();
        const keycloak = new Keycloak({ store: sessionStore });
        keycloak.authenticated = (req) => {
            console.log("-- Keycloak Authenticated: " + JSON.stringify(req.kauth.grant.access_token.content));
        };
        
        // setup our keycloak middleware
        ctx.registerGatewayRoute(app => {
            // TODO: the secret from some config
            app.use(session({ store: sessionStore, secret: "dunno" }));
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