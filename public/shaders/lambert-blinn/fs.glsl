#version 300 es

precision mediump float;

in vec2 uvFS;
in vec3 normalVec;
in vec3 fsPos;
out vec4 outColor;

uniform sampler2D u_texture;

uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform vec3 u_ambientLightColor;

uniform vec3 u_cameraPos;
uniform vec3 u_specularColor;
uniform float u_specularGamma;
uniform bool u_metallic;

void main() {
  vec3 diffColor = vec3(texture(u_texture, uvFS));
  vec3 eyeDir = normalize(fsPos);
  // L12, p.5: light dir is a unitary vector that by convention points TOWARDS the light source
  vec3 lightDir = normalize(-u_lightDir - fsPos);

  // diffuse
  vec3 diffComp = diffColor * clamp(dot(lightDir, normalVec), 0.0, 1.0);

  // specular
  vec3 specularColor = (u_metallic) ? diffColor : u_specularColor;
  vec3 hDir = normalize(lightDir + eyeDir);
  vec3 specComp = pow(clamp(dot(normalVec, hDir), 0.0, 1.0), u_specularGamma) * specularColor;

  // output color
  outColor = clamp(vec4(u_lightColor * (diffComp + specComp) + u_ambientLightColor * diffColor, 1.0), 0.0, 1.0);
  //outColor = clamp(vec4(u_lightColor * specComp, 1.0), 0.0, 1.0); // specular debugging
}