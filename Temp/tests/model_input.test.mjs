import test from "node:test";
import assert from "node:assert/strict";
import {assertEmbeddedResources} from "../../web/model_input.mjs";
test("模型不允许外部资源, 嵌入资源可在本机加载", () => {
  assert.doesNotThrow(() => assertEmbeddedResources({buffers:[{byteLength:4}],images:[{bufferView:0}]}));
  for (const uri of ["https://example.com/texture.png","../secret","data:image/png;base64,AAA"]) {
    assert.throws(() => assertEmbeddedResources({images:[{uri}]}));
  }
  assert.throws(() => assertEmbeddedResources({buffers:[{uri:"other.bin"}]}));
});
