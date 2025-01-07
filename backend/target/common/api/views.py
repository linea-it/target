from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def teste(request):
    if request.method == "GET":
        return Response({"status": "success"})
    return None
