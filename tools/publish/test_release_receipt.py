import hashlib
import json
import unittest
from arena_lab_release import finalize_receipt

class Receipt(unittest.TestCase):
    def test_generated_files_and_provenance(self):
        data={'web/crew-run/index.html':b'game', 'index.html':b'entry', 'VERSIONS.md':b'version'}
        release={'source_commit':'a'*40}
        finalize_receipt(data,release)
        actual=json.loads(data['release.json'])
        self.assertEqual(actual['tested_source_head'],'a'*40)
        self.assertEqual(set(actual['sha256']),set(data)-{'release.json'})
        for name,digest in actual['sha256'].items():
            self.assertEqual(digest,hashlib.sha256(data[name]).hexdigest())
    def test_refinalization_is_rejected(self):
        with self.assertRaises(ValueError):
            finalize_receipt({'release.json':b'old'}, {'source_commit':'a'*40})
