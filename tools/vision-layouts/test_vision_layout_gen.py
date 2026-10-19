"""Run: python -m unittest -v test_vision_layout_gen.py"""
import math
import unittest
from vision_layout_gen import LAYOUTS, assign_goals, export, generate, render


def area(poly):
    return abs(sum((p[0]*q[1]-q[0]*p[1]) for p,q in zip(poly,poly[1:]+poly[:1])))/2


class VisionLayoutTests(unittest.TestCase):
    def test_all_aspects_and_variations_are_safe(self):
        total=0
        for aspect in (.5625,.75,1,4/3,16/9,2.35):
            for name in LAYOUTS:
                for v in range(6):
                    for density in ('airy','balanced','dense'):
                        board=generate(name,124+v,aspect,density,variation=v)
                        photos=[l for l in board.layers if l['kind']=='photo']
                        self.assertGreaterEqual(len(photos),4)
                        self.assertEqual(export(board)['image_count'],len(photos))
                        for layer in board.layers:
                            poly=layer['poly']
                            self.assertGreaterEqual(len(poly),2)
                            for x,y in poly:
                                self.assertTrue(math.isfinite(x) and math.isfinite(y))
                                self.assertGreaterEqual(x,-.00001)
                                self.assertLessEqual(x,1.00001)
                                self.assertGreaterEqual(y,-.00001)
                                self.assertLessEqual(y,aspect+.00001)
                            if layer['kind']!='line':
                                self.assertGreater(area(poly),.00001,(name,layer['id']))
                        total+=1
        self.assertEqual(total,6*len(LAYOUTS)*6*3)

    def test_seed_reproducible_and_variants_differ(self):
        for name in LAYOUTS:
            a=generate(name,33,4/3,variation=0)
            b=generate(name,33,4/3,variation=0)
            c=generate(name,34,4/3,variation=1)
            self.assertEqual(a.layers,b.layers)
            self.assertNotEqual(a.layers,c.layers)

    def test_legacy_coordinate_space(self):
        b=generate('editorial',5,16/9)
        result=export(b)
        for layer in result['layers']:
            for (x,y),(u,v) in zip(layer['poly'],layer['poly_normalized']):
                self.assertAlmostEqual(x,u,5)
                self.assertAlmostEqual(y/b.a,v,5)

    def test_goals_and_render(self):
        b=generate('editorial',11)
        assign_goals(b,{'vision_title':'THE FUTURE IS BRIGHT','affirmation':'I am curious and courageous.',
                        'goals':[{'id':'travel','label':'EXPLORE','weight':2},
                                 {'id':'career','label':'CREATE','weight':1}]})
        self.assertTrue(all(s.get('goal_id') for s in b.layers if s['kind']=='photo'))
        self.assertEqual(len(b.goals),2)
        im=render(b,240)
        self.assertEqual(im.size,(240,320))


if __name__=='__main__':unittest.main()
