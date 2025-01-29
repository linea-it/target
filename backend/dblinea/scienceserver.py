import json
from io import StringIO
from urllib.parse import urljoin

import pandas as pd
import requests


class ScienceServerApi:
    _token = None

    _enviroments = {
        "localhost": "http://localhost/dri/api/",
        "linea-dev": "https://scienceserver-dev.linea.org.br/dri/api/",
        "linea": "https://scienceserver.linea.org.br/dri/api/",
    }

    _base_api_url = None

    def __init__(self, token, host="linea"):
        self._base_api_url = self._enviroments[host]

        self._token = token

    def _generate_internal_name(self, name):
        return "".join(x if x.isalnum() else "_" for x in name)

    def _get_request(self, url, params):
        try:
            r = requests.get(
                url,
                params=params,
                headers=dict(
                    {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": f"Token {self._token}",
                    },
                ),
            )

            if r.status_code == 200:
                return r.json()

            if r.status_code == 403:
                # Não enviou as credenciais de usuario
                message = json.loads(str(r.text))["detail"]
                return dict(
                    {
                        "success": False,
                        "message": message,
                        "status_code": r.status_code,
                    },
                )

            if r.status_code == 404:
                # Mensagem de erro pra Not Found.
                message = r.text
                return dict(
                    {
                        "success": False,
                        "message": message,
                        "status_code": r.status_code,
                    },
                )
            return dict(
                {
                    "success": False,
                    "status_code": r.status_code,
                },
            )

        except requests.exceptions.HTTPError as errh:
            message = f"Http Error: {errh}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.ConnectionError as errc:
            message = f"Connection Error: {errc}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.Timeout as errt:
            message = f"Timeout Error: {errt}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.RequestException as err:
            message = f"Request Error: {err}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

    def _post_request(self, url, payload):
        try:
            r = requests.post(
                url,
                data=json.dumps(payload),
                headers=dict(
                    {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": f"Token {self._token}",
                    },
                ),
            )

            if r.status_code == 200:
                return r.json()

            if r.status_code == 403:
                # Não enviou as credenciais de usuario
                message = json.loads(str(r.text))["detail"]
                return dict(
                    {
                        "success": False,
                        "message": message,
                        "status_code": r.status_code,
                    },
                )

            if r.status_code == 404:
                # Mensagem de erro pra Not Found.
                message = r.text
                return dict(
                    {
                        "success": False,
                        "message": message,
                        "status_code": r.status_code,
                    },
                )
            return dict(
                {
                    "success": False,
                    "status_code": r.status_code,
                },
            )

        except requests.exceptions.HTTPError as errh:
            message = f"Http Error: {errh}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.ConnectionError as errc:
            message = f"Connection Error: {errc}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.Timeout as errt:
            message = f"Timeout Error: {errt}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.RequestException as err:
            message = f"Request Error: {err}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

    def _delete_request(self, url):
        try:
            r = requests.delete(
                url,
                headers=dict(
                    {
                        "Accept": "application/json",
                        "Authorization": f"Token {self._token}",
                    },
                ),
            )

            if r.status_code == 204:
                return True
            if r.status_code == 400:
                return dict(
                    {
                        "success": False,
                        "message": "The server failed to perform the operation.",
                        "status_code": r.status_code,
                    },
                )
            if r.status_code == 403:
                # Não enviou as credenciais de usuario
                message = json.loads(str(r.text))["detail"]
                return dict(
                    {
                        "success": False,
                        "message": message,
                        "status_code": r.status_code,
                    },
                )
            if r.status_code == 404:
                # Mensagem de erro pra Not Found.
                message = json.loads(str(r.text))["detail"]
                return dict(
                    {
                        "success": False,
                        "message": message,
                        "status_code": r.status_code,
                    },
                )
            return dict(
                {
                    "success": False,
                    "status_code": r.status_code,
                },
            )

        except requests.exceptions.HTTPError as errh:
            message = f"Http Error: {errh}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.ConnectionError as errc:
            message = f"Connection Error: {errc}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.Timeout as errt:
            message = f"Timeout Error: {errt}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

        except requests.exceptions.RequestException as err:
            message = f"Request Error: {err}"
            return dict(
                {
                    "success": False,
                    "message": message,
                },
            )

    def get_catalog(self, id):
        url = urljoin(self._base_api_url, "catalog/")
        params = dict({"id": int(id)})
        result = self._get_request(url, params)

        if "success" in result and result["success"] is False:
            return result

        if len(result) > 0:
            data = result[0]

            url = urljoin(self._base_api_url, "/target/#cv/%s" % str(data["id"]))

            catalog = dict(
                {
                    "id": data["id"],
                    "owner": data["owner"],
                    "date": data["prd_date"],
                    "internal_name": data["prd_name"],
                    "display_name": data["prd_display_name"],
                    "tbl_schema": data["tbl_schema"],
                    "tbl_name": data["tbl_name"],
                    "rows": data["tbl_rows"],
                    "url": url,
                },
            )

            return catalog
        # Retorna None se nenhum catalogo for encontrado
        # Pode aconter quando o id não existe ou se o usuario não tiver permissão ao id que está tentando acessar.
        return None

    def __register_target_list(
        self,
        name,
        data,
        cls="objects",
        releases=[],
        description=None,
        base64=False,
        mime="csv",
    ):
        url = urljoin(self._base_api_url, "import_target_list/")

        payload = dict(
            {
                "type": "catalog",
                "class": cls,
                "name": self._generate_internal_name(name),
                "displayName": name,
                "releases": releases,
                "isPublic": False,
                "description": description,
                "base64": base64,
                "mime": mime,
                "csvData": data,
            },
        )

        result = self._post_request(url, payload)

        if "success" in result and result["success"] is False:
            return result

        if result["success"] is True:
            # Importou com sucesso
            catalog = self.get_catalog(result["product"])
            return catalog

    def target_list_from_list(
        self,
        name,
        data,
        cls="objects",
        releases=[],
        description=None,
    ):
        # Criar um dataframe e converter para string csv.
        df = pd.DataFrame(data)

        f = StringIO()
        df.to_csv(
            f,
            sep=";",
            header=True,
            index=False,
        )
        str_csv = f.getvalue()

        return self.__register_target_list(
            name,
            str_csv,
            cls,
            releases,
            description,
            base64=False,
            mime="csv",
        )

    def target_list_from_df(
        self,
        name,
        df,
        cls="objects",
        releases=[],
        description=None,
    ):
        # Converter para string csv.
        f = StringIO()
        df.to_csv(
            f,
            sep=";",
            header=True,
            index=False,
        )
        str_csv = f.getvalue()

        return self.__register_target_list(
            name,
            str_csv,
            cls,
            releases,
            description,
            base64=False,
            mime="csv",
        )

    def remove_target_list(self, id):
        url = urljoin(self._base_api_url, "catalog/%s/" % int(id))

        result = self._delete_request(url)

        if result is True:
            return dict(
                {"success": True, "message": "Target List successfully removed"},
            )
        return result


# from random import randint

# token = "c7aef9b2fbe8e9b5dea02e456c8075877b1dc841"
# name = "Teste %s" % randint(10, 50)
# data = "RA;DEC;Mag_g\n10;20;24.5\n25;15;22.7"
# data = [{"RA": 10, "DEC": 20, "Mag_g": 24.5}, {"RA": 25, "DEC": 15, "Mag_g": 22.7}]

# ss = ScienceServerApi(token, host="localhost")

# catalog = ss.target_list_from_list(name=name, data=data)
# print(catalog)

# df = pd.DataFrame(data)
# catalog = ss.target_list_from_df(name=name, df=df)
# print(catalog)

# catalog = ss.get_catalog(26)
# print(catalog)

# catalog = ss.remove_target_list(100)
# print(catalog)
