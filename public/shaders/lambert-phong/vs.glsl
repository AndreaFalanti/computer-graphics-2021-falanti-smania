#version 300 es

in vec3 a_position;
in vec2 a_uv;
in vec3 a_normal;

out vec2 uvFS;
out vec3 normalVec;
out vec3 fsPos;

uniform mat4 u_wMatrix;
uniform mat4 u_wvpMatrix; 
uniform mat4 u_nMatrix;

void main() {
  uvFS = a_uv;
  normalVec = normalize(mat3(u_nMatrix) * a_normal);
  fsPos = vec3(u_wMatrix * vec4(a_position,1.0));

  gl_Position = u_wvpMatrix * vec4(a_position,1.0);
}