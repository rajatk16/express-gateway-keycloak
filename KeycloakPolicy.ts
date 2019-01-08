import * as Eg from "express-gateway";
import * as express from "express";

class KeycloakPolicy implements ExpressGateway.Policy {
    get name() {
        return "keycloak";
    }
    policy(actionParams : any): express.RequestHandler {
        return (req, res, next) => {
            // TODO
        };
    }
}

export {
    KeycloakPolicy,
    KeycloakPolicy as default
}