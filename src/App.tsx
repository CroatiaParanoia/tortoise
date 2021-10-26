import React, { useCallback } from "react";
import "./App.css";
import { Button, Toast } from "@douyinfe/semi-ui";
import _SparkMd5 from "spark-md5";
import { useWorker } from "@koale/useworker";

const SparkMD5 = _SparkMd5;

const SIZE = 2 * 1024 * 1024;

interface ChunkItem {
  file: Blob;
  name: string;
}

const createFileChunkList = (file: File, size = SIZE): ChunkItem[] => {
  const chunkList: ChunkItem[] = [];

  let curSize = 0;

  while (curSize < file.size) {
    chunkList.push({
      file: file.slice(curSize, curSize + size),
      name: file.name,
    });
    curSize += size;
  }

  return chunkList;
};

const computedMd5 = async (chunkList: ChunkItem[]) => {
  const spark = new SparkMD5.ArrayBuffer();

  const readArrayBuffer = (file: Blob): Promise<ProgressEvent<FileReader>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        resolve(e);
      };

      reader.onerror = reject;
    });
  };

  for (let i = 0; i < chunkList.length; i++) {
    const chunk = chunkList[i];

    const readRes = await readArrayBuffer(chunk.file);

    spark.append(readRes.target?.result as ArrayBuffer);
    if (i < chunkList.length - 1) {
      continue;
    }
    // 最后一个
    return {
      percentage: 100,
      hash: spark.end(),
    };
  }
};

function App() {
  const [computedMd5Worker] = useWorker(computedMd5, {
    remoteDependencies: [
      "https://cdn.jsdelivr.net/npm/spark-md5@3.0.2/spark-md5.min.js",
    ],
  });

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      if (file) {
        const chunkList = createFileChunkList(file);
        const hash = await computedMd5Worker(chunkList);

        console.log(hash, "hash");
      }
    },
    [computedMd5Worker]
  );

  return (
    <div className="App">
      <input type="file" onChange={handleChange} />
      <Button onClick={() => Toast.warning({ content: "welcome" })}>
        Hello Semi
      </Button>
    </div>
  );
}

export default App;
