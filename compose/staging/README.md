# Target Viewer Instalation Staging environment


```bash
git clone https://github.com/linea-it/target.git target_temp \
&& cp -r target_temp/compose/staging/ target-dev \
&& rm -rf target_temp \
&& cd target-dev/ \
&& mkdir -p data data/tmp data/redis logs certificates \
&& mv env_template .env \
```

Generate SAML2 Certificates

```bash
cd certificates \
&& openssl genrsa -out mykey.key 2048 \
&& openssl req -new -key mykey.key -out mycert.csr \
&& openssl x509 -req -days 365 -in mycert.csr -signkey mykey.key -out mycert.crt \
&& cp mykey.key mykey.pem \
&& cp mycert.crt mycert.pem \
&& cd ..
```

Para a autenticação com SATOSA funcionar é necessário estabelecera relação de confiança entre as aplicações.


Editar o arquivo .env com as variaveis de acesso ao banco de dados, Secrets, usernames e passwords

```bash
docker compose up backend
```
CRTL+C

Iniciar todos os serviços.

```bash
docker compose up -d
```

Rodar o comando para gerar uma secret, copiar e alterar no local_vars.py a variavel SECRET_KEY. 
```bash
docker compose exec backend python -c "import secrets; print(secrets.token_urlsafe())"
```

Após editar o arquivo .env com a Secret, é necessário reinicar os serviços. 

```bash
docker compose stop && docker compose up -d
```

### Create default Super User in django

With the backend running, open another terminal and run the command create super user

```bash
docker compose exec backend python manage.py createsuperuser
```

### Load Initial Data

This command will populate the database with
```bash
docker compose exec backend python manage.py loaddata initial_data.json
```

## Run and Stop All Services

```bash
docker compose up -d
```

or

```bash
docker compose stop && docker compose up -d
```

## Useful Commands

Returns the ID of a container by filtering by name

```bash
docker ps -q -f name=backend
```

Access the terminal in the backend container.

```bash
docker compose exec backend bash
```

List of commands available in Django

```bash
docker compose exec backend python manage.py --help
```

Nginx Reload

```bash
docker exec -it $(docker ps -q -f name=nginx) nginx -s reload
```

Build Manual das imagens docker
```bash
docker build -f compose/production/django/Dockerfile -t linea/target:backend_$(git describe --always) .

docker build -f compose/production/frontend/Dockerfile -t linea/target:frontend_$(git describe --always) .
```
