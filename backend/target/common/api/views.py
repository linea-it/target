from django.contrib.auth import logout
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def teste(request):
    if request.method == "GET":
        return Response({"status": "success"})
    return None


@api_view(["GET"])
def logout_user(request):
    logout(request)
    return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
