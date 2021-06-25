#version 300 es

in vec3 a_position;
in vec3 a_normal;
out vec3 fsNormal;

uniform mat4 u_wvpMatrix; 
uniform mat4 u_nMatrix;     //matrix to transform normals

void main() {
  fsNormal = mat3(u_nMatrix) * a_normal; 
  gl_Position = u_wvpMatrix * vec4(a_position, 1.0);
}