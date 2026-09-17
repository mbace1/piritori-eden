import hashlib
import json
import unittest
from urllib.parse import urljoin, urlparse, parse_qs
from arena_lab_release import compatibility_redirect, finalize_receipt

class CompatibilityRoute(unittest.TestCase):
    def test_bookmark_stays_in_campaign_on_current_build(self):
        raw=compatibility_redirect('C.19')
        text=raw.decode()
        target='../?campaign=1&release=19'
        self.assertIn('content="0;url='+target+'"',text)
        self.assertIn('href="'+target+'"',text)
        destination=urlparse(urljoin('https://example.invalid/piritori-c17/web/crew-run/c17/',target))
        self.assertEqual(destination.path,'/piritori-c17/web/crew-run/')
        self.assertEqual(parse_qs(destination.query),{'campaign':['1'],'release':['19']})
        data={'web/crew-run/c17/index.html':raw}
        finalize_receipt(data,{'source_commit':'a'*40})
        self.assertEqual(json.loads(data['release.json'])['sha256']['web/crew-run/c17/index.html'],hashlib.sha256(raw).hexdigest())
    def test_rejects_non_version_destination(self):
        for identity in ['C.19?url=https://elsewhere.invalid','19','C.19/../../']:
            with self.assertRaises(ValueError):compatibility_redirect(identity)
