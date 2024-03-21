## Rascunho comandos para criar o repositório

Executar um container python 3.12 
```bash 
docker run -it --rm -v "$PWD":/usr/src/workspace -w /usr/src/workspace python:3.12-slim bash
```

Dentro do container:

Instalar o git:

```bash 
apt-get update && apt-get install git -y
```

instalar o cookiecutter

```bash 
pip install cookiecutter
```

Executar o cookiecutter especifico para Django.
```bash 
cookiecutter https://github.com/cookiecutter/cookiecutter-django
```

```bash 
root@eda49fc2c56d:/usr/src/workspace# cookiecutter https://github.com/cookiecutter/cookiecutter-django
  [1/27] project_name (My Awesome Project): CANVAS
  [2/27] project_slug (canvas):
  [3/27] description (Behold My Awesome Project!): Cluster analysis and visualization as a service
  [4/27] author_name (Daniel Roy Greenfeld): LIneA Team
  [5/27] domain_name (example.com): canvas.linea.org.br
  [6/27] email (linea-team@canvas.linea.org.br): helpdesk@linea.org.br
  [7/27] version (0.1.0):
  [8/27] Select open_source_license
    1 - MIT
    2 - BSD
    3 - GPLv3
    4 - Apache Software License 2.0
    5 - Not open source
    Choose from [1/2/3/4/5] (1): 1
  [9/27] Select username_type
    1 - username
    2 - email
    Choose from [1/2] (1): 1
  [10/27] timezone (UTC):
  [11/27] windows (n):
  [12/27] Select editor
    1 - None
    2 - PyCharm
    3 - VS Code
    Choose from [1/2/3] (1): 3
  [13/27] use_docker (n): y
  [14/27] Select postgresql_version
    1 - 16
    2 - 15
    3 - 14
    4 - 13
    5 - 12
    Choose from [1/2/3/4/5] (1): 3
  [15/27] Select cloud_provider
    1 - AWS
    2 - GCP
    3 - Azure
    4 - None
    Choose from [1/2/3/4] (1): 4
  [16/27] Select mail_service
    1 - Mailgun
    2 - Amazon SES
    3 - Mailjet
    4 - Mandrill
    5 - Postmark
    6 - Sendgrid
    7 - SendinBlue
    8 - SparkPost
    9 - Other SMTP
    Choose from [1/2/3/4/5/6/7/8/9] (1): 9
  [17/27] use_async (n): y
  [18/27] use_drf (n): y
  [19/27] Select frontend_pipeline
    1 - None
    2 - Django Compressor
    3 - Gulp
    4 - Webpack
    Choose from [1/2/3/4] (1): 1
  [20/27] use_celery (n): y
  [21/27] use_mailpit (n): y
  [22/27] use_sentry (n): y
  [23/27] use_whitenoise (n): y
  [24/27] use_heroku (n):
  [25/27] Select ci_tool
    1 - None
    2 - Travis
    3 - Gitlab
    4 - Github
    5 - Drone
    Choose from [1/2/3/4/5] (1): 4
  [26/27] keep_local_envs_in_vcs (y):
  [27/27] debug (n): y
 [SUCCESS]: Project initialized, keep up the good work!
```

Sair do container
Alterar o dono da pasta e permissão

```bash 
sudo chown -R glauber:glauber canvas && sudo chmod -R g+w canvas
```

Testar o ambiente no navegador

Copiar o docker compose yml

```bash 
cp local.yml docker-compose.yml
```

## Primeira Mudança mover a parte do Django para uma subpasta backend

Criar a pasta e alterar a permissão

```bash 
mkdir backend && chmod -R g+w backend
```

Mover tudo que for referente a python ou Django para a pasta backend

Alterar o docker-compose para montar a pasta backend 
Alterar o Dockerfile do django para ler os requirements do backend.
Corrigir o devcontainer, montar o arquivo bashhistory.sh e alterar o comando.
Alterar as configs: 
  ACCOUNT_EMAIL_REQUIRED = False
  # https://docs.allauth.org/en/latest/account/configuration.html
  ACCOUNT_EMAIL_VERIFICATION = "none"

- **cookiecutter**: <https://github.com/cookiecutter/cookiecutter-django/>
- **Mailpit**: <https://mailpit.axllent.org/>
- **Mailpit**: <https://sentry.io/welcome/>
- **Whitenoise**: <https://whitenoise.readthedocs.io/en/latest/>


- **Django Home**: <http://localhost:8000/>
- **Django Admin**: <http://localhost:8000/admin/>
- **Django API**: <http://localhost:8000/api/>
- **Django API Docs**: <http://localhost:8000/api/docs/>
- **Docs**: <http://localhost:9000>
- **Mailpit**: <http://localhost:8025>
- **Celery Flower**: <http://localhost:5555>




