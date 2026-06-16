// Player shield bubble shader — fresnel rim + animated energy band.

export const SHIELD_VS = `
  varying vec3 vN;
  varying vec3 vP;
  void main(){
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vP = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

export const SHIELD_FS = `
  varying vec3 vN;
  varying vec3 vP;
  uniform float uTime;
  uniform float uStrength;
  void main(){
    vec3 V = normalize(-vP);
    float fres = pow(1.0 - clamp(dot(vN, V), 0.0, 1.0), 2.0);
    float wave = 0.5 + 0.5*sin(vP.y*0.6 - uTime*6.0);
    float band = smoothstep(0.4, 1.0, wave);
    vec3 col = mix(vec3(0.1,0.7,1.0), vec3(1.0,0.3,1.0), band);
    float a = clamp(fres * 1.2 + band * 0.15, 0.0, 1.0) * uStrength;
    gl_FragColor = vec4(col * (fres + 0.3), a);
  }`;
