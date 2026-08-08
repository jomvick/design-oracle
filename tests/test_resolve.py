import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from backend.resolver import classify_url, resolve_url


def run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


class TestClassifyUrl(unittest.TestCase):
    def test_awwwards_resolvable(self):
        platform, resolvable = classify_url("https://www.awwwards.com/sites/stripe-press")
        self.assertEqual(platform, "awwwards")
        self.assertTrue(resolvable)

    def test_siteinspire_resolvable(self):
        platform, resolvable = classify_url("https://www.siteinspire.com/websites/1234")
        self.assertEqual(platform, "siteinspire")
        self.assertTrue(resolvable)

    def test_behance_not_resolvable(self):
        platform, resolvable = classify_url("https://www.behance.net/gallery/12345/Foo")
        self.assertEqual(platform, "behance")
        self.assertFalse(resolvable)

    def test_dribbble_not_resolvable(self):
        platform, resolvable = classify_url("https://dribbble.com/shots/12345-Foo")
        self.assertEqual(platform, "dribbble")
        self.assertFalse(resolvable)

    def test_mobbin_not_resolvable(self):
        platform, resolvable = classify_url("https://mobbin.com/apps/airbnb/ios")
        self.assertEqual(platform, "mobbin")
        self.assertFalse(resolvable)

    def test_designspiration_not_resolvable(self):
        platform, resolvable = classify_url("https://www.designspiration.net/search/palettes")
        self.assertEqual(platform, "designspiration")
        self.assertFalse(resolvable)

    def test_unknown_url(self):
        platform, resolvable = classify_url("https://stripe.com")
        self.assertEqual(platform, "unknown")
        self.assertTrue(resolvable)


class TestResolveUrl(unittest.TestCase):
    def test_unknown_returns_self_as_target(self):
        result = run(resolve_url("https://stripe.com"))
        self.assertEqual(
            result,
            {"platform": "unknown", "resolvable": True, "target_url": "https://stripe.com"},
        )

    def test_behance_not_resolvable(self):
        result = run(resolve_url("https://www.behance.net/gallery/12345/Foo"))
        self.assertEqual(result, {"platform": "behance", "resolvable": False})

    @patch("backend.resolver.httpx.AsyncClient")
    def test_awwwards_extracts_visit_site_link(self, MockClient):
        html = '<html><body><a class="btn" href="https://press.stripe.com">Visit Site</a></body></html>'
        resp = MagicMock()
        resp.text = html
        resp.url = "https://www.awwwards.com/sites/stripe-press"
        client = AsyncMock()
        client.get.return_value = resp
        client.__aenter__.return_value = client
        MockClient.return_value = client

        result = run(resolve_url("https://www.awwwards.com/sites/stripe-press"))
        self.assertTrue(result["resolvable"])
        self.assertEqual(result["target_url"], "https://press.stripe.com")

    @patch("backend.resolver.httpx.AsyncClient")
    def test_network_error_returns_not_resolvable(self, MockClient):
        client = AsyncMock()
        client.get.side_effect = httpx.ConnectError("boom")
        client.__aenter__.return_value = client
        MockClient.return_value = client

        result = run(resolve_url("https://www.awwwards.com/sites/foo"))
        self.assertFalse(result["resolvable"])
        self.assertEqual(result["platform"], "awwwards")

    @patch("backend.resolver.httpx.AsyncClient")
    def test_no_external_link_returns_not_resolvable(self, MockClient):
        html = "<html><body><h1>Project</h1></body></html>"
        resp = MagicMock()
        resp.text = html
        resp.url = "https://www.awwwards.com/sites/foo"
        client = AsyncMock()
        client.get.return_value = resp
        client.__aenter__.return_value = client
        MockClient.return_value = client

        result = run(resolve_url("https://www.awwwards.com/sites/foo"))
        self.assertFalse(result["resolvable"])


if __name__ == "__main__":
    unittest.main()
