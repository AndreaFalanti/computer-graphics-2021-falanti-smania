#version 300 es
// Shading space: CAMERA

in vec3 a_position;
in vec2 a_uv;
in vec3 a_normal;

out vec2 fsUV;
out vec3 fsNormal;
out vec3 fsPos;

uniform mat4 u_wvMatrix;
uniform mat4 u_wvpMatrix; 
uniform mat4 u_nMatrix;

void main() {
  fsUV = a_uv;
  fsNormal = normalize(mat3(u_nMatrix) * a_normal);
  fsPos = (u_wvMatrix * vec4(a_position, 1.0)).xyz;

  gl_Position = u_wvpMatrix * vec4(a_position, 1.0);
}