Space background system:

Right now the game background is procedural Three.js, not a single image.
The patch adds src/spaceSectors.ts, where each sector defines:
- clear/fog color
- bloom strength
- star light color
- ambient light color
- planet position/radius/colors
- debris count/scale

Every 3 waves the game switches sector:
waves 1-3 -> sector 1
waves 4-6 -> sector 2
waves 7-9 -> sector 3
and so on.

If later you want image backgrounds, put images here and add a skybox loader.
