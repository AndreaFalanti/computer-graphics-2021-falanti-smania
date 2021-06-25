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

void main() {
  vec3 diffColor = vec3(texture(u_texture, uvFS));
  vec3 eyedirVec = normalize(u_cameraPos - fsPos);
  vec3 lightDir = normalize(u_lightDir);

  // diffuse
  vec3 fd = diffColor * clamp(dot(lightDir, normalVec), 0.0, 1.0);
  // specular
  vec3 reflectDir = -reflect(lightDir, normalVec);
  vec3 fs = u_specularColor * pow(clamp(dot(eyedirVec, reflectDir), 0.0, 1.0), u_specularGamma);

  outColor = clamp(vec4(u_lightColor * (fd + fs) + u_ambientLightColor * diffColor, 1.0), 0.0, 1.0);
  //outColor = clamp(vec4(u_lightColor * fs, 1.0), 0.0, 1.0);
}