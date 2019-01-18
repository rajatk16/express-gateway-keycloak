# Securing NiFi

A lot of the following content comes from the [NiFi System Administrator's Guide](https://nifi.apache.org/docs/nifi-docs/html/administration-guide.html) 

## Client certificate authentication

We'll use openssl and keytool to generate some keys and certificates for use with nifi.

NOTE: if you're on windows, you can install cygwin or use the ubuntu bash shell (win 10) for the openssl tools (or I'm sure there's an openssl distribution for windows somewhere).

Note also that nifi comes with a [TLS Generation Toolkit](https://nifi.apache.org/docs/nifi-docs/html/administration-guide.html#tls_generation_toolkit) that eases the secure configuration of NiFi.

### Generate the client certificate (possibly a certificate representing yourself or some proxying agent)

1. Generate a 2048 bit RSA private key:

    ```openssl genrsa -out my-key.pen 2048```

2. Create a certificate signing request:

    ```openssl req -new -sha256 -key my-key.pem -out my-csr.pem```

3. Create a self-signed certificate:

    ```openssl x509 -req -in my-csr.pem -signkey my-key.pem -out my-cert.pem```

4. Key/Cert packaging

    To package the private key and certificate (for use in the browser), use the following:

    ```openssl pkcs12 -inkey my-key.pem -in my-cert.pem -export -out me.pkg -passout pass:"SomePassword"```

5. Certificate conversion

    To convert from pem to der format, you can use the following command:

    ```openssl x509 -outform der -in my-cert.pem -out my-cert.cer```

    To convert from der to pem format (some back-ends, such as node, configure certificates in pem format)

    ```openssl x509 -inform der -in my-cert.cer -out my-cert.pem```

### Generate the nifi service certificates and stores

1. Create the server keystore as follows:

    ```keytool -genkeypair -alias nifiserver -keyalg RSA -keypass talent -storepass talent -keystore server_keystore.jks -dname "CN=localhost"``

2. Create the server truststore importing the client certificate as follows:

    ```keytool -importcert -v -trustcacerts -alias you -file my-cert.pem -keystore server_truststore.jks  -storepass talent -noprompt```

## Update nifi security configuration

1. Modify **$nifi_home/conf/nifi.properties** with the following:

    - Base Security Configuration

        ```properties
        nifi.web.http.host=
        nifi.web.http.port=
        ...
        nifi.security.keystore=/some/dir/nifi/server_keystore.jks
        nifi.security.keystoreType=JKS
        nifi.security.keystorePasswd=talent
        nifi.security.keyPasswd=talent
        nifi.security.truststore=/some/dir/nifi/server_truststore.jks
        nifi.security.truststoreType=JKS
        nifi.security.truststorePasswd=talent
        nifi.security.user.authorizer=managed-authorizer
        nifi.security.user.login.identity.provider=
        nifi.security.ocsp.responder.url=
        nifi.security.ocsp.responder.certificate=
        ```

        Note that we've ensured the http host and port are blank - this is required for securing NiFi

    - Mapping of Distinguished Name (DN) to an identity

        ```properties
        nifi.security.identity.mapping.pattern.dn=^EMAILADDRESS=(.*?), CN=(.*?), OU=(.*?), O=(.*?), L=(.*?), ST=(.*?), C=(.*?)$
        nifi.security.identity.mapping.value.dn=$1
        ```

        This example maps the email address specified via the DN in the client certificate as the identity

2. We need to set an initial nifi admin user, so modify **$nifi_home/conf/authorizers.xml** as follows:
    ```xml
    <accessPolicyProvider>
        <identifier>file-access-policy-provider</identifier>
        <class>org.apache.nifi.authorization.FileAccessPolicyProvider</class>
        <property name="User Group Provider">file-user-group-provider</property>
        <property name="Authorizations File">./conf/authorizations.xml</property>
        <property name="Initial Admin Identity">some.user@somewhere.com</property>
        <property name="Legacy Authorized Users File"></property>
        <property name="Node Identity 1"></property>
        <property name="Node Group"></property>
    </accessPolicyProvider>
    ```

    NOTE: replace the **Initial Admin Identity** ```some.user@somewhere.com``` with the email address specified in the client certificate
















