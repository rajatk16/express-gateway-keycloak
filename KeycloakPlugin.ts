import * as eg from 'express-gateway';
//@ts-ignore
import { createLoggerWithLabel } from 'express-gateway/lib/logger';
import * as Keycloak from 'keycloak-connect';
import * as session from 'express-session';
import * as createMemoryStore from 'memorystore';

interface KeycloakPluginSettings {
  session: session.SessionOptions;
  keycloakConfig: object;
  paths: string[];
  registerName: string;
}
interface ActionParams {
  jsProtect?: string;
  jsProtectTokenVar?: string;
  role?: string;
}
const memoryStore = createMemoryStore(session);

const DEFAULT_KEYCLOAK_PLUGIN_SETTINGS: KeycloakPluginSettings = {
  session: {
    secret: 'kc_secret',
    resave: false,
    saveUninitialized: true,
  },
  keycloakConfig: {},
  registerName: 'keycloak-protect',
  paths: ['/'],
};

const keycloakPlugin: eg.ExpressGateway.Plugin = {
  version: '1.2.0',
  init: (ctx: eg.ExpressGateway.PluginContext) => {
    // this is slightly dodgy casting, as they don't expose settings on the public interface - but not sure how else you can access custom settings for a plugin
    const sessionStore = new memoryStore();

    const rawSettings: KeycloakPluginSettings =
      //@ts-ignore
      (ctx as eg.ExpressGateway.PluginContext).settings;
    const sessionSettings = {
      ...DEFAULT_KEYCLOAK_PLUGIN_SETTINGS.session,
      ...rawSettings.session,
      store: sessionStore,
    };
    const keycloakConfig = {
      ...DEFAULT_KEYCLOAK_PLUGIN_SETTINGS.keycloakConfig,
      ...rawSettings.keycloakConfig,
    };
    const pluginSettings: KeycloakPluginSettings = {
      //@ts-ignore
      session: sessionSettings,
      keycloakConfig,
      registerName: rawSettings.registerName || DEFAULT_KEYCLOAK_PLUGIN_SETTINGS.registerName,
      paths: rawSettings.paths || DEFAULT_KEYCLOAK_PLUGIN_SETTINGS.paths,
    };
    const keycloak = new Keycloak({ store: sessionStore }, pluginSettings.keycloakConfig);
    const logger = createLoggerWithLabel('[EG:plugin:' + pluginSettings.registerName + ']');

    logger.debug('Init', pluginSettings.registerName);
    logger.info(`Initialized Keycloak Plugin with settings: ${JSON.stringify(pluginSettings, null, '\t')}`);

    keycloak.authenticated = (req) => {
      const keyR = req as Keycloak.GrantedRequest;
      const grant = keyR.kauth.grant as Keycloak.Grant;
      logger.info('-- Keycloak Authenticated: ' + JSON.stringify(grant.access_token.content, null, '\t'));
    };

    keycloak.accessDenied = (req, res) => {
      logger.debug('Denied', res);
      logger.warn('-- Keycloak Access Denied.');
      res.status(403).end('Access Denied');
    };

    // setup our keycloak middleware
    ctx.registerGatewayRoute((app) => {
      logger.debug('Register', ctx);
      logger.info('Registering Keycloak Middleware');
      app.use(pluginSettings.paths, session(pluginSettings.session));
      app.use(pluginSettings.paths, keycloak.middleware());
    });

    ctx.registerPolicy({
      name: pluginSettings.registerName,
      schema: {
        $id: 'http://express-gateway.io/schemas/policies/keycloak-protect.json',
        type: 'object',
        properties: {
          role: {
            description: 'the keycloak role to restrict access to',
            type: 'string',
          },
          jsProtectTokenVar: {
            description: 'the keycloak token variable name to reference the token in jsProtect',
            type: 'string',
          },
          jsProtect: {
            description: 'a js snippet to apply for whether a user has access.',
            type: 'string',
          },
        },
      },
      policy: (actionParams: ActionParams) => {
        logger.debug('policy', pluginSettings.registerName);
        logger.info(`-- Keycloak Protect: ${JSON.stringify(actionParams, null, '\t')}`);
        //@ts-ignore
        if (pluginSettings.keycloakConfig['bearer-only']) {
          return keycloak.protect();
        }
        if (actionParams.jsProtect) {
          return keycloak.protect((token: Keycloak.Token, req) => {
            //@ts-ignore
            req.egContext[actionParams.jsProtectTokenVar || 'token'] = token;
            //@ts-ignore
            const runResult = req.egContext.run(actionParams.jsProtect);
            logger.info('-- Keycloak Protect JS Result: ' + runResult);
            return runResult;
          });
        }
        return keycloak.protect(actionParams.role);
      },
    });
  },
  schema: {
    $id: 'http://express-gateway.io/schemas/plugin/keycloak.json',
    type: 'object',
    properties: {
      registerName: {
        title: 'Registring name',
        description: 'Multi keycloak feature',
        type: 'string',
      },
      paths: {
        title: 'Paths to apply protection',
        description: 'url paths to apply protection',
        type: 'array',
      },
      session: {
        title: 'Session Settings',
        description: 'Session Settings as outlined by express middleware',
        type: 'object',
      },
      keycloakConfig: {
        title: 'Keycloak Configuration',
        description: 'This can be used rather than requiring keycloak.json to be present',
        type: 'object',
      },
    },
  },
};

export {
  KeycloakPluginSettings as IKeycloakPluginSettings,
  DEFAULT_KEYCLOAK_PLUGIN_SETTINGS as DefaultKeycloakPluginSettings,
  keycloakPlugin as KeycloakPlugin,
  keycloakPlugin as default,
};
