from sqlalchemy import bindparam


class UnsupportedOperatorError(Exception):
    def __init__(self, operator):
        super().__init__(f"Operador '{operator}' não suportado")


class OperatorMapper:
    """Classe para mapear operadores/filtros de URL para SQLAlchemy com bindparam"""

    def __init__(self):
        self.operator_map = {
            # Operadores de comparação
            "__eq": self._equal,
            "__ne": self._not_equal,
            "__gt": self._greater_than,
            "__gte": self._greater_equal,
            "__lt": self._less_than,
            "__lte": self._less_equal,
            # Operadores de texto
            "__like": self._like,
            "__ilike": self._ilike,
            "__startswith": self._startswith,
            "__endswith": self._endswith,
            "__contains": self._contains,
            "__notcontains": self._not_contains,
            # Operadores de lista/conjunto
            "__in": self._in,
            "__notin": self._not_in,
            # Operadores booleanos
            "__is": self._is,
            # Operadores de nulo
            "__isnull": self._is_null,
            "__isnotnull": self._is_not_null,
            # Operadores de intervalo
            "__between": self._between,
        }

    def apply_filter(self, field, operator, value):
        """Aplica um filtro e retorna condição e parâmetros para bindparam"""

        operator = self.uniformize_operator(operator)

        if operator not in self.operator_map:
            raise UnsupportedOperatorError(operator)

        return self.operator_map[operator](field, value)

    def _equal(self, field, value):
        param_name = f"param_{field.key}_eq"
        return field == bindparam(param_name, value=value, type_=field.type), {
            param_name: value,
        }

    def _not_equal(self, field, value):
        param_name = f"param_{field.key}_ne"
        return field != bindparam(param_name, value=value, type_=field.type), {
            param_name: value,
        }

    def _greater_than(self, field, value):
        param_name = f"param_{field.key}_gt"
        return field > bindparam(param_name, value=value, type_=field.type), {
            param_name: value,
        }

    def _greater_equal(self, field, value):
        param_name = f"param_{field.key}_gte"
        return field >= bindparam(param_name, value=value, type_=field.type), {
            param_name: value,
        }

    def _less_than(self, field, value):
        param_name = f"param_{field.key}_lt"
        return field < bindparam(param_name, value=value, type_=field.type), {
            param_name: value,
        }

    def _less_equal(self, field, value):
        param_name = f"param_{field.key}_lte"
        return field <= bindparam(param_name, value=value, type_=field.type), {
            param_name: value,
        }

    def _like(self, field, value):
        param_name = f"param_{field.key}_like"
        return field.like(bindparam(param_name, value=f"%{value}%")), {
            param_name: f"%{value}%",
        }

    def _ilike(self, field, value):
        param_name = f"param_{field.key}_ilike"
        return field.ilike(bindparam(param_name, value=f"%{value}%")), {
            param_name: f"%{value}%",
        }

    def _startswith(self, field, value):
        param_name = f"param_{field.key}_startswith"
        return field.like(bindparam(param_name, value=f"{value}%")), {
            param_name: f"{value}%",
        }

    def _endswith(self, field, value):
        param_name = f"param_{field.key}_endswith"
        return field.like(bindparam(param_name, value=f"%{value}")), {
            param_name: f"%{value}",
        }

    def _contains(self, field, value):
        param_name = f"param_{field.key}_contains"
        return field.ilike(bindparam(param_name, value=f"%{value}%")), {
            param_name: f"%{value}%",
        }

    def _not_contains(self, field, value):
        param_name = f"param_{field.key}_notcontains"
        return ~field.ilike(bindparam(param_name, value=f"%{value}%")), {
            param_name: f"%{value}%",
        }

    def _in(self, field, value):
        if isinstance(value, str):
            value = [item.strip() for item in value.split(",")]
        if not isinstance(value, (list, tuple)):
            value = [value]

        param_name = f"param_{field.key}_in"
        return field.in_(bindparam(param_name, value=value, type_=field.type)), {
            param_name: value,
        }

    def _not_in(self, field, value):
        if isinstance(value, str):
            value = [item.strip() for item in value.split(",")]
        if not isinstance(value, (list, tuple)):
            value = [value]

        param_name = f"param_{field.key}_notin"
        return ~field.in_(bindparam(param_name, value=value, type_=field.type)), {
            param_name: value,
        }

    def _is(self, field, value):
        if isinstance(value, str):
            value = value.lower()
            if value in ["true", "1"]:
                value = True
            elif value in ["false", "0"]:
                value = False
        value = bool(value)
        return field.is_(value), {}

    def _is_null(self, field, value):
        return field.is_(None), {}

    def _is_not_null(self, field, value):
        return field.isnot(None), {}

    def _between(self, field, value):
        if isinstance(value, str):
            min_val_str, max_val_str = value.split(",")
            min_val, max_val = min_val_str.strip(), max_val_str.strip()
        else:
            min_val, max_val = value[0], value[1]

        param_name_min = f"param_{field.key}_between_min"
        param_name_max = f"param_{field.key}_between_max"

        return field.between(
            bindparam(param_name_min, value=min_val, type_=field.type),
            bindparam(param_name_max, value=max_val, type_=field.type),
        ), {param_name_min: min_val, param_name_max: max_val}

    def uniformize_operator(self, operator):
        available_operators = {
            # Operadores de comparação
            # =
            "=": "__eq",
            "eq": "__eq",
            "equals": "__eq",
            "__equals": "__eq",
            "__eq": "__eq",
            # !=
            "!=": "__ne",
            "not": "__ne",
            "__not": "__ne",
            "ne": "__ne",
            "doesNotEqual": "__ne",
            "__notequal": "__ne",
            "__ne": "__ne",
            # >
            ">": "__gt",
            "gt": "__gt",
            "__gt": "__gt",
            # >=
            ">=": "__gte",
            "gte": "__gte",
            "ge": "__gte",
            "__gte": "__gte",
            # <
            "<": "__lt",
            "lt": "__lt",
            "__lt": "__lt",
            # <=
            "<=": "__lte",
            "lte": "__lte",
            "le": "__lte",
            "__lte": "__lte",
            # Operadores de texto
            # contains
            "contains": "__contains",
            "__contains": "__contains",
            # not contains
            "doesnotcontain": "__notcontains",
            "doesNotContain": "__notcontains",
            "__notcontains": "__notcontains",
            # like
            "like": "__like",
            "__like": "__like",
            # ilike
            "ilike": "__ilike",
            "__ilike": "__ilike",
            # startswith
            "startswith": "__startswith",
            "__startswith": "__startswith",
            # endswith
            "endswith": "__endswith",
            "__endswith": "__endswith",
            # Operadores de lista/conjunto
            # in
            "in": "__in",
            "isAnyOf": "__in",
            "__in": "__in",
            # not in
            "notin": "__notin",
            "isNotAnyOf": "__notin",
            "__notin": "__notin",
            # Operadores booleanos
            "is": "__is",
            "__is": "__is",
            # Operadores de nulo
            # isnull
            "isnull": "__isnull",
            "isNull": "__isnull",
            "__isnull": "__isnull",
            # isnotnull
            "isnotnull": "__isnotnull",
            "isNotNull": "__isnotnull",
            "__isnotnull": "__isnotnull",
            # Operadores de intervalo
            # between
            "range": "__between",
            "__range": "__between",
            "between": "__between",
            "__between": "__between",
        }

        if operator in available_operators:
            return available_operators[operator]
        raise UnsupportedOperatorError(operator)
