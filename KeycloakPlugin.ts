import * as eg from "express-gateway";
import * as express from "express";
import * as Keycloak from "keycloak-connect";
import * as session from "express-session";
import * as createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

interface IKeycloakPlugin extends ExpressGateway.Plugin {
    sessionSecret: string;
}

const KeycloakPlugin : IKeycloakPlugin = {
    version: "1.2.0",
    policies: ["keycloak"],
    sessionSecret: "kc_secret",
    init: (ctx : ExpressGateway.PluginContext) => {
        const sessionStore = new MemoryStore();
        const keycloak = new Keycloak({ store: sessionStore });
        // setup our keycloak middleware
        ctx.registerGatewayRoute(app => {
            // TODO: the secret from some config
            app.use(session({ store: sessionStore, secret: KeycloakPlugin.sessionSecret }));
            app.use(keycloak.middleware());
        });
        ctx.registerPolicy({
            name: "keycloak",
            schema: {
                type: "object",
                properties: {
                    role: {
                        title: "role",
                        description: "the keycloak role to restrict access to",
                        type: "string",
                        required: false
                    }
                }
            },
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