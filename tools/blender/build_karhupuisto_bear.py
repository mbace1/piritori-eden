"""Blender-authored static landmark. Candidate/master remain private until reviewed.
Coordinates: Blender Z up; long axis X. Exporter converts to glTF Y up.
"""
import bpy, math, json, pathlib, hashlib
from mathutils import Vector, noise
OUT=pathlib.Path(__file__).resolve().parents[2]/'.private'/'bear-path-c08'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
parts=[]
def ellipsoid(name,loc,scale,detail=False):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12 if detail else 32,ring_count=8 if detail else 20,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);parts.append(o);return o
# Broad ursine anatomy: massive shoulder girdle, low heavy neck, short muzzle.
ellipsoid('torso',(-.18,0,1.00),(.78,.34,.43))
ellipsoid('haunches',(-.63,0,.97),(.42,.35,.40))
ellipsoid('shoulders',(.35,0,1.12),(.44,.38,.46))
ellipsoid('neck',(.65,0,1.20),(.35,.29,.33))
ellipsoid('skull',(.92,0,1.21),(.32,.265,.29))
ellipsoid('muzzle',(1.18,0,1.12),(.235,.176,.14))
ellipsoid('jaw',(1.00,0,1.00),(.27,.19,.105))
for side in [-1,1]:
 ellipsoid('rear thigh',(-.69,side*.255,.66),(.205,.19,.37))
 ellipsoid('rear shin',(-.77,side*.265,.32),(.135,.145,.24))
 ellipsoid('rear paw',(-.66,side*.275,.115),(.225,.163,.115))
 ellipsoid('front shoulder',(.42,side*.27,.85),(.19,.19,.39))
 ellipsoid('front shin',(.51,side*.295,.36),(.165,.16,.29))
 ellipsoid('front paw',(.62,side*.30,.10),(.23,.175,.10))
 ellipsoid('round ear',(.81,side*.205,1.445),(.077,.073,.095))
ellipsoid('short tail',(-1.025,0,1.04),(.13,.11,.12))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();bear=bpy.context.object;bear.name='Bear_carved_red_granite'
remesh=bear.modifiers.new('Unify carved mass','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.026;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=bear.modifiers.new('Broad sculpt planes','SMOOTH');smooth.factor=.8;smooth.iterations=5;bpy.ops.object.modifier_apply(modifier=smooth.name)
dec=bear.modifiers.new('Game silhouette budget','DECIMATE');dec.ratio=.18;bpy.ops.object.modifier_apply(modifier=dec.name)
tri=bear.modifiers.new('Stable triangles','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=tri.name)
# The sculpture has an intentionally chiseled surface; no texture or baked light.
mesh=bear.data
colors=mesh.color_attributes.new(name='stone_color',type='FLOAT_COLOR',domain='CORNER')
for poly in mesh.polygons:
 poly.use_smooth=True
 for li in poly.loop_indices:
  co=mesh.vertices[mesh.loops[li].vertex_index].co
  broad=noise.noise(co*7)
  grain=noise.noise(co*31)
  t=max(.12,min(1,.43+broad*.63+grain*.37))
  # Mineral clusters and charcoal weathering, not fur or baked lamplight.
  base=Vector((.09,.071,.068)).lerp(Vector((.37,.26,.21)),t)
  if grain>.30:base=base.lerp(Vector((.39,.35,.30)),.37)
  colors.data[li].color=(*base,1)
mat=bpy.data.materials.new('Red granite');mat.use_nodes=True
shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.93
vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='stone_color';mat.node_tree.links.new(vc.outputs['Color'],shader.inputs['Base Color']);bear.data.materials.append(mat)
dark=bpy.data.materials.new('Carved recesses');dark.diffuse_color=(.052,.043,.035,1);dark.use_nodes=True;dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.052,.043,.035,1);dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
details=[]
def recess(name,loc,scale):
 o=ellipsoid(name,loc,scale,True);o.data.materials.append(dark);details.append(o);return o
recess('broad carved nose',(1.355,0,1.13),(.057,.112,.070))
for side in [-1,1]:
 recess('recessed eye',(1.032,side*.225,1.292),(.025,.012,.019))
 # Quiet ear inset and three shallow toe marks, clearly granite sculpture.
 recess('ear hollow',(.84,side*.25,1.46),(.023,.010,.025))
 for y in [-.065,0,.065]:
  recess('paw groove',(.79,side*.30+y,.10),(.011,.010,.022))
bpy.ops.object.select_all(action='DESELECT')
for o in details:o.select_set(True)
bpy.context.view_layer.objects.active=details[0];bpy.ops.object.join();detail=bpy.context.object;detail.name='Bear_carved_recesses'
for o in [bear,detail]:
 o.select_set(True)
 # Flat base for a stable plinth contact.
 if o==bear:
  for v in o.data.vertices:
   if v.co.z+o.location.z<.045:v.co.z=.045-o.location.z
bpy.context.view_layer.objects.active=bear
master=OUT/'bear-landmark-v01.blend';bpy.ops.wm.save_as_mainfile(filepath=str(master))
target=OUT/'bear-landmark-v01.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_extras=True)
triangles=sum(len(o.data.loop_triangles) if len(o.data.loop_triangles) else sum(len(p.vertices)-2 for p in o.data.polygons) for o in [bear,detail])
report={'asset':'prop-karhupuisto-bear-v01','producer':'Blender 5.2 local deterministic sculpt','triangles':triangles,'objects':2,'textures':0,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'concept_approval':'v04 columns 2 and 3','runtime_acceptance':'pending visual check','forward':'X','export_up':'Y','master_private':True}
(OUT/'bear-landmark-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
