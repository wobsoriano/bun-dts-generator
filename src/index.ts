import { BunPlugin } from "bun";
import path from 'node:path'
import fs from 'node:fs'
import { CompilationOptions, type EntryPointConfig } from "dts-bundle-generator";

type Options = Omit<EntryPointConfig, 'filePath'> & {
  compilationOptions?: CompilationOptions
}

export const dtsGenerator = (options?: Options): BunPlugin => {
  return {
    name: 'bun-dts-generator',
    async setup(build) {
      const { generateDtsBundle } = await import('dts-bundle-generator')
      const { compilationOptions, ...rest }  = options || {}

      const entrypoints = [...build.config.entrypoints].sort()
      const entries = entrypoints.map((entry) => {
        return {
          filePath: entry,
          ...rest
        }
      })
      const result = await generateDtsBundle(entries, compilationOptions)

      const outDir = build.config.outdir || './dist'
      if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir);
      }

      await Promise.all(
        entrypoints.map((entry, index) => {
          const dtsFile = entry.replace(/^.*\//, '').replace(/\.ts$/, '.d.ts')
          const outFile = path.join(outDir, dtsFile)
          return Bun.write(outFile, result[index])
        })
      )
    }
  }
}
