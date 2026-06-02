The previous space-sector patch was disabled because it caused a black screen in this build.
This fix restores the original procedural background and keeps the game playable.

Next safe approach for backgrounds:
1. Do not dispose/recreate planet/debris during gameplay.
2. Add separate decorative sky sphere or CSS-like overlay colors.
3. Only change shader uniforms after confirming their names in environment.ts/skybox.ts.
