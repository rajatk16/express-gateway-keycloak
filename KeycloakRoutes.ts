import { IRouter } from "express";

var session = require("express-session");
var Keycloak = require("keycloak-connect");

var memoryStore = new session.MemoryStore();
var keycloak = new Keycloak({ store: memoryStore });

const keycloakRouteExtension = (gatewayExpressApp : IRouter<any>) => {
    gatewayExpressApp.use(session({ secret: "dunno", cookie: { maxAge: 60000 }}));
    gatewayExpressApp.use(keycloak.middleware());
    // NOTE: this obviously has to be configurable
    gatewayExpressApp.use("/nifi", keycloak.protect());
};

export {
    keycloakRouteExtension
}