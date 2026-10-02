export function assertEmbeddedResources(document) {
  for (const resource of [...(document.buffers ?? []),...(document.images ?? [])]) {
    if (resource.uri !== undefined) throw new Error("请使用贴图和缓冲数据均已嵌入的单文件VRM模型.");
  }
}
