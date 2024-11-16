// The MIT License (MIT)
//
// Copyright (c) 2012-2013 Mikola Lysenko
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import { Q_rsqrt } from "../utils/functions";

/**
 * SurfaceNets in JavaScript
 *
 * Written by Mikola Lysenko (C) 2012
 *
 * MIT License
 *
 * Based on: S.F. Gibson, "Constrained Elastic Surface Nets". (1998) MERL Tech Report.
 */

export class SurfaceNets {
  private cube_edges: Int32Array;
  private edge_table: Int32Array;
  // todo make this static and everything a factory
  constructor() {
    this.cube_edges = new Int32Array(24); //all 24 pairs of cells in 2x2x2 grid, 1 pair = 1 edge
    this.edge_table = new Int32Array(256); //all permutations of 8 bit mask if there is an edge or not, to quickly look up which edges to compare

    var k = 0;
    for (var i = 0; i < 8; ++i) {
      // iterate cell i in 2x2x2 grid
      for (var j = 1; j <= 4; j <<= 1) {
        // iterate j, bit shift from 1,2,4
        var p = i ^ j; // position p of cell to compare to
        if (i <= p) {
          // only add to edges if the comparison cell index p is greater than the original cell index i
          // increment k only when it's a valid pair to add, adding each pair of cells at a time
          this.cube_edges[k++] = i;
          this.cube_edges[k++] = p;
        }
      }
    }

    //Initialize the intersection table.
    //  This is a 2^(cube configuration) ->  2^(edge configuration) map
    //  There is one entry for each possible cube configuration, and the output is a 12-bit vector enumerating all edges crossing the 0-level.
    for (var i = 0; i < 256; ++i) {
      //256 total permutations of 2x2x2 (8 bit) grid mask
      var em = 0; // edge map
      for (var j = 0; j < 24; j += 2) {
        //12 comparisons of 24 total cells to compare, j jumps 2 each time
        // look up origina cell index j and comparison cell index j+1
        // find boolean if there is a 1 in i of the intersection table for each cell in the pair
        var a = !!(i & (1 << this.cube_edges[j])),
          b = !!(i & (1 << this.cube_edges[j + 1]));
        // if a and b are different, there is a crossing, store a 1 in pair position j in the edge map, otherwise 0
        em |= a !== b ? 1 << (j >> 1) : 0;
      }
      this.edge_table[i] = em;
    }
  }

  generateFaceNormal = (
    v0: [number, number, number],
    v1: [number, number, number],
    v2: [number, number, number]
  ): [number, number, number] => {
    const [e0x, e0y, e0z] = [v0[0] - v1[0], v0[1] - v1[1], v0[2] - v1[2]];

    // Set edge2 as C - A
    const [e1x, e1y, e1z] = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    const [nX, nY, nZ] = [
      e0y * e1z - e0z * e1y,
      e0z * e1x - e0x * e1z,
      e0x * e1y - e0y * e1x,
    ];

    const l = Q_rsqrt(nX * nX + nY * nY + nZ * nZ);

    return [nX * l, nY * l, nZ * l];
  };

  accumulateVertexNormal = (normal_accu, i, n) => {
    normal_accu[i][0] += n[0];
    normal_accu[i][1] += n[1];
    normal_accu[i][2] += n[2];
  };

  createSurface(data, dims, materials, materialRange) {
    let buffer = new Int32Array(4096); // vertex buffer, which vertex is where
    var vertices: [number, number, number][] = [], // vertex values
      indicies: number[] = [], // material index, which index to sample material from
      faces: [number, number, number][] = [], // face buffer, which vertices to generate faces from
      normals: [number, number, number][] = [], // normals
      normal_accum: [number, number, number][] = [], // normals
      n = 0, // current index in flat 1D grid array
      x = new Int32Array(3), // current x,y,z coord in 3D grid array
      R = new Int32Array([1, dims[0] + 1, (dims[0] + 1) * (dims[1] + 1)]), // x,y,z offsets for each grid array dimension, e.g. step 1 in x, step size X+1 in y, step size X+1 * size Y*1 in z
      grid = new Float32Array(8), // local grid values in a 2x2x2 grid, one contains the current coord
      buf_no = 1; // even or odd alternation

    //Resize buffer if necessary
    //ensure it's big enough to store all vertices indexes
    //unsure why it's 2*X*Y sizes
    if (R[2] * 2 > buffer.length) {
      buffer = new Int32Array(R[2] * 2);
    }

    //March over the voxel grid
    for (
      x[2] = 0;
      x[2] < dims[2] - 1;
      ++x[2], n += dims[0], buf_no ^= 1, R[2] = -R[2]
    ) {
      // increment z grid coord
      // increment n grid index
      // so we reference the alternate corner the buf_no and R offset flip for z axis

      //m is the pointer into the buffer we are going to use.
      //This is slightly obtuse because javascript does not have good support for packed data structures, so we must use typed arrays :(
      //The contents of the buffer will be the indices of the vertices on the previous x/y slice of the volume
      var m = 1 + (dims[0] + 1) * (1 + buf_no * (dims[1] + 1));

      for (x[1] = 0; x[1] < dims[1] - 1; ++x[1], ++n, m += 2)
        // increment y grid coord
        // increment n grid index
        // increment m buffer pointer by 2

        for (x[0] = 0; x[0] < dims[0] - 1; ++x[0], ++n, ++m) {
          // increment x grid coord
          // increment n grid index
          // increment m buffer pointer

          //Read in 8 field values around this vertex and store them in an array
          //Also calculate 8-bit mask, like in marching cubes, so we can speed up sign checks later
          // k,j,i = 0 references current grid cell
          // k steps 1 in z, j 1 in y, i 1 in x
          var mask = 0, // mask to check if sign is smaller than 0 or not for each cell
            g = 0, // mask position
            idx = n, // flat 1d grid array index of neighbouring cell
            p_max = -Infinity, // max cell value
            idx_max = n; // cell index with max value (to calc what material to assign the vertex if there's a crossing)
          for (var k = 0; k < 2; ++k, idx += dims[0] * (dims[1] - 2))
            for (var j = 0; j < 2; ++j, idx += dims[0] - 2)
              for (var i = 0; i < 2; ++i, ++g, ++idx) {
                var q = materials[idx]; // get material ID
                var p = data[idx] // get cell value from master grid if material Id in range
                if(p > 0 && (q < materialRange[0] || q > materialRange[1])) p = -0.00001; // get cell value from master grid if material Id in range
                grid[g] = p; // store cell value in local grid
                mask |= p < 0 ? 1 << g : 0; // if cell value is less than 0 store a 1 in the mask for its position (g) in the grid, otherwise store 0
                // store max cell value to assign the correct material from the grid to the vertex later on
                // this avoids vertices getting material ids from air cells
                if (p > p_max) {
                  p_max = p;
                  idx_max = idx;
                }
              }

          //Check for early termination if cell does not intersect boundary
          // if the mask is all 0 or all 1 then there's no intersection here, move on
          if (mask === 0 || mask === 0xff) {
            continue;
          }

          //Sum up edge intersections
          var edge_mask = this.edge_table[mask],
            v: [number, number, number] = [0.0, 0.0, 0.0],
            e_count = 0;

          //For every edge of the cube...
          // there are 12 possible edges because there are 12 possible pairs of neighbouring cells in the 2x2x2 grid
          for (var i = 0; i < 12; ++i) {
            //Use edge mask to check if it is crossed
            // look up edge position i in the edge mask, if it's 1
            if (!(edge_mask & (1 << i))) {
              continue;
            }

            //If it did, increment number of edge crossings
            ++e_count;

            //Now find the point of intersection
            var e0 = this.cube_edges[i << 1], //Unpack vertices
              e1 = this.cube_edges[(i << 1) + 1],
              g0 = grid[e0], //Unpack grid values
              g1 = grid[e1],
              t = g0 - g1; //Compute point of intersection
            if (Math.abs(t) > 1e-6) {
              t = g0 / t;
            } else {
              continue;
            }

            //Interpolate vertices and add up intersections (this can be done without multiplying)
            for (var j = 0, k = 1; j < 3; ++j, k <<= 1) {
              var a = e0 & k,
                b = e1 & k;
              if (a !== b) {
                v[j] += a ? 1.0 - t : t;
              } else {
                v[j] += a ? 1.0 : 0;
              }
            }
          }

          //Now we just average the edge intersections and add them to coordinate
          var s = 1.0 / e_count;
          for (var i = 0; i < 3; ++i) {
            v[i] = x[i] + s * v[i];
          }

          //Add vertex to buffer, store pointer to vertex index in buffer
          buffer[m] = vertices.length;
          vertices.push(v);
          normal_accum.push([0, 0, 0]);
          indicies.push(idx_max);

          //Z-fighting fix for chunks, ignore faces on outermost grid cells that will be rendered by adjacent chunk
          // if ((x[0] === 0 || x[1] === 0 || x[2] === 0) && i < 6) {
          //   continue;
          // }

          var ignore_face = ((x[0] === 0 || x[1] === 0 || x[2] === 0) && i < 6);
          // var ignore_face = false;
          //Now we need to add faces together, to do this we just loop over 3 basis components
          for (var i = 0; i < 3; ++i) {
            //The first three entries of the edge_mask count the crossings along the edge
            if (!(edge_mask & (1 << i))) {
              continue;
            }

            // i = axes we are point along.  iu, iv = orthogonal axes
            var iu = (i + 1) % 3,
              iv = (i + 2) % 3;

            //If we are on a boundary, skip it
            if (x[iu] === 0 || x[iv] === 0) {
              continue;
              // ignore_face = true
            }

            //Otherwise, look up adjacent edges in buffer
            var du = R[iu],
              dv = R[iv];

            //Remember to flip orientation depending on the sign of the corner.
            // TODO calc normal accumulator here
            if (mask & 1) {
              
              const norm = this.generateFaceNormal(
                vertices[buffer[m - du]],
                vertices[buffer[m]],
                vertices[buffer[m - du - dv]]
              );
              const norm2 = this.generateFaceNormal(
                vertices[buffer[m - dv]],
                vertices[buffer[m - du - dv]],
                vertices[buffer[m]]
              );

              if (!ignore_face) {
                // faces.push([buffer[m], buffer[m-du], buffer[m-du-dv], buffer[m-dv]]);
                faces.push([buffer[m - du], buffer[m], buffer[m - du - dv]]); //1 0 2
                faces.push([buffer[m - dv], buffer[m - du - dv], buffer[m]]); //3 2 0
                normals.push(norm);
                normals.push(norm2);
              }

              this.accumulateVertexNormal(normal_accum, buffer[m - du], norm);
              this.accumulateVertexNormal(normal_accum, buffer[m], norm);
              this.accumulateVertexNormal(
                normal_accum,
                buffer[m - du - dv],
                norm
              );

              this.accumulateVertexNormal(normal_accum, buffer[m - dv], norm2);
              this.accumulateVertexNormal(
                normal_accum,
                buffer[m - du - dv],
                norm2
              );
              this.accumulateVertexNormal(normal_accum, buffer[m], norm2);
            } else {
              const norm = this.generateFaceNormal(
                vertices[buffer[m - dv]],
                vertices[buffer[m]],
                vertices[buffer[m - du - dv]]
              );
              const norm2 = this.generateFaceNormal(
                vertices[buffer[m - du]],
                vertices[buffer[m - du - dv]],
                vertices[buffer[m]]
              );
              if (!ignore_face) {
                // faces.push([buffer[m], buffer[m-dv], buffer[m-du-dv], buffer[m-du]]);
                faces.push([buffer[m - dv], buffer[m], buffer[m - du - dv]]); //1 0 2
                faces.push([buffer[m - du], buffer[m - du - dv], buffer[m]]); //3 2 0
                normals.push(norm);
                normals.push(norm2);
              }

              this.accumulateVertexNormal(normal_accum, buffer[m - dv], norm);
              this.accumulateVertexNormal(normal_accum, buffer[m], norm);
              this.accumulateVertexNormal(
                normal_accum,
                buffer[m - du - dv],
                norm
              );

              this.accumulateVertexNormal(normal_accum, buffer[m - du], norm2);
              this.accumulateVertexNormal(
                normal_accum,
                buffer[m - du - dv],
                norm2
              );
              this.accumulateVertexNormal(normal_accum, buffer[m], norm2);
            }
          }
        }
    }

    //All done!  Return the result
    return { vertices, faces, indicies, normals, normal_accum };
  }
}
