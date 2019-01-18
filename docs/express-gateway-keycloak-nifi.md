# Express Gateway with Keycloak and NiFi
In this scenario, we configure NiFi as though it's behind a reverse proxy. This is outlined in the [NiFi System Administrator's Guide Proxy Configuration](https://nifi.apache.org/docs/nifi-docs/html/administration-guide.html#proxy_configuration).

## Securing NiFi
Securing NiFi (basically) is covered in [this document](./nifi-security-basic.md)

## Configuring Express Gateway
Configuration of Express Gateway with Keycloak is [covered in this document](./express-gateway.md).

We'll extend on the [gateway configuration](https://www.express-gateway.io/docs/configuration/gateway.config.yml/) covered in that document - here's the starting point:
```yml
http:
  port: 8080
admin:
  port: 9876
  hostname: localhost
apiEndpoints:
  gimme:
    host: '*'
    paths: ['/gimme']
serviceEndpoints:
  sample:
    url: "http://localhost:3042"
    proxyOptions:
      headers:
        X-Sample-Header: forsample
policies:
  - basic-auth
  - cors
  - expression
  - key-auth
  - log
  - oauth2
  - proxy
  - rate-limit
  - keycloak-protect
pipelines:
  gimme:
    apiEndpoints:
      - gimme
    policies:
      - keycloak-protect:
        - action:
            jsProtect: 'token.hasRole("sample") || token.hasRole("gimme")'
      - expression:
        - action:
            jscode: 'req.headers["x-kc-user-email"] = req.kauth.grant.access_token.content.email; req.headers["x-kc-username"] = req.kauth.grant.access_token.content.preferred_username;'
      - proxy:
        - action:
            serviceEndpoint: sample
            changeOrigin: true
```

In this case, we're going to secure nifi using a client certificate (the client being express gateway) and we've also configured nifi to run on port 18443. We'll start off by creating a nifi service endpoint as follows:

```yaml
serviceEndpoints:
  nifi:
    url: 'https://localhost:18443'
    proxyOptions:
      target:
        secure: true
        protocol: https
        host: localhost
        port: 18443
        keyFile: /workspace/talent/nifi/my-key.pem
        certFile: /workspace/talent/nifi/my-cert.pem
        caFile: /workspace/talent/nifi/server-cert.pem
      headers:
        X-ProxyScheme: http
        X-ProxyHost: localhost
        X-ProxyPort: 8080
        X-ProxyContextPath: /
```

Basically the X- headers specified here tell NiFi about how we've got the proxy configured so urls get generated correctly within NiFi.

Configure the nifi api endpoint as follows:

```yaml
apiEndpoints:
    nifi:
      host: '*'
      paths: ['/nifi*']
```

Now add a nifi pipeline as follows:

```yaml
pipelines:
    nifi:
        apiEndpoints:
        - nifi
        policies:
        - keycloak-protect:
            - action:
                role: nifi
        - expression:
            - action:
                jscode: 'req.headers["X-ProxiedEntitiesChain"] = req.kauth.grant.access_token.content.email;'
        - proxy:
            - action:
                serviceEndpoint: nifi
                changeOrigin: true
```

To get access, you'll have to add a nifi role and ensure it is associated with the keycloak user.

We should be good to go at this point - you can test it out by hitting the [proxied nifi url](http://localhost:8080/nifi/)

## The https/ssl/tls version
You'll notice that the username doesn't show up in nifi, even though the current user api call returns the correct user. It appears the nifi client checks the protocol on the window location to determine whether it will display the current user. This comment was made before I checked the source - if you're interested, I've tracked it down to the following snippet [in this file](https://github.com/apache/nifi/tree/master/nifi-nar-bundles/nifi-framework-bundle/nifi-framework/nifi-web/nifi-web-ui/src/main/webapp/js/nf/canvas/controllers/nf-ng-canvas-header-controller.js):

  ```javascript
  // if accessing via http, don't show the current user
  if (location.protocol === 'http:') {
      $('#current-user-container').css('display', 'none');
  }
  ```

So, we have to setup the express gateway to be secure as outlined in [express gateway tls configuration](./express-gateway.md#express-gateway-tls). We might as well also secure keycloak whilst we're at it, as outlined in [keycloak ssl configuration](./keycloak-basic-setup.md#keycloak-ssl)

### config/system.config.yml

```yaml
# Core
db:
  redis:
    emulate: true
    namespace: EG

# plugins:
  # express-gateway-plugin-example:
  #   param1: 'param from system.config' 

crypto:
  cipherKey: sensitiveKey
  algorithm: aes256
  saltRounds: 10

# OAuth2 Settings
session:
  secret: keyboard cat
  resave: false
  saveUninitialized: false
accessTokens:
  timeToExpiry: 7200000
refreshTokens:
  timeToExpiry: 7200000
authorizationCodes:
  timeToExpiry: 300000

plugins:
  express-gateway-keycloak:
    package: express-gateway-keycloak
    keycloakConfig:
      realm: sample
      auth-server-url: "https://localhost:9443/auth"
      ssl-required: external
      resource: express-gateway
      public-client: true
      confidential-port: 0
```

### config/gateway.config.yml
```yaml
http:
  port: 8080
https:
  port: 8443
  tls:
    default:
      key: "server.key"
      cert: "server.crt"
admin:
  port: 9876
  hostname: localhost
apiEndpoints:
  gimme:
    host: '*'
    paths: ['/gimme']
  nifi:
    host: '*'
    paths: ['/nifi*']
serviceEndpoints:
  sample:
    url: "http://localhost:3042"
    proxyOptions:
      headers:
        X-Sample-Header: forsample
  nifi:
    url: 'https://localhost:18443'
    proxyOptions:
      target:
        secure: true
        protocol: https
        host: localhost
        port: 18443
        keyFile: /workspace/talent/nifi/my-key.pem
        certFile: /workspace/talent/nifi/my-cert.pem
        caFile: /workspace/talent/nifi/server-cert.pem
      headers:
        X-ProxyScheme: https
        X-ProxyHost: localhost
        X-ProxyPort: 8443
        X-ProxyContextPath: /
policies:
  - basic-auth
  - cors
  - expression
  - key-auth
  - log
  - oauth2
  - proxy
  - rate-limit
  - keycloak-protect
pipelines:
  gimme:
    apiEndpoints:
      - gimme
    policies:
      - keycloak-protect:
        - action:
            jsProtect: 'token.hasRole("sample") || token.hasRole("gimme")'
      - proxy:
        - action:
            serviceEndpoint: sample
            changeOrigin: true
  nifi:
    apiEndpoints:
      - nifi
    policies:
      - keycloak-protect:
        - action:
            role: nifi
      - expression:
        - action:
            jscode: 'req.headers["X-ProxiedEntitiesChain"] = req.kauth.grant.access_token.content.email;'
      - proxy:
        - action:
            serviceEndpoint: nifi
            changeOrigin: true
```

Once this is configured, you can try it on the [secured proxied nifi url](https://localhost:8443/nifi/). The proxied user (defined in X-ProxiedEntitiesChain) should be showing. If it's not, well, I just plain suck.

