import * as Eg from "express-gateway";
import { keycloakRouteExtension } from "./KeycloakRoutes";

class KeycloakPlugin implements ExpressGateway.Plugin {
    get version() {
        return "0.0.5";
    }
    init(ctx : ExpressGateway.PluginContext) {
        ctx.registerGatewayRoute(keycloakRouteExtension);
    }
}

export {
    KeycloakPlugin,
    KeycloakPlugin as default
}