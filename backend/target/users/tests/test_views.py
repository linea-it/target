from http import HTTPStatus

import pytest
from django.test import RequestFactory

from target.users.models import User
from target.users.tests.factories import UserFactory
from target.users.views import UserUpdateView
from target.users.views import user_detail_view

pytestmark = pytest.mark.django_db


class TestUserUpdateView:
    def test_get_object(self, user: User, rf: RequestFactory):
        view = UserUpdateView()
        request = rf.get("/fake-url/")
        request.user = user

        view.request = request

        assert view.get_object() == user


class TestUserDetailView:
    def test_authenticated(self, user: User, rf: RequestFactory):
        request = rf.get("/fake-url/")
        request.user = UserFactory()
        response = user_detail_view(request, username=user.username)

        assert response.status_code == HTTPStatus.OK
