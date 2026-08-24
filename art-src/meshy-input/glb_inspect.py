import json, struct, sys, os, io
def read_glb(p):
    with open(p,'rb') as f: data=f.read()
    magic,ver,length = struct.unpack_from('<III',data,0)
    assert magic==0x46546C67, "not a glb"
    off=12; js=None; bin_=None
    while off < length:
        clen,ctype = struct.unpack_from('<II',data,off); off+=8
        chunk=data[off:off+clen]; off+=clen
        if ctype==0x4E4F534A: js=json.loads(chunk.decode('utf-8'))
        elif ctype==0x004E4942: bin_=chunk
    return js,bin_
def stats(p):
    js,bin_=read_glb(p)
    tris=0; verts=0
    acc=js.get('accessors',[])
    for m in js.get('meshes',[]):
        for pr in m.get('primitives',[]):
            if 'indices' in pr: tris+=acc[pr['indices']]['count']//3
            pos=pr.get('attributes',{}).get('POSITION')
            if pos is not None: verts+=acc[pos]['count']
    imgs=[]
    for i,im in enumerate(js.get('images',[])):
        if 'bufferView' in im:
            bv=js['bufferViews'][im['bufferView']]
            b=bin_[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
            imgs.append((im.get('mimeType','?'),len(b),b))
    return dict(tris=tris,verts=verts,mats=len(js.get('materials',[])),
                imgs=imgs, anims=len(js.get('animations',[])),
                skins=len(js.get('skins',[])), nodes=len(js.get('nodes',[])))
if __name__=='__main__':
    print(f"{'model':28}{'tris':>8}{'verts':>8}{'mat':>4}{'img':>4}{'anim':>5}{'skin':>5}  texsize")
    for p in sys.argv[1:]:
        try:
            s=stats(p)
            tex=''
            if s['imgs']:
                from PIL import Image
                im=Image.open(io.BytesIO(s['imgs'][0][2]))
                tex=f"{im.size[0]}x{im.size[1]}"
            print(f"{os.path.basename(p):28}{s['tris']:8}{s['verts']:8}{s['mats']:4}{len(s['imgs']):4}{s['anims']:5}{s['skins']:5}  {tex}")
        except Exception as e:
            print(f"{os.path.basename(p):28}  ERROR {e}")
