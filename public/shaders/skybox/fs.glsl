#version 300 es

precision mediump float;

in vec3 sample_dir;
 
uniform samplerCube u_texture;
uniform mat4 inverseViewProjMatrix;

out vec4 outColor;
 
void main() {
    vec4 p = inverseViewProjMatrix * vec4(sample_dir, 1.0);
    
    vec4 rgba = texture(u_texture, normalize(p.xyz / p.w));
    
    outColor = vec4(rgba.rgb, 1.0);
}