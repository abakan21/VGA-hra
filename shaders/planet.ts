// Planet surface shader — banded fbm noise with simple diffuse + rim lighting.

export const PLANET_FS = `
  varying vec3 vN;
  varying vec3 vP;
  uniform float uTime;
  uniform vec3 uLightDir;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.2; a*=0.5;} return v; }

  void main(){
    vec3 n = normalize(vN);
    float bands = fbm(n * 3.0 + vec3(uTime*0.02, 0.0, 0.0));
    float swirls = fbm(n * 6.0);
    float m = bands * 0.6 + swirls * 0.4;
    vec3 base = mix(uColorA, uColorB, smoothstep(0.3, 0.7, m));
    float diff = clamp(dot(n, normalize(-uLightDir)), 0.0, 1.0);
    vec3 lit = base * (0.25 + 0.9 * diff);
    float rim = pow(1.0 - clamp(dot(n, vec3(0,0,1)), 0.0, 1.0), 3.0);
    lit += rim * vec3(0.6, 0.4, 0.9) * 0.35;
    gl_FragColor = vec4(lit, 1.0);
  }
`;

export const PLANET_VS = `
  varying vec3 vN;
  varying vec3 vP;
  void main(){
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vP = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
