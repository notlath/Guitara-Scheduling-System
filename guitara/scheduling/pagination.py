"""
Custom pagination classes for the scheduling app
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict


class StandardResultsPagination(PageNumberPagination):
    """
    Standard pagination class for most API endpoints
    """

    page_size = 12  # Set to 12 items per page for production use
    page_size_query_param = "page_size"
    max_page_size = 200  # Increased max page size

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("count", self.page.paginator.count),
                    ("total_pages", self.page.paginator.num_pages),
                    ("current_page", self.page.number),
                    ("page_size", self.page_size),
                    ("next", self.get_next_link()),
                    ("previous", self.get_previous_link()),
                    ("results", data),
                ]
            )
        )


class AppointmentsPagination(PageNumberPagination):
    """
    Pagination class specifically for appointments
    Allows larger page sizes for dashboard views
    """

    page_size = 12  # Set to 12 items per page for production use
    page_size_query_param = "page_size"
    max_page_size = 200  # Increased max page size

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("count", self.page.paginator.count),
                    ("total_pages", self.page.paginator.num_pages),
                    ("current_page", self.page.number),
                    ("page_size", self.page_size),
                    ("next", self.get_next_link()),
                    ("previous", self.get_previous_link()),
                    ("has_next", self.page.has_next()),
                    ("has_previous", self.page.has_previous()),
                    ("results", data),
                ]
            )
        )


class NotificationsPagination(PageNumberPagination):
    """
    Pagination class for notifications
    Smaller page size for better UX
    """

    page_size = 12  # Set to 12 items per page for production use
    page_size_query_param = "page_size"
    max_page_size = 200  # Increased max page size

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("count", self.page.paginator.count),
                    ("total_pages", self.page.paginator.num_pages),
                    ("current_page", self.page.number),
                    ("page_size", self.page_size),
                    ("next", self.get_next_link()),
                    ("previous", self.get_previous_link()),
                    ("results", data),
                ]
            )
        )
