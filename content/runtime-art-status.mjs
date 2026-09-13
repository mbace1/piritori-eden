// The owner permits unreviewed 3D environment prototypes in the test slice.
// Preference is not approval; accepting a record must not promote the art.
export function validRuntimeApproval(asset){
  if(['approved','semi-approved'].includes(asset.approval_status))return true;
  return asset.approval_status==='unreviewed-prototype'
    && asset.production_status==='playable-test-only'
    && asset.review_status==='not-owner-approved'
    && asset.layer==='location-stage'
    && ['mesh-3d','texture-3d'].includes(asset.kind);
}

