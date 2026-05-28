import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const testFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testFilePath), '..');
const generatorScript = path.join(projectRoot, 'scripts', 'generate-third-party-licenses.cjs');
const checkScript = path.join(projectRoot, 'scripts', 'check-third-party-licenses.cjs');
const temporaryDirectories: string[] = [];
const servers: Server[] = [];

function createTemporaryProject(packageName = 'demo-package', version = '1.0.0') {
  const directory = mkdtempSync(path.join(tmpdir(), 'gremia-license-test-'));
  temporaryDirectories.push(directory);
  mkdirSync(path.join(directory, 'node_modules', ...packageName.split('/')), { recursive: true });
  writeFileSync(
    path.join(directory, 'package-lock.json'),
    JSON.stringify(
      {
        name: 'license-test-project',
        lockfileVersion: 3,
        packages: {
          '': {
            dependencies: {
              [packageName]: version,
            },
          },
          [path.posix.join('node_modules', ...packageName.split('/'))]: {
            name: packageName,
            version,
          },
        },
      },
      null,
      2,
    ),
  );
  return directory;
}

function createTarEntry(name: string, content: string) {
  const contentBuffer = Buffer.from(content, 'utf8');
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, 'utf8');
  header.write('0000644\0', 100, 'ascii');
  header.write('0000000\0', 108, 'ascii');
  header.write('0000000\0', 116, 'ascii');
  header.write(contentBuffer.length.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
  header.write('00000000000\0', 136, 'ascii');
  header.fill(' ', 148, 156);
  header.write('0', 156, 'ascii');
  header.write('ustar\0', 257, 'ascii');
  header.write('00', 263, 'ascii');
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');
  const padding = Buffer.alloc((512 - (contentBuffer.length % 512)) % 512, 0);
  return Buffer.concat([header, contentBuffer, padding]);
}

function createPackageTarball(packageName = 'demo-package', version = '1.0.0') {
  const packageJson = JSON.stringify(
    {
      name: packageName,
      version,
      license: 'MIT OR GPL-3.0-or-later',
      repository: { url: 'git+https://example.invalid/demo-package.git' },
    },
    null,
    2,
  );
  const licenseText = [
    'MIT License',
    '',
    'Copyright (c) 2026 Demo Maintainers',
    '',
    'Permission is hereby granted, free of charge, to any person obtaining a copy',
    'of this software and associated documentation files (the "Software"), to deal',
    'in the Software without restriction.',
  ].join('\n');
  const noticeText = 'Copyright (c) 2026 Demo Maintainers\nAll notices stay with the package.';
  const tar = Buffer.concat([
    createTarEntry('package/package.json', packageJson),
    createTarEntry('package/LICENSE', licenseText),
    createTarEntry('package/NOTICE', noticeText),
    Buffer.alloc(1024, 0),
  ]);
  return zlib.gzipSync(tar);
}

async function startRegistry(tarball: Buffer, packageName = 'demo-package', version = '1.0.0', options: { directVersionEndpoint?: boolean } = {}) {
  const encodedPackageName = encodeURIComponent(packageName);
  const tarballPath = `/${encodedPackageName}/-/${packageName.replace(/^@/, '').replace('/', '-')}-${version}.tgz`;
  const expectedMetadataPath = `/${encodedPackageName}/${encodeURIComponent(version)}`;
  const packageMetadataPath = `/${encodedPackageName}`;
  const versionMetadata = () => ({
    name: packageName,
    version,
    license: 'MIT OR GPL-3.0-or-later',
    dist: {
      tarball: `http://127.0.0.1:${(server.address() as { port: number }).port}${tarballPath}`,
    },
  });
  const server = createServer((request, response) => {
    if (request.url === expectedMetadataPath && options.directVersionEndpoint !== false) {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(versionMetadata()));
      return;
    }
    if (request.url === packageMetadataPath) {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ name: packageName, versions: { [version]: versionMetadata() } }));
      return;
    }
    if (request.url === tarballPath) {
      response.setHeader('Content-Type', 'application/octet-stream');
      response.end(tarball);
      return;
    }
    response.statusCode = 404;
    response.end('not found');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('Third-party license generation', () => {
  it('lädt Lizenz, Lizenztext und Copyright-Hinweise online für die konkrete Lockfile-Version', async () => {
    const workspace = createTemporaryProject();
    const registryUrl = await startRegistry(createPackageTarball());

    execFileSync(process.execPath, [generatorScript], {
      cwd: workspace,
      env: { ...process.env, NPM_REGISTRY_URL: registryUrl },
      stdio: 'pipe',
    });

    const inventory = readFileSync(path.join(workspace, 'THIRD_PARTY_LICENSES.txt'), 'utf8');
    const notices = readFileSync(path.join(workspace, 'THIRD_PARTY_NOTICES.txt'), 'utf8');
    const licenseText = readFileSync(path.join(workspace, 'LICENSES', 'MIT.txt'), 'utf8');

    expect(inventory).toContain('- demo-package@1.0.0');
    expect(inventory).toContain('License: MIT OR GPL-3.0-or-later');
    expect(inventory).toContain('Selected license for OR expression: MIT');
    expect(inventory).toContain('License text: LICENSES/MIT.txt');
    expect(licenseText).toContain('License file: MIT');
    expect(licenseText).toContain('MIT License');
    expect(licenseText).toContain('Permission is hereby granted');
    expect(licenseText).not.toContain('Copyright (c) 2026 Demo Maintainers');
    expect(notices).toContain('Copyright (c) 2026 Demo Maintainers');
    expect(notices).toContain('License text: LICENSES/MIT.txt');
  });



  it('liest scoped npm-Pakete über das Paketdokument, wenn der Versionsendpunkt nicht verfügbar ist', async () => {
    const workspace = createTemporaryProject('@demo/scoped-package', '1.2.3');
    const registryUrl = await startRegistry(
      createPackageTarball('@demo/scoped-package', '1.2.3'),
      '@demo/scoped-package',
      '1.2.3',
      { directVersionEndpoint: false },
    );

    execFileSync(process.execPath, [generatorScript], {
      cwd: workspace,
      env: { ...process.env, NPM_REGISTRY_URL: registryUrl },
      stdio: 'pipe',
    });

    const inventory = readFileSync(path.join(workspace, 'THIRD_PARTY_LICENSES.txt'), 'utf8');
    const licenseText = readFileSync(path.join(workspace, 'LICENSES', 'MIT.txt'), 'utf8');

    expect(inventory).toContain('- @demo/scoped-package@1.2.3');
    expect(inventory).toContain('License text: LICENSES/MIT.txt');
    expect(licenseText).toContain('MIT License');
  });


  it('legt verwendete Lizenztexte nur einmalig unter LICENSES ab und referenziert sie mehrfach', async () => {
    const workspace = createTemporaryProject('first-package', '1.0.0');
    writeFileSync(
      path.join(workspace, 'package-lock.json'),
      JSON.stringify(
        {
          name: 'license-test-project',
          lockfileVersion: 3,
          packages: {
            '': { dependencies: { 'first-package': '1.0.0', 'second-package': '2.0.0' } },
            'node_modules/first-package': { name: 'first-package', version: '1.0.0' },
            'node_modules/second-package': { name: 'second-package', version: '2.0.0' },
          },
        },
        null,
        2,
      ),
    );
    const firstTarball = createPackageTarball('first-package', '1.0.0');
    const secondTarball = createPackageTarball('second-package', '2.0.0');
    const server = createServer((request, response) => {
      const url = request.url || '';
      if (url === '/first-package/1.0.0' || url === '/first-package') {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({
          name: 'first-package',
          version: '1.0.0',
          license: 'MIT',
          versions: { '1.0.0': { name: 'first-package', version: '1.0.0', license: 'MIT', dist: { tarball: `http://127.0.0.1:${(server.address() as { port: number }).port}/first.tgz` } } },
          dist: { tarball: `http://127.0.0.1:${(server.address() as { port: number }).port}/first.tgz` },
        }));
        return;
      }
      if (url === '/second-package/2.0.0' || url === '/second-package') {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({
          name: 'second-package',
          version: '2.0.0',
          license: 'MIT',
          versions: { '2.0.0': { name: 'second-package', version: '2.0.0', license: 'MIT', dist: { tarball: `http://127.0.0.1:${(server.address() as { port: number }).port}/second.tgz` } } },
          dist: { tarball: `http://127.0.0.1:${(server.address() as { port: number }).port}/second.tgz` },
        }));
        return;
      }
      if (url === '/first.tgz') {
        response.end(firstTarball);
        return;
      }
      if (url === '/second.tgz') {
        response.end(secondTarball);
        return;
      }
      response.statusCode = 404;
      response.end('not found');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    servers.push(server);
    const registryUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

    execFileSync(process.execPath, [generatorScript], {
      cwd: workspace,
      env: { ...process.env, NPM_REGISTRY_URL: registryUrl },
      stdio: 'pipe',
    });

    const inventory = readFileSync(path.join(workspace, 'THIRD_PARTY_LICENSES.txt'), 'utf8');
    expect(inventory.match(/License text: LICENSES\/MIT\.txt/gu)?.length).toBe(2);
    expect(existsSync(path.join(workspace, 'LICENSES', 'MIT.txt'))).toBe(true);
    expect(existsSync(path.join(workspace, 'LICENSES', 'first-package@1.0.0'))).toBe(false);
    expect(existsSync(path.join(workspace, 'LICENSES', 'second-package@2.0.0'))).toBe(false);
  });

  it('ermittelt Paketnamen aus verschachtelten package-lock-Pfaden über das letzte node_modules-Segment', async () => {
    const workspace = createTemporaryProject('helper-compilation-targets', '6.3.1');
    writeFileSync(
      path.join(workspace, 'package-lock.json'),
      JSON.stringify(
        {
          name: 'license-test-project',
          lockfileVersion: 3,
          packages: {
            '': { dependencies: { '@babel/core': '7.0.0' } },
            'node_modules/@babel/core/node_modules/helper-compilation-targets': { version: '6.3.1' },
          },
        },
        null,
        2,
      ),
    );
    const registryUrl = await startRegistry(
      createPackageTarball('helper-compilation-targets', '6.3.1'),
      'helper-compilation-targets',
      '6.3.1',
    );

    execFileSync(process.execPath, [generatorScript], {
      cwd: workspace,
      env: { ...process.env, NPM_REGISTRY_URL: registryUrl },
      stdio: 'pipe',
    });

    const inventory = readFileSync(path.join(workspace, 'THIRD_PARTY_LICENSES.txt'), 'utf8');

    expect(inventory).toContain('- helper-compilation-targets@6.3.1');
    expect(inventory).not.toContain('- @babel/core@6.3.1');
  });

  it('bricht kontrolliert ab, wenn online keine Lizenzdaten zur eingesetzten Version verfügbar sind', async () => {
    const workspace = createTemporaryProject();
    const registryUrl = await startRegistry(createPackageTarball());
    writeFileSync(
      path.join(workspace, 'package-lock.json'),
      JSON.stringify(
        {
          name: 'license-test-project',
          lockfileVersion: 3,
          packages: {
            '': { dependencies: { missing: '9.9.9' } },
            'node_modules/missing': { version: '9.9.9' },
          },
        },
        null,
        2,
      ),
    );

    expect(() =>
      execFileSync(process.execPath, [generatorScript], {
        cwd: workspace,
        env: { ...process.env, NPM_REGISTRY_URL: registryUrl },
        stdio: 'pipe',
      }),
    ).toThrowError();
  });

  it('validiert erzeugte Lizenztexte und Notices als Release-Artefaktvertrag', async () => {
    const workspace = createTemporaryProject();
    const registryUrl = await startRegistry(createPackageTarball());
    execFileSync(process.execPath, [generatorScript], {
      cwd: workspace,
      env: { ...process.env, NPM_REGISTRY_URL: registryUrl },
      stdio: 'pipe',
    });

    execFileSync(process.execPath, [checkScript], { cwd: workspace, stdio: 'pipe' });

    rmSync(path.join(workspace, 'LICENSES', 'MIT.txt'));
    expect(existsSync(path.join(workspace, 'LICENSES', 'MIT.txt'))).toBe(false);
    expect(() => execFileSync(process.execPath, [checkScript], { cwd: workspace, stdio: 'pipe' })).toThrowError();
  });
});
