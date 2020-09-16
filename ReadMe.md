# Keycloak plugins for Express-gateway: express-gateway-plugin-keycloak

[![Dependency Status](https://img.shields.io/david/malys/express-gateway-keycloak.svg?style=flat-square)](https://david-dm.org/malys/express-gateway-keycloak)

This project is a plugin to integrate [Keycloak NodeJS Adapter](https://github.com/keycloak/keycloak-nodejs-connect/) in [Express-Gateway](https://www.express-gateway.io/)

## Usage

### Common

You want to apply the same authentication strategy for your apigateway instance (ex: microprofile architecture)

* add to `system.config.yml`

```yaml
express-gateway-keycloak:
package: express-gateway-keycloak
keycloakConfig:
    realm: "..."
    auth-server-url: "..."
    ssl-required: none
    bearer-only: false
    client-id: "..."
    confidential-port: 0
    realm-public-key: "..."
```

* add to `gateway.config.yml`

```yaml
policies:
  - keycloak-protect
...
  marketplace-api:
    apiEndpoints:
      - api
    policies:
      - keycloak-protect:
```

### Multiple authentication profiles

You want to apply different authentication strategies depending endpoints (ex: monolithic architecture)

* add to `system.config.yml`

```yaml
  express-gateway-keycloak-api:
    package: express-gateway-keycloak
    # Provide unique policy id
    registerName: keycloak-protect-api
    # Define paths impacted by this keycloak configuration
    paths: 
      - /myapi/v1/
    # Keycloak configuration for this profile  
    keycloakConfig: 
      realm: "..."
      auth-server-url: "..."
      ssl-required: none
      bearer-only: true
      public-client: false
      confidential-port: 0
      client-id: "..."
      secret: "..."
      realm-public-key: "..."

  express-gateway-keycloak-admin:
    package: express-gateway-keycloak
    # Provide unique policy id
    registerName: keycloak-protect-admin
    # Define paths impacted by this keycloak configuration
    paths: 
      - /admin
    keycloakConfig:
      realm: "..."
      auth-server-url: "..."
      ssl-required: none
      bearer-only: false
      public-client: true
      client-id: "..."
      confidential-port: 0
      realm-public-key: "..."

```

* add to `gateway.config.yml`

```yaml
policies:
  - keycloak-protect-api
  - keycloak-protect-admin
pipelines:
  marketplace-api:
    apiEndpoints:
      - api
    policies:
      - keycloak-protect-api:
      - expression:
        - action:
            jscode: 'req.headers["X-Auth-Username"] = req.kauth.grant.access_token.content.preferred_username;'
...
  marketplace-admin:
    apiEndpoints:
      - admin
    policies:
      - keycloak-protect-admin:
```


## Development

* Quality control

```bash
npm run check
```

* Compilation

```bash
npm run compile
``` 

## Changelog

### 0.1.0

* apply TypeScript standard (quality contraints)
* add readme and badge
* support **multiple authentification profiles**


## License

* [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)