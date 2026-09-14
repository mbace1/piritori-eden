import unittest
import tempfile
from pathlib import Path
from arena_lab_release import validate_cache_transition, read_previous_cabinet


class CacheTransitionTest(unittest.TestCase):
    def setUp(self):
        self.previous = {'web/index.html': b'<script src="./main.js?v=1"></script>',
                         'web/main.js': b'export const value=1;\n'}

    def test_line_ending_change_requires_a_new_url(self):
        current = dict(self.previous, **{'web/main.js': b'export const value=1;\r\n'})
        with self.assertRaisesRegex(ValueError, 'fresh cache token'):
            validate_cache_transition(current, self.previous)
        current['web/index.html'] = b'<script src="./main.js?v=2"></script>'
        validate_cache_transition(current, self.previous)

    def test_transitive_importer_must_also_change_its_url(self):
        previous = dict(self.previous)
        previous['web/main.js'] = b'import "./shared.mjs?v=1";'
        previous['web/shared.mjs'] = b'export const value=1;'
        current = dict(previous)
        current['web/shared.mjs'] = b'export const value=2;'
        current['web/main.js'] = b'import "./shared.mjs?v=2";'
        with self.assertRaisesRegex(ValueError, 'web/main.js'):
            validate_cache_transition(current, previous)
        current['web/index.html'] = b'<script src="./main.js?v=2"></script>'
        validate_cache_transition(current, previous)

    def test_split_tokens_fail(self):
        current = dict(self.previous)
        current['web/other.html'] = b'<script src="./main.js?v=2"></script>'
        with self.assertRaisesRegex(ValueError, 'Split module cache token'):
            validate_cache_transition(current, self.previous)

    def test_changed_unversioned_dependency_fails(self):
        previous = dict(self.previous)
        previous['web/main.js'] = b'import "./shared.mjs";'
        previous['web/shared.mjs'] = b'export const value=1;'
        current = dict(previous)
        current['web/shared.mjs'] = b'export const value=2;'
        with self.assertRaisesRegex(ValueError, 'web/shared.mjs'):
            validate_cache_transition(current, previous)
        current['web/main.js'] = b'import "./shared.mjs?v=1";'
        current['web/index.html'] = b'<script src="./main.js?v=2"></script>'
        validate_cache_transition(current, previous)

    def test_missing_or_empty_baseline_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            for path in [Path(tmp), Path(tmp)/'missing']:
                with self.assertRaisesRegex(ValueError, 'Previous cabinet'):
                    read_previous_cabinet(path)


if __name__ == '__main__':
    unittest.main()
