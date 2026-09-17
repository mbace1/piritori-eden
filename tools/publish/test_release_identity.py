import unittest
from arena_lab_release import build_identity
class Identity(unittest.TestCase):
    def test_consistent_markers(self):
        for number in ('19','19.1','20'):
            html=f'<title>Piritori · Night Shift C.{number}</title><h1>NIGHT SHIFT <span>C.{number}</span></h1><summary>About this build / test fixtures</summary><p>C.{number} —'
            data={'web/crew-run/index.html':html.encode()}
            self.assertEqual(build_identity(data),f'C.{number}')
            data['web/crew-run/index.html']=html.replace(f'<p>C.{number}', '<p>C.18').encode()
            with self.assertRaises(ValueError): build_identity(data)
    def test_missing_marker(self):
        with self.assertRaises(ValueError):build_identity({'web/crew-run/index.html':b'<title>No release</title>'})
if __name__=='__main__':unittest.main()
