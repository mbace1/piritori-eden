"""C.15 repeatable static scenery kit. Blender 5.x, no external API.

blender --background --python tools/blender/build_kallio_courtyard.py -- OUTPUT.glb
Metres; exported Y-up; facade fronts +Z. No campaign/character data.
"""
import bpy, math, sys, json, hashlib
from pathlib import Path
from mathutils import Vector

out=Path(sys.argv[sys.argv.index('--')+1]).resolve()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
colors={'plaster':(.47,.43,.36),'stone':(.40,.41,.38),'brick':(.32,.20,.14),
        'wood':(.16,.105,.065),'iron':(.075,.105,.105),'green':(.15,.23,.19),
        'glass':(.035,.065,.08),'lit':(.85,.48,.16),'cream':(.57,.52,.39)}
mats={}
for name,color in colors.items():
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.72
 if name in ('iron','green'):p.inputs['Metallic'].default_value=.25
 if name=='lit':p.inputs['Emission Color'].default_value=(1,.51,.16,1);p.inputs['Emission Strength'].default_value=2.2
 mats[name]=m
root=None
def cube(name,loc,scale,mat,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mats[mat]);o.parent=root
 if bevel:
  b=o.modifiers.new('worn edges','BEVEL');b.width=bevel;b.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
 return o
def rod(a,b,r,mat='iron',verts=8):
 a,b=Vector(a),Vector(b);d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2)
 o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mats[mat]);o.parent=root
 return o
def asset(name):
 global root
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
def finish():
 # One mesh per material per motif, shared on the engine side.
 for mat in mats.values():
  objects=[o for o in list(root.children) if o.type=='MESH' and o.data.materials[0]==mat]
  if not objects:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=root.name+'_'+mat.name
def window(x,z,lit=True):
 cube('recess',(x,-.36,z),(1.12,.055,1.55),'glass',.01)
 cube('pane',(x,-.397,z),(.92,.025,1.36),'lit' if lit else 'glass',.003)
 for dx in [-.57,.57,0]:cube('frame',(x+dx,-.44,z),(.065,.14,1.62),'wood',.009)
 for dz in [-.8,.8,.20]:cube('frame',(x,-.44,z+dz),(1.21,.14,.065),'wood',.009)
 cube('sill',(x,-.48,z-.88),(1.38,.43,.13),'stone')
 cube('lintel',(x,-.405,z+.91),(1.35,.22,.10),'cream')

asset('facade_bay')
cube('wall',(0,0,3.2),(3,.65,6.4),'plaster',.035)
cube('plinth',(0,-.035,.46),(3.03,.76,.92),'stone')
for z in [3.32,6.37]:cube('cornice',(0,-.04,z),(3.12,.82,.15),'cream')
window(-.70,1.92,True);window(.7,4.85,False);window(-.70,4.85,True)
rod((1.36,-.48,.18),(1.36,-.48,6.25),.045)
for z in [.5,2.2,3.9,5.6]:cube('pipe strap',(1.36,-.49,z),(.15,.12,.065),'iron',.007)
finish()

asset('archway')
for x in [-1.28,1.28]:cube('pier',(x,0,1.6),(.65,1.8,3.2),'plaster')
cube('upper',(0,0,4.9),(3.2,1.8,3),'plaster')
# Arch voussoirs form the opening, never a solid transparent painted doorway.
for i in range(32):
 a=(i+.5)*math.pi/32;x=math.cos(a)*1.05;z=2.30+math.sin(a)*1.05
 o=cube('arch stone',(x,-.10,z),(.12,1.85,.28),'stone',.016);o.rotation_euler.y=a-math.pi/2
cube('cornice',(0,0,6.38),(3.28,1.93,.16),'cream');window(0,4.9,True)
finish()

asset('balcony')
cube('slab',(0,-.15,0),(2.1,1,.15),'stone')
for x in [-1,1]:rod((x,-.60,.12),(x,-.60,1.08),.032)
rod((-1,-.6,1.08),(1,-.6,1.08),.035)
for i in range(13):rod((-1+i/6,-.6,.12),(-1+i/6,-.6,1.08),.016)
for x in [-1,1]:rod((x,-.6,1.08),(x,.24,1.08),.025)
finish()

asset('service_bay')
cube('wall',(0,0,2.2),(4,.65,4.4),'brick');cube('shutter',(0,-.39,1.45),(2.9,.12,2.65),'green')
for i in range(17):cube('shutter seam',(0,-.47,.2+i*.152),(2.86,.025,.02),'iron',.002)
for x in [-1.5,1.5]:cube('jamb',(x,-.48,1.5),(.13,.2,2.95),'stone')
cube('lintel',(0,-.46,3),(3.15,.26,.18),'stone')
o=cube('awning',(0,-.8,3.48),(3.6,1.75,.09),'iron');o.rotation_euler.x=.09
cube('clerestory',(0,-.38,3.86),(2.3,.06,.42),'lit')
for x in [-.8,0,.8]:cube('bar',(x,-.43,3.86),(.05,.10,.5),'iron',.005)
finish()

asset('container')
cube('body',(0,0,.70),(.91,.91,1.23),'green',.06)
cube('lid',(0,0,1.35),(1,.99,.13),'iron',.045)
for x in [-.35,.35]:
 for y in [-.34,.34]:rod((x-.06,y,.1),(x+.06,y,.1),.095,'iron',10)
for x in [-.35,.35]:cube('rib',(x,-.465,.72),(.045,.035,.82),'green',.008)
cube('label',(0,-.474,.87),(.34,.018,.15),'cream',.005)
finish()

asset('low_wall')
cube('wall',(0,0,.34),(1.17,.22,.68),'brick',.016)
cube('coping',(0,0,.71),(1.2,.26,.06),'stone',.018)
for z in [.16,.34,.52]:cube('mortar',(0,-.114,z),(1.15,.008,.012),'stone',0)
finish()

asset('lamp')
cube('bracket',(0,.02,0),(.17,.15,.46),'iron');rod((0,0,.06),(0,-.33,.06),.045)
cube('shade',(0,-.36,-.01),(.45,.35,.12),'iron');cube('bulb',(0,-.36,-.13),(.22,.2,.17),'lit',.035)
finish()

asset('bike_rack')
for x in [-.75,-.25,.25,.75]:
 rod((x,0,.07),(x,0,.62),.025);rod((x,0,.62),(x,.48,.62),.025);rod((x,.48,.62),(x,.48,.07),.025)
rod((-.9,0,.07),(.9,0,.07),.025);finish()

asset('pallets')
for z in [.07,.23,.39]:
 for y in [-.36,0,.36]:cube('runner',(0,y,z),(1.08,.12,.12),'wood',.012)
 for x in [-.44,-.22,0,.22,.44]:cube('slat',(x,0,z+.09),(.18,.9,.055),'wood',.01)
finish()

asset('vent')
cube('housing',(0,0,.4),(1,.32,.8),'iron')
for i in range(8):cube('fin',(0,-.2,.08+i*.09),(.9,.14,.026),'green',.006)
finish()

asset('bicycle')
for x in [-.53,.53]:
 bpy.ops.mesh.primitive_torus_add(major_segments=20,minor_segments=6,location=(x,0,.36),rotation=(math.pi/2,0,0),major_radius=.32,minor_radius=.022)
 o=bpy.context.object;o.data.materials.append(mats['iron']);o.parent=root
 for i in range(8):
  a=i*math.pi/4;rod((x,0,.36),(x+math.cos(a)*.30,0,.36+math.sin(a)*.30),.006)
for a,b in [((-.53,0,.36),(-.14,0,.79)),((-.53,0,.36),(-.08,0,.34)),((-.14,0,.79),(-.08,0,.34)),((-.14,0,.79),(.40,0,.80)),((-.08,0,.34),(.40,0,.80)),((.40,0,.80),(.53,0,.36)),((.40,0,.80),(.37,0,1.01))]:rod(a,b,.022,'green')
rod((.37,-.18,1.01),(.37,.18,1.01),.019);cube('saddle',(-.14,0,.86),(.23,.16,.05),'wood',.018)
rod((-.08,-.12,.34),(-.08,.12,.34),.018);finish()

asset('drain')
cube('frame',(0,0,.025),(.85,.5,.05),'stone',.012)
cube('well',(0,0,.054),(.77,.42,.01),'iron',.003)
for i in range(10):cube('grate',(-.34+i*.075,0,.064),(.025,.43,.023),'stone',.005)
finish()

out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
triangles=sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH' for p in o.data.polygons)
report={'generator':Path(__file__).name,'blender':bpy.app.version_string,'units':'metres','forward':'+Z','triangles':triangles,'bytes':out.stat().st_size,'motifs':[o.name for o in bpy.data.objects if o.type=='EMPTY']}
out.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
files=[out.name,'painted-plaster-v01.png','painted-setts-v01.png']
if all((out.parent/f).is_file() for f in files):
 report['status']='prototype scenery; not owner-accepted'
 report['files']=[{'file':f,'bytes':(out.parent/f).stat().st_size,'sha256':hashlib.sha256((out.parent/f).read_bytes()).hexdigest()} for f in files]
 out.with_suffix('.manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
