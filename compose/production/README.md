# Deploy Production environment

Clone the repository to temp folder, copy docker-compose.production.yml, env template and ngnix conf to application folder, remove temp folder, edit env file change the settings and image tag, edit docker compose and mapping port if necessary.

Steps Considering 

```bash
Host: srvnode01
User: app.deployer
application port: 8088 
application folder: /apps/targetviewer.
```
Copy files and create directories

```bash
mkdir -p targetviewer targetviewer/logs targetviewer/data/redis targetviewer/data/tmp targetviewer/certificates \
&& chmod -R g+w targetviewer/logs targetviewer/data \
&& git clone https://github.com/linea-it/target.git targetviewer_temp \
&& cp targetviewer_temp/compose/production/docker-compose.production.yml targetviewer/docker-compose.yml \ 
&& cp targetviewer_temp/compose/production/env_template targetviewer/.env \ 
&& cp targetviewer_temp/compose/production/nginx-proxy.conf targetviewer/nginx-proxy.conf
&& rm -rf targetviewer_temp \
&& cd targetviewer \
&& docker compose pull
```

Generate SAML2 Certificates

```bash
cd certificates \
&& openssl genrsa -out mykey.key 2048 \
&& openssl req -new -key mykey.key -out mycert.csr \
&& openssl x509 -req -days 365 -in mycert.csr -signkey mykey.key -out mycert.crt \
&& cp mykey.key mykey.pem \
&& cp mycert.crt mycert.pem \
&& cd .. \
&& chmod -R go+r certificates
```

Edit .env for secrets, users and passwords.

Up all services in background

```bash
docker compose up -d
```

Generate a secret for Django 
```bash
docker compose exec -it backend python -c "import secrets; print(secrets.token_urlsafe())"
```
Copy the secret and edit .env, replace template DJANGO_SECRET_KEY

Create Django superuser
```bash
docker compose exec backend python manage.py createsuperuser
```

Restart all Services
```bash
docker compose down && docker compose up -d
```



