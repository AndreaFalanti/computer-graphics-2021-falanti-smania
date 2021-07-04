#version 300 es
// Shading space: CAMERA

precision mediump float;

in vec2 fsUV;
in vec3 fsNormal;
in vec3 fsPos;

uniform sampler2D u_texture;

uniform vec3 u_lightType;
uniform vec2 u_specularType;
uniform vec3 u_lightDir;
uniform vec3 u_lightPos;
uniform vec3 u_lightColor;
uniform vec3 u_ambientLightColor;
uniform vec3 u_spotLightDir;
uniform float u_coneIn;
uniform float u_coneOut;
uniform float u_decay;
uniform float u_target;

uniform vec3 u_specularColor;
uniform float u_specularGamma;
uniform bool u_metallic;

out vec4 outColor;

void main() {

  // Parameters required
  vec3 diffColor = vec3(texture(u_texture, fsUV));
  vec3 eyeDir = normalize(-fsPos);
  float cosOut = cos(radians(u_coneOut / 2.0));
  float cosIn = cos(radians(u_coneIn / 2.0));
  vec3 specularColor = (u_metallic) ? diffColor : u_specularColor;

  // Light directions
  vec3 directLightDir = normalize(-u_lightDir);   // By convention, lightDir points TOWARDS the light source
  vec3 pointLightDir = normalize(u_lightPos - fsPos);
  vec3 spotLightDir = normalize(u_lightPos - fsPos);

  vec3 lightDir = directLightDir * u_lightType.x + pointLightDir * u_lightType.y + spotLightDir * u_lightType.z;

  // Light colors
  vec3 directLightColor = u_lightColor;
  vec3 pointLightColor = u_lightColor * pow((u_target / length(u_lightPos - fsPos)), u_decay);
  vec3 spotLightColor = u_lightColor * pow((u_target / length(u_lightPos - fsPos)), u_decay) * 
    clamp((dot(spotLightDir, normalize(-u_spotLightDir - fsPos)) - cosOut) / (cosIn - cosOut), 0.0, 1.0);

  vec3 lightColor = directLightColor * u_lightType.x + pointLightColor * u_lightType.y + spotLightColor * u_lightType.z;

  // BRDF Model
  // Diffuse component -- Lambert
  vec3 diffuseComp = diffColor * clamp(dot(lightDir, fsNormal), 0.0, 1.0);

  // Specular component -- Phong
  vec3 reflectDir = reflect(-lightDir, fsNormal);
  vec3 specularPhong = pow(clamp(dot(eyeDir, reflectDir), 0.0, 1.0), u_specularGamma) * specularColor;

  // Specular component -- Blinn
  vec3 hDir = normalize(lightDir + eyeDir);
  vec3 specularBlinn = pow(clamp(dot(fsNormal, hDir), 0.0, 1.0), u_specularGamma) * specularColor;

  vec3 specularComp = specularPhong * u_specularType.x + specularBlinn * u_specularType.y;

  // Final output color
  outColor = clamp(vec4(lightColor * (diffuseComp + specularComp) + u_ambientLightColor * diffColor, 1.0), 0.0, 1.0);
  //outColor = clamp(vec4(u_lightColor * specComp, 1.0), 0.0, 1.0); // specular debugging
}