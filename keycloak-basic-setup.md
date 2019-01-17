# Keycloak basic setup

## Getting Keycloak
Download keycloak from [here](https://www.keycloak.org/downloads.html) and install according to the instructions.

## Postgres (for example)
Keycloak comes with its own embedded H2 database. We're going to configure some degree of prod realism by using postgres.
Download postgres from [here](https://www.postgresql.org/download/) and install according to the instructions.

### Configuring Postgres
We'll initially create the **keycloak** database owned by the **keycloak** user.

## Configuring Keycloak

### Database
1. Copy the [postgresql jdbc driver](https://jdbc.postgresql.org/download.html) to **$keycloak_home/modules/system/layers/keycloak/org/postgresql/main**

2. Under **$keycloak_home/modules/system/layers/keycloak/org/postgresql/main** add a file called **module.xml** with the following content (NOTE: change as appropriate if the driver jar has a different name):
    ```xml
    <?xml version="1.0" ?>
    <module xmlns="urn:jboss:module:1.3" name="org.postgresql">

        <resources>
            <resource-root path="postgresql-42.2.5.jar"/>
        </resources>

        <dependencies>
            <module name="javax.api"/>
            <module name="javax.transaction.api"/>
        </dependencies>
    </module>
    ```

3. Under **$keycloak_home/standalone/configuration/standalone.xml**, configure the database subsystem with the postgresql details as follows (NOTE: postgresql is assumed to be listening of port 5432):
```xml
<subsystem xmlns="urn:jboss:domain:datasources:5.0">
    <datasources>
        <datasource jndi-name="java:jboss/datasources/KeycloakDS" pool-name="KeycloakDS" enabled="true" use-java-context="true">
            <connection-url>jdbc:postgresql://localhost:5432/keycloak</connection-url>
            <driver>postgresql</driver>
            <pool>
                <max-pool-size>20</max-pool-size>
            </pool>
            <security>
                <user-name>keycloak</user-name>
                <password>keycloak</password>
            </security>
        </datasource>
        <drivers>
            <driver name="postgresql" module="org.postgresql">
                <xa-datasource-class>org.postgresql.xa.PGXADataSource</xa-datasource-class>
            </driver>
        </drivers>
    </datasources>
</subsystem>
```

### Network
We'll run keycloak on alternative ports, so update **$keycloak_home/standalone/configuration/standalone.xml** as follows:
```xml
<socket-binding-group name="standard-sockets" default-interface="public" port-offset="${jboss.socket.binding.port-offset:0}">
    <socket-binding name="management-http" interface="management" port="${jboss.management.http.port:9990}"/>
    <socket-binding name="management-https" interface="management" port="${jboss.management.https.port:9993}"/>
    <socket-binding name="ajp" port="${jboss.ajp.port:8009}"/>
    <socket-binding name="http" port="${jboss.http.port:9070}"/>
    <socket-binding name="https" port="${jboss.https.port:9443}"/>
    <socket-binding name="txn-recovery-environment" port="4712"/>
    <socket-binding name="txn-status-manager" port="4713"/>
    <outbound-socket-binding name="mail-smtp">
        <remote-destination host="localhost" port="25"/>
    </outbound-socket-binding>
</socket-binding-group>
```

### Running keycloak
You can run keyclock in standalone mode using **$keycloak_home/bin/standalone.sh** (**keycloak_home\bin\standalone.bat**)

### Keycloak realm configuration example
To configure a new realm in keycloak:
1. Login as an administrator
2. On the top left is the realm selector that also allows you to create a new realm - click **Add realm**
3. Specify the name, click **Create** and you've got a new realm

Under a realm, we need to configure clients (applications) that will make use of keycloak for authentication and authorisation, typically using Open Id Connect, but SAML is available as well.

More to come...
