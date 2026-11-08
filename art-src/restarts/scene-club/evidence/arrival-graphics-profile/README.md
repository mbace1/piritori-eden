# Arrival test: measured graphics-profile correction

8 November 2026. **Test-only change** `a588e188f0bf9362e87712ea30de8b2764760801`.
The opening suite uses `--disable-gpu` and the existing autoplay flag instead
of forcing ANGLE/SwiftShader. Its complete path is DOM and Canvas 2D; the
campaign only constructs a WebGL renderer in battle mode, which this suite
never enters. Dedicated C.19 tests retain their 3D graphics profile.

No application, art, combat, save, sound, timer duration, assertion or deadline
changed. The 9500/6000ms native timers and 12s automatic-dismissal wait remain.

## Evidence and limits

The [exact eeaf CI result](eeaf-ci-as-run.json) is **13/14**, with only arrival
failing; it is not passing verification. Its [desktop trace](eeaf-desktop-auto.json)
contains one modal, one 9500ms timer, a 3387.3ms delivery delay and immediate
removal once delivered. No retry was made on that head.

A private original-source reproduction used the same native journey/reload
history and CPU2× stress. The [native timeline](native-block-summary.json)
locates a 14.837s renderer widget-shutdown task inside
`LayerTreeHost::~LayerTreeHost → ProxyMain::Stop`. Its compositor waits for
raster-command completion in `CommandBufferProxyImpl::WaitForGetOffset`.
All three due callbacks wait until that task ends; the audio and removal
callbacks themselves finish quickly. This establishes the blocked native
teardown in that captured reproduction. The CI worker did not record a native
Chrome trace, so its exact inner call stack is not claimed to be identical.

The [software-profile experiment](software-profile-results.json) changes only
the browser launch arguments. Both fresh-browser CPU2× warm-history cases
remove their modal before the same original 12s cutoff, with actual timer
lags **0.7/0.2ms** and removal at **9501.1/9500.8ms** after registration.
The six runtime/data hashes remain unchanged, context census records only
successful Canvas 2D requests, and browser errors are zero. The
[new native timeline](software-teardown-summary.json) records a maximum widget
shutdown of **1.649ms** and zero command-buffer wait events. These are measured
local results, not a physical GPU/device verdict.

[Full unchanged local opening suite](full-70-local.log): **70/0**. Desktop and
phone both deliver the native timer 0.3ms late and remove before the original
12s cutoff. [Provenance](full-70-local-summary.json) distinguishes the tested
precommit HEAD from the exact changed test bytes and runtime hashes.

Compressed full traces are [baseline](native-block-trace.json.gz) and
[software profile](software-profile-trace.json.gz), with raw/gzip hashes in
[trace-manifest.json](trace-manifest.json). They retain actual native events;
no timeline or screenshot is reconstructed. The full matrix must still run
on the final pushed head. Current CI status belongs to the draft PR.
