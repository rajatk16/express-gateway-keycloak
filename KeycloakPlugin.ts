import * as Eg from "express-gateway";
import { keycloakRouteExtension } from "./KeycloakRoutes";

class KeycloakPlugin implements ExpressGateway.Plugin {
    init(ctx : ExpressGateway.PluginContext) {
        ctx.registerGatewayRoute(keycloakRouteExtension);
    }
}

export {
    KeycloakPlugin,
    KeycloakPlugin as default
}