import copy
import unittest
from bear_path_manifest import build, FIGHTERS, ENVIRONMENT

class DeploymentMappingTests(unittest.TestCase):
    def setUp(self):
        self.source = {'schema_version': 1, 'assets': [
            {'id': id, 'file': ('cast3d/' if id in FIGHTERS else 'environment3d/')+id+'.glb', 'sha256': 'a'*64, 'bytes': 42}
            for id in FIGHTERS+ENVIRONMENT
        ]}
        self.old = copy.deepcopy(self.source)
        self.old['assets'] = self.old['assets'][:2]
        for asset in self.old['assets']:
            asset['file'] = 'https://raw.githubusercontent.com/mbace1/piritori-eden/'+'b'*40+'/models/'+asset['id']+'.glb'

    def test_source_paths_do_not_replace_published_fighter_urls(self):
        result = build(self.source, self.old)
        self.assertEqual(len(result['assets']), 4)
        self.assertEqual([a['file'] for a in result['assets'][:2]], [a['file'] for a in self.old['assets']])
        self.assertEqual(result['assets'][2:], self.source['assets'][2:])

    def test_changed_fighter_cannot_reuse_old_url(self):
        self.source['assets'][0]['sha256'] = 'c'*64
        with self.assertRaisesRegex(ValueError, 'identity changed'):
            build(self.source, self.old)

    def test_branch_or_signed_url_is_rejected(self):
        self.old['assets'][0]['file'] = self.old['assets'][0]['file'].replace('b'*40, 'main')
        with self.assertRaisesRegex(ValueError, 'pin a Piritori commit'):
            build(self.source, self.old)

if __name__ == '__main__':
    unittest.main()
