// Nebula skybox shader — fbm noise over a view-direction sphere.

export const NEBULA_FS = `
  varying vec3 vDir;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  float hash(vec3 p){
    p = fract(p*0.3183099+.1);
    p *= 17.0;
    return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
  }
  float noise(vec3 x){
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){
    float v = 0.0; float a = 0.5;
    for(int i = 0; i < 5; i++){
      v += a * noise(p);
      p *= 2.1; a *= 0.5;
    }
    return v;
  }

  void main(){
    vec3 d = normalize(vDir);
    float n1 = fbm(d * 2.5 + vec3(0.0, uTime*0.005, 0.0));
    float n2 = fbm(d * 5.0 + vec3(10.0));
    float n3 = fbm(d * 9.0 + vec3(-5.0));

    vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.7, n1));
    col = mix(col, uColorC, smoothstep(0.35, 0.75, n2) * 0.6);
    col *= 0.55 + 0.55 * n1;
    col += pow(n3, 4.0) * vec3(0.9, 0.7, 1.0) * 0.3;

    col = mix(vec3(0.01, 0.005, 0.02), col, 0.75);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const NEBULA_VS = `
  varying vec3 vDir;
  void main(){
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w;
  }
`;
