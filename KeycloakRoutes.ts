import { IRouter } from "express";

var session = require("express-session");
var Keycloak = require("keycloak-connect");

var memoryStore = new session.MemoryStore();
var keycloak = new Keycloak({ store: memoryStore });

const keycloakRouteExtension = (gatewayExpressApp : IRouter<any>) => {
    gatewayExpressApp.use(keycloak.middleware());
};

export {
    keycloakRouteExtension
}