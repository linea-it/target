from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from django.shortcuts import get_object_or_404

from dblinea import MyDB

class MydbViewSet(viewsets.ViewSet):


    def list(self, request):
        """
        GET /api/mydb/ - Lista todas as tabelas no schema do usuario
        """

        user = request.user

        try:
            # MyDB instance
            db = MyDB(username=user.username)

            # Executa o ANALYZE nas tabelas que não possuem estatísticas
            # Previne que informações como rowcount fiquem zeradas
            # IMPORTANTE: Isso pode levar algum tempo dependendo do número de tabelas
            db.analyze_tables_without_stats()

            # List of tables in the database that the user has access to
            tables = db.get_user_tables_detailed()
            count = len(tables)

            # Sorting
            ordering = request.GET.get('ordering')
            if ordering:
                reverse = ordering.startswith('-')
                field_name = ordering.lstrip('-')
                tables.sort(key=lambda x: x.get(field_name), reverse=reverse)


            # Pagination
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('pageSize', 10))

            start = (page - 1) * page_size
            end = start + page_size
            tables = tables[start:end]

            # items = list(self._database.values())
            
            # # Aplicar filtros
            # if nome_filter:
            #     items = [item for item in items if nome_filter.lower() in item['nome'].lower()]
            
            # if ativo_filter is not None:
            #     ativo_bool = ativo_filter.lower() in ['true', '1', 'yes']
            #     items = [item for item in items if item['ativo'] == ativo_bool]
            
            return Response({
                "count": count,
                "results": tables
            })
        
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    def retrieve(self, request, pk=None):
        """
        GET /api/mydb/<table_name>/ - Busca item específico
        """
        if pk is None:
            return Response(
                {"error": "Table name is mandatory"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            table_name = pk
            print("Retrieving table:", table_name)
            user = request.user

            # MyDB instance
            db = MyDB(username=user.username)

            # List of tables in the database that the user has access to
            tables = db.get_user_tables_detailed()

            items = [table for table in tables if table['table_name'] == table_name]

            if len(items) == 1:
                return Response(items[0])
            else:
                return Response(
                    {"error": f"Table {table_name} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        except ValueError:
            return Response(
                {"error": f"internal error table name {table_name} not found"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, pk=None):
        """
        DELETE /api/mydb/<table_name>/ - Remove item
        """
        if pk is None:
            return Response(
                {"error": "Table name is mandatory"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            table_name = pk
            user = request.user

            # MyDB instance
            db = MyDB(username=user.username)

            # List of tables in the database that the user has access to
            tables = db.get_user_tables_detailed()

            items = [table for table in tables if table['table_name'] == table_name]

            if len(items) != 1:
                return Response(
                    {"error": f"Table {table_name} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Drop the table
            db.drop_user_table(table_name)

            return Response(
                {"message": f"Table {table_name} dropped successfully"},
                status=status.HTTP_200_OK
            )
        except ValueError:
            return Response(
                {"error": "Failed to remove the table."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # def create(self, request):
    #     """
    #     POST /api/mydb/ - Cria novo item
    #     """
    #     data = request.data
        
    #     # Validação básica
    #     if not data.get('nome'):
    #         return Response(
    #             {"error": "Campo 'nome' é obrigatório"}, 
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
        
    #     # Criar novo item
    #     new_id = self._next_id
    #     new_item = {
    #         "id": new_id,
    #         "nome": data.get('nome'),
    #         "descricao": data.get('descricao', ''),
    #         "ativo": data.get('ativo', True)
    #     }
    #   
    #     self._database[new_id] = new_item
    #     self._next_id += 1
        
    #     return Response(new_item, status=status.HTTP_201_CREATED)
    
    # def update(self, request, pk=None):
    #     """
    #     PUT /api/mydb/1/ - Atualização completa do item
    #     """
    #     try:
    #         pk_int = int(pk)
    #         if pk_int not in self._database:
    #             return Response(
    #                 {"error": f"Item com id {pk} não encontrado"}, 
    #                 status=status.HTTP_404_NOT_FOUND
    #             )
            
    #         data = request.data
    #         item = self._database[pk_int]
            
    #         # Atualizar todos os campos
    #         item.update({
    #             "nome": data.get('nome', item['nome']),
    #             "descricao": data.get('descricao', item['descricao']),
    #             "ativo": data.get('ativo', item['ativo'])
    #         })
            
    #         self._database[pk_int] = item
    #         return Response(item)
            
    #     except ValueError:
    #         return Response(
    #             {"error": "ID deve ser um número inteiro"}, 
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    
    # def partial_update(self, request, pk=None):
    #     """
    #     PATCH /api/mydb/1/ - Atualização parcial do item
    #     """
    #     try:
    #         pk_int = int(pk)
    #         if pk_int not in self._database:
    #             return Response(
    #                 {"error": f"Item com id {pk} não encontrado"}, 
    #                 status=status.HTTP_404_NOT_FOUND
    #             )
            
    #         data = request.data
    #         item = self._database[pk_int]
            
    #         # Atualizar apenas campos fornecidos
    #         if 'nome' in data:
    #             item['nome'] = data['nome']
    #         if 'descricao' in data:
    #             item['descricao'] = data['descricao']
    #         if 'ativo' in data:
    #             item['ativo'] = data['ativo']
            
    #         self._database[pk_int] = item
    #         return Response(item)
            
    #     except ValueError:
    #         return Response(
    #             {"error": "ID deve ser um número inteiro"}, 
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    
    # def destroy(self, request, pk=None):
    #     """
    #     DELETE /api/mydb/1/ - Remove item
    #     """
    #     try:
    #         pk_int = int(pk)
    #         if pk_int in self._database:
    #             deleted_item = self._database.pop(pk_int)
    #             return Response(
    #                 {"message": f"Item {pk} deletado com sucesso", "deleted_item": deleted_item},
    #                 status=status.HTTP_200_OK
    #             )
    #         else:
    #             return Response(
    #                 {"error": f"Item com id {pk} não encontrado"}, 
    #                 status=status.HTTP_404_NOT_FOUND
    #             )
    #     except ValueError:
    #         return Response(
    #             {"error": "ID deve ser um número inteiro"}, 
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    
    # # === CUSTOM ACTIONS ===
    
    # @action(detail=False, methods=['get'])
    # def estatisticas(self, request):
    #     """
    #     GET /api/mydb/estatisticas/ - Estatísticas dos dados
    #     """
    #     total = len(self._database)
    #     ativos = sum(1 for item in self._database.values() if item['ativo'])
    #     inativos = total - ativos
        
    #     return Response({
    #         "estatisticas": {
    #             "total_itens": total,
    #             "itens_ativos": ativos,
    #             "itens_inativos": inativos,
    #             "percentual_ativos": f"{(ativos/total)*100:.1f}%" if total > 0 else "0%"
    #         }
    #     })
    
    # @action(detail=False, methods=['get'])
    # def exportar(self, request):
    #     """
    #     GET /api/mydb/exportar/ - Exporta dados
    #     """
    #     formato = request.GET.get('formato', 'json')
        
    #     if formato == 'json':
    #         return Response({
    #             "exportacao": {
    #                 "formato": "json",
    #                 "total_registros": len(self._database),
    #                 "dados": list(self._database.values())
    #             }
    #         })
    #     elif formato == 'resumido':
    #         dados_resumidos = [
    #             {"id": item['id'], "nome": item['nome'], "ativo": item['ativo']}
    #             for item in self._database.values()
    #         ]
    #         return Response({
    #             "exportacao": {
    #                 "formato": "resumido",
    #                 "total_registros": len(dados_resumidos),
    #                 "dados": dados_resumidos
    #             }
    #         })
    #     else:
    #         return Response(
    #             {"error": f"Formato '{formato}' não suportado"}, 
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    
    # @action(detail=True, methods=['get'])
    # def duplicar(self, request, pk=None):
    #     """
    #     GET /api/mydb/1/duplicar/ - Duplica um item
    #     """
    #     try:
    #         pk_int = int(pk)
    #         if pk_int not in self._database:
    #             return Response(
    #                 {"error": f"Item com id {pk} não encontrado"}, 
    #                 status=status.HTTP_404_NOT_FOUND
    #             )
            
    #         original = self._database[pk_int]
    #         new_id = self._next_id
    #         novo_item = {
    #             "id": new_id,
    #             "nome": f"{original['nome']} (Cópia)",
    #             "descricao": original['descricao'],
    #             "ativo": original['ativo']
    #         }
            
    #         self._database[new_id] = novo_item
    #         self._next_id += 1
            
    #         return Response({
    #             "message": f"Item {pk} duplicado com sucesso",
    #             "original": original,
    #             "copia": novo_item
    #         })
            
    #     except ValueError:
    #         return Response(
    #             {"error": "ID deve ser um número inteiro"}, 
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    
    # @action(detail=True, methods=['get'])
    # def ativar(self, request, pk=None):
    #     """
    #     GET /api/mydb/1/ativar/ - Ativa um item
    #     """
    #     return self._alterar_status(pk, True)
    
    # @action(detail=True, methods=['get'])
    # def desativar(self, request, pk=None):
    #     """
    #     GET /api/mydb/1/desativar/ - Desativa um item
    #     """
    #     return self._alterar_status(pk, False)
    
    # def _alterar_status(self, pk, ativar):
    #     """Método auxiliar para ativar/desativar"""
    #     try:
    #         pk_int = int(pk)
    #         if pk_int not in self._database:
    #             return Response(
    #                 {"error": f"Item com id {pk} não encontrado"}, 
    #                 status=status.HTTP_404_NOT_FOUND
    #             )
            
    #         self._database[pk_int]['ativo'] = ativar
    #         acao = "ativado" if ativar else "desativado"
            
    #         return Response({
    #             "message": f"Item {pk} {acao} com sucesso",
    #             "item": self._database[pk_int]
    #         })
            
    #     except ValueError:
    #         return Response(
    #             {"error": "ID deve ser um número inteiro"}, 
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    
    # @action(detail=False, methods=['post'])
    # def bulk_create(self, request):
    #     """
    #     POST /api/mydb/bulk_create/ - Cria múltiplos itens de uma vez
    #     """
    #     items_data = request.data.get('items', [])
        
    #     if not isinstance(items_data, list):
    #         return Response(
    #             {"error": "O campo 'items' deve ser uma lista"}, 
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
        
    #     created_items = []
    #     for item_data in items_data:
    #         if not item_data.get('nome'):
    #             continue  # Pula itens sem nome
            
    #         new_id = self._next_id
    #         new_item = {
    #             "id": new_id,
    #             "nome": item_data.get('nome'),
    #             "descricao": item_data.get('descricao', ''),
    #             "ativo": item_data.get('ativo', True)
    #         }
            
    #         self._database[new_id] = new_item
    #         created_items.append(new_item)
    #         self._next_id += 1
        
    #     return Response({
    #         "message": f"{len(created_items)} itens criados com sucesso",
    #         "created_items": created_items
    #     }, status=status.HTTP_201_CREATED)