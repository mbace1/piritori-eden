import assert from 'node:assert/strict';
import {validRuntimeApproval} from '../../content/runtime-art-status.mjs';
const prototype={approval_status:'unreviewed-prototype',production_status:'playable-test-only',review_status:'not-owner-approved',layer:'location-stage',kind:'mesh-3d'};
assert.equal(validRuntimeApproval(prototype),true);
assert.equal(validRuntimeApproval({...prototype,production_status:'production-ready'}),false);
assert.equal(validRuntimeApproval({...prototype,review_status:'approved'}),false);
assert.equal(validRuntimeApproval({...prototype,kind:'sprite'}),false);
assert.equal(validRuntimeApproval({...prototype,layer:'unit-3d'}),false);
assert.equal(validRuntimeApproval({...prototype,approval_status:'direction-approved'}),false);
assert.equal(validRuntimeApproval({approval_status:'semi-approved'}),true);
console.log('PASS: unreviewed environment prototypes cannot silently become approved or production-ready');

