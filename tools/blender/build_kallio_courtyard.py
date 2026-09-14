"""C.16 repeatable static scenery kit. Blender 5.x, no external API.

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
        'glass':(.035,.065,.08),'lit':(.85,.48,.16),'cream':(.57,.52,.39),
        'window_lit':(.53,.35,.17),'curtain':(.38,.30,.20),'room':(.08,.064,.045),
        'leaf':(.13,.18,.095),'ochre_leaf':(.24,.16,.068),'soil':(.045,.035,.024),
        'grime':(.24,.235,.195),'rust':(.27,.13,.06),'paint_chip':(.22,.27,.20)}
mats={}
for name,color in colors.items():
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.72
 if name in ('iron','green'):p.inputs['Metallic'].default_value=.25
 if name=='lit':p.inputs['Emission Color'].default_value=(1,.51,.16,1);p.inputs['Emission Strength'].default_value=2.2
 if name=='window_lit':p.inputs['Emission Color'].default_value=(.9,.48,.15,1);p.inputs['Emission Strength'].default_value=.7
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

def patch(name,points,mat):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(points,[],[tuple(range(len(points)))]);mesh.materials.append(mats[mat])
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=root
def finish():
 # One mesh per material per motif, shared on the engine side.
 for mat in mats.values():
  objects=[o for o in list(root.children) if o.type=='MESH' and o.data.materials[0]==mat]
  if not objects:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=root.name+'_'+mat.name
def window(x,z,lit=True,front=-.325,variant=0):
 # Actual opening and recessed room. Curtains/furniture live behind the frame.
 back=front+.27
 cube('room back',(x,back,z),(1.10,.035,1.53),'window_lit' if lit else 'glass',.003)
 for dx in [-.55,.55]:cube('reveal',(x+dx,front+.12,z),(.045,.32,1.57),'cream',.008)
 for dz in [-.77,.77]:cube('reveal',(x,front+.12,z+dz),(1.12,.32,.045),'cream',.008)
 for dx,width in [(-.42,.22+variant*.04),(.45,.16)]:
  cube('curtain',(x+dx,front+.10,z+.08),(width,.035,1.32),'curtain',.008)
  for fold in [-.055,.02]:cube('curtain fold',(x+dx+fold,front+.076,z+.08),(.018,.018,1.3),'room',.002)
 if lit:
  cube('desk silhouette',(x+.12,front+.20,z-.48),(.68,.22,.06),'room',.005)
  for dx in [-.15,.38]:cube('desk leg',(x+dx,front+.22,z-.63),(.025,.08,.24),'room',.003)
  cube('book',(x+.26,front+.17,z-.37),(.12,.12,.18),'wood',.003)
 else:
  for dz in [-.48,-.23,.02,.27,.52]:cube('blind',(x,front+.16,z+dz),(.92,.025,.012),'iron',0)
 for dx in [-.57,.57,0]:cube('frame',(x+dx,front-.075,z),(.065,.17,1.62),'wood',.009)
 for dz in [-.8,.8,.20]:cube('frame',(x,front-.075,z+dz),(1.21,.17,.065),'wood',.009)
 cube('sill',(x,front-.11,z-.88),(1.38,.46,.13),'stone')
 cube('lintel',(x,front-.075,z+.91),(1.35,.22,.10),'cream')

def facade(name,pattern):
 asset(name)
 # Build the wall around four real openings rather than covering it with panes.
 for lo,hi in [(0,1.14),(2.70,4.07),(5.63,6.4)]:cube('wall course',(0,0,(lo+hi)/2),(3,.65,hi-lo),'plaster',.018)
 for lo,hi in [(1.14,2.70),(4.07,5.63)]:
  for x,w in [(-1.37,.26),(0,.28),(1.37,.26)]:cube('wall pier',(x,0,(lo+hi)/2),(w,.65,hi-lo),'plaster',.012)
 cube('plinth',(0,-.035,.46),(3.03,.76,.92),'stone')
 for z in [3.32,6.37]:cube('cornice',(0,-.04,z),(3.12,.82,.15),'cream')
 for i,(x,z) in enumerate([(-.70,1.92),(.70,1.92),(-.70,4.85),(.70,4.85)]):window(x,z,pattern[i],variant=i%2)
 rod((1.36,-.48,.18),(1.36,-.48,6.25),.045)
 for z in [.5,2.2,3.9,5.6]:cube('pipe strap',(1.36,-.49,z),(.15,.12,.065),'iron',.007)
 for x,z,w,h in [(1.36,3.2,.11,.44),(-.95,3.2,.045,.31),(.87,6.24,.08,.42),(-1.36,1.0,.16,.19)]:
  patch('rain stain',[(x-w,-.333,z),(x+w,-.333,z),(x+w*.4,-.334,z-h*.55),(x+w*.15,-.333,z-h),(x-w*.4,-.333,z-h*.78)],'grime')
 for x,z in [(-1.26,.34),(.9,.15),(-.22,.7)]:patch('plinth chip',[(x,-.424,z),(x+.16,-.424,z+.04),(x+.20,-.424,z-.02),(x+.04,-.424,z-.05)],'grime')
 finish()

facade('facade_bay',[True,False,False,True])
facade('facade_bay_b',[False,True,True,False])

asset('archway')
for x in [-1.28,1.28]:cube('pier',(x,0,1.6),(.65,1.8,3.2),'plaster')
for x in [-1.08,1.08]:cube('upper pier',(x,0,4.9),(1.04,1.8,3),'plaster')
for z,h in [(3.72,.64),(6.05,.7)]:cube('upper course',(0,0,z),(1.12,1.8,h),'plaster')
# Arch voussoirs form the opening, never a solid transparent painted doorway.
for i in range(32):
 a=(i+.5)*math.pi/32;x=math.cos(a)*1.05;z=2.30+math.sin(a)*1.05
 o=cube('arch stone',(x,-.10,z),(.12,1.85,.28),'stone',.016);o.rotation_euler.y=a-math.pi/2
cube('cornice',(0,0,6.38),(3.28,1.93,.16),'cream');window(0,4.9,True,front=-.9)
for x in [-1.04,1.04]:cube('passage side',(x,2.05,1.3),(.18,2.35,2.6),'brick')
cube('passage floor',(0,1.98,.035),(2.18,3.5,.07),'stone')
cube('passage ceiling',(0,2.05,2.68),(2.18,2.4,.16),'room')
for x in [-.86,-.64,-.42,-.2,.02,.24,.46,.68,.9]:rod((x,3.15,.15),(x,3.15,2.47),.022)
rod((-.97,3.15,2.48),(.97,3.15,2.48),.037)
cube('passage fixture',(0,1.65,2.53),(.36,.48,.09),'iron');cube('passage bulb',(0,1.65,2.47),(.24,.34,.05),'lit')
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
rod((-.16,-.5,1.15),(.16,-.5,1.15),.027,'iron')
for x in [-.4,.4]:cube('lid lip',(x,0,1.39),(.045,.86,.055),'green',.01)
for x,z,w in [(-.12,.88,.15),(-.09,.84,.2)]:cube('label ink',(x,-.49,z),(w,.008,.014),'iron',0)
for x,y,w in [(-.42,-.27,.11),(.13,.42,.13),(.19,-.42,.08),(-.43,.13,.06)]:
 patch('lid wear',[(x,y,1.421),(x+w,y+.008,1.421),(x+w*.7,y+.029,1.421),(x-.018,y+.018,1.421)],'paint_chip')
for x,z,w in [(-.25,.35,.15),(.11,.47,.08),(.06,1.10,.12)]:patch('scraped paint',[(x,-.461,z),(x+w,-.461,z+.008),(x+w*.7,-.461,z+.025),(x+.018,-.461,z+.019)],'rust')
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

asset('planter')
cube('trough',(0,0,.29),(1.75,.65,.58),'stone',.04)
cube('soil',(0,0,.595),(1.58,.49,.035),'soil',.015)
for x in [-.62,-.29,.08,.48,.69]:
 rod((x,0,.61),(x+.03,0,.98),.014,'wood')
 for k in range(12):
  a=k*2.40+x*3
  mesh=bpy.data.meshes.new('creased leaf');mesh.from_pydata([(0,0,0),(.10,.065,.014),(.23,0,.065),(.10,-.065,.014),(.115,0,.055)],[],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)])
  o=bpy.data.objects.new('leaf blade',mesh);bpy.context.collection.objects.link(o);o.location=(x+math.cos(a)*.09,math.sin(a)*.12,.70+(k%4)*.078);o.rotation_euler=(.28*(k%3),.2,a);o.data.materials.append(mats['ochre_leaf' if k%5==0 else 'leaf']);o.parent=root
finish()

asset('ground_litter')
for i in range(18):
 a=i*2.4;x=math.sin(a)*(.24+i*.025);y=math.cos(a)*(.20+i*.018);z=.008+(i%3)*.001;s=.4+(i%5)*.09
 points=[]
 for dx,dy,dz in [(0,0,0),(.10,.024,.005),(.19,0,0),(.07,-.039,.003)]:points.append((x+s*(dx*math.cos(a)-dy*math.sin(a)),y+s*(dx*math.sin(a)+dy*math.cos(a)),z+dz))
 patch('fallen leaf',points,'ochre_leaf' if i%3 else 'leaf')
patch('paper scrap',[(-.3,.13,.023),(-.09,.16,.023),(-.08,.28,.026),(-.24,.29,.034)],'cream')
finish()

# Local cavity shading travels with each static motif; no baked ground shadow.
from mathutils.bvhtree import BVHTree
import random
rng=random.Random(1603)
bpy.context.view_layer.update()
for motif in [o for o in bpy.data.objects if o.type=='EMPTY']:
 children=[o for o in motif.children if o.type=='MESH'];verts=[];faces=[]
 for o in children:
  offset=len(verts);verts.extend([o.matrix_world@v.co for v in o.data.vertices]);faces.extend([tuple(offset+i for i in f.vertices) for f in o.data.polygons])
 tree=BVHTree.FromPolygons(verts,faces)
 for o in children:
  mesh=o.data;colors=mesh.color_attributes.new(name='cavity',type='FLOAT_COLOR',domain='CORNER')
  normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
  for poly in mesh.polygons:
   normal=(normal_matrix@poly.normal).normalized()
   for loop in poly.loop_indices:
    pos=o.matrix_world@mesh.vertices[mesh.loops[loop].vertex_index].co;origin=pos+normal*.012;blocked=0
    for k in range(6):
     ray=Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(-1,1))).normalized()
     if ray.dot(normal)<0:ray=-ray
     ray=(ray+normal*.65).normalized();hit=tree.ray_cast(origin,ray,.65)
     if hit[0] is not None:blocked+=1-hit[3]/.65
    shade=max(.57,1-blocked*.09);colors.data[loop].color=(shade,shade,shade,1)
  mesh.color_attributes.active_color=colors
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_vertex_color='NAME',export_vertex_color_name='cavity')
triangles=sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH' for p in o.data.polygons)
report={'generator':Path(__file__).name,'blender':bpy.app.version_string,'units':'metres','forward':'+Z','triangles':triangles,'bytes':out.stat().st_size,'motifs':[o.name for o in bpy.data.objects if o.type=='EMPTY']}
out.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
files=[out.name,'painted-plaster-v01.png','painted-setts-v01.png']
if all((out.parent/f).is_file() for f in files):
 report['status']='prototype scenery; not owner-accepted'
 report['files']=[{'file':f,'bytes':(out.parent/f).stat().st_size,'sha256':hashlib.sha256((out.parent/f).read_bytes()).hexdigest()} for f in files]
 out.with_suffix('.manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
