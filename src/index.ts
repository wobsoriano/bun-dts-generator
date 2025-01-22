import fs from 'node:fs';
import path from 'node:path';
import {
	type CompilationOptions,
	type EntryPointConfig,
	generateDtsBundle,
} from 'dts-bundle-generator';
import { getTsconfig } from 'get-tsconfig';
import commonPathPrefix from 'common-path-prefix';

type Options = Omit<EntryPointConfig, 'filePath'> & {
	compilationOptions?: CompilationOptions;
};

const dts = (options?: Options): import('bun').BunPlugin => {
	return {
		name: 'bun-plugin-dts',
		async setup(build) {
			const { compilationOptions, ...rest } = options || {};

			const entrypoints = [...build.config.entrypoints].sort();
			const entries = entrypoints.map((entry) => {
				return {
					filePath: entry,
					...rest,
				};
			});

			const tsconfig =
				compilationOptions?.preferredConfigPath ?? getTsconfig()?.path;
			const result = generateDtsBundle(entries, {
				...compilationOptions,
				preferredConfigPath: tsconfig,
			});

			const outDir = build.config.outdir || './dist';
			if (!fs.existsSync(outDir)) {
				fs.mkdirSync(outDir, { recursive: true });
			}

			let commonPrefix = commonPathPrefix(entrypoints);

			// If commonPrefix is empty or equals the current working directory,
			// use the parent directory of the first entrypoint
			if (!commonPrefix || commonPrefix === process.cwd()) {
				commonPrefix = path.dirname(entrypoints[0]);
			}

			await Promise.all(
				entrypoints.map((entry, index) => {
					const relativePath = path.relative(commonPrefix, entry);
					const dtsFile = relativePath.replace(/\.[mc]?[jt]sx?$/, '.d.ts');
					const outFile = path.join(outDir, dtsFile);
					const outFileDir = path.dirname(outFile);

					if (!fs.existsSync(outFileDir)) {
						fs.mkdirSync(outFileDir, { recursive: true });
					}

					return Bun.write(outFile, result[index]);
				}),
			);
		},
	};
};

export default dts;
