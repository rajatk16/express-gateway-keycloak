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
        const pluginSettings : IKeycloakPluginSettings = Object.assign({}, DefaultKeycloakPluginSettings, (ctx as any).settings as IKeycloakPluginSettings);
        logger.info(`Initialising Keycloak Plugin with settings: ${JSON.stringify(pluginSettings, null, "\t")}`);
        const sessionStore = new MemoryStore();
        const keycloak = new Keycloak({ store: sessionStore }, pluginSettings.keycloakConfig);
        // setup our keycloak middleware
        ctx.registerGatewayRoute(app => {
            logger.info("Registering Keycloak Middleware");
            app.use(session({ store: sessionStore, secret: pluginSettings.sessionSecret }));
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
    IKeycloakPluginSettings,
    DefaultKeycloakPluginSettings,
    KeycloakPlugin,
    KeycloakPlugin as default
}