# target

Target Viewer by LIneA

[![Built with Cookiecutter Django](https://img.shields.io/badge/built%20with-Cookiecutter%20Django-ff69b4.svg?logo=cookiecutter)](https://github.com/cookiecutter/cookiecutter-django/)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)

License: MIT

## Setup Production Environment
https://github.com/linea-it/target/blob/main/compose/production/README.md

## Build docker imagens

```bash
docker build -f compose/production/django/Dockerfile -t linea/target:backend_$(git describe --always) .

docker build -f compose/production/frontend/Dockerfile -t linea/target:frontend_$(git describe --always) .

docker build -f mydb/compose/production/frontend/Dockerfile -t linea/target:mydb_frontend_$(git describe --always) .
```


## TODOS: Canvas

- Schema publico "mydb_canvas_public"
- Upload de tabelas. 
- Salvar as colunas que que o usuario selecionou e orden.
- Um segundo de arc no ra e dec.  
- Tabela dos membros do lado da imagem
- Alterar o titulo da tela para canvas
- Alterar o titulo da tela de detalhe.
- Selecionar linha de membro ao clicar no aladin.

Imagem docker do jupyter = quay.io/jupyter/datascience-notebook:2025-05-12