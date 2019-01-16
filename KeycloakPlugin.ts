import * as eg from "express-gateway";
import * as express from "express";
import * as Keycloak from "keycloak-connect";
import * as session from "express-session";
import * as createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

interface IKeycloakPlugin extends ExpressGateway.Plugin {
    sessionSecret?: string;
    keycloakConfig?: any;
}

const KeycloakPlugin : IKeycloakPlugin = {
    version: "1.2.0",
    policies: ["keycloak-protect"],
    init: (ctx : ExpressGateway.PluginContext) => {
        const sessionStore = new MemoryStore();
        const keycloak = new Keycloak({ store: sessionStore }, KeycloakPlugin.keycloakConfig);
        // setup our keycloak middleware
        ctx.registerGatewayRoute(app => {
            app.use(session({ store: sessionStore, secret: KeycloakPlugin.sessionSecret || "kc_secret" }));
            app.use(keycloak.middleware());
        });
        ctx.registerPolicy({
            name: "keycloak-protect",
            schema: {
                $id: "http://express-gateway.io/schemas/policy/keycloak-protect.json",
                type: "object",
                properties: {
                    role: {
                        title: "role",
                        description: "the keycloak role to restrict access to",
                        type: "string"
                    }
                }
            },
            policy: (actionParams : any) : express.RequestHandler => {
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
    IKeycloakPlugin,
    KeycloakPlugin,
    KeycloakPlugin as default
}