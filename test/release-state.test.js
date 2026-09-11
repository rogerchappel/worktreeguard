import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const changelog = read('CHANGELOG.md');
const pkg = JSON.parse(read('package.json'));

function versionSections(text) {
  const sections = [];
  const pattern = /^## \[(\d+\.\d+\.\d+)\](?:\s*-\s*(.+?))?\s*$/gm;
  for (const match of text.matchAll(pattern)) {
    sections.push({ version: match[1], shipDate: match[2] ? match[2].trim() : null });
  }
  return sections;
}

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function listReleaseTags() {
  try {
    return git(['tag', '--list', 'v[0-9]*.[0-9]*.[0-9]*']).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const releaseTags = listReleaseTags();

function hasReleaseTag(version) {
  return releaseTags.includes(`v${version}`);
}

// A shallow CI checkout without fetched tags cannot prove that a tag is
// missing; GitHub only fetches tags that point at the checked-out commit.
// With full history (fetch-depth: 0) or a normal clone the guard is strict.
const isShallow = git(['rev-parse', '--is-shallow-repository']) === 'true';
const inconclusive =
  releaseTags.length === 0 && isShallow
    ? 'shallow checkout without release tags cannot verify tag existence'
    : false;

const sections = versionSections(changelog);

test('changelog advertises exactly one Unreleased section', () => {
  const unreleased = [...changelog.matchAll(/^## \[Unreleased\]/gm)];
  assert.equal(unreleased.length, 1, 'expected exactly one "## [Unreleased]" heading');
});

test('top changelog section is not an untagged release the package advertises', { skip: inconclusive }, () => {
  assert.ok(sections.length > 0, 'CHANGELOG.md must contain at least one versioned section');
  const top = sections[0];
  const drift = top.version === pkg.version && !hasReleaseTag(top.version);
  assert.ok(
    !drift,
    `release-state drift: CHANGELOG.md top section is [${top.version}] ` +
      `but tag v${top.version} does not exist while package.json advertises ${pkg.version}. ` +
      'Either push the release tag so the Release workflow ships it, or move the ' +
      'section under Unreleased until the release is published.',
  );
});

test('no dated changelog section claims a release that was never tagged', { skip: inconclusive }, () => {
  for (const section of sections.filter((item) => item.shipDate)) {
    assert.ok(
      hasReleaseTag(section.version),
      `CHANGELOG.md declares [${section.version}] - ${section.shipDate} as shipped, ` +
        `but tag v${section.version} does not exist`,
    );
  }
});

test('release links never point at tags that do not exist', { skip: inconclusive }, () => {
  for (const line of changelog.split('\n')) {
    const compare = line.match(/\/compare\/([^/\s.)]+)\.\.\.([^/\s.)]+)/);
    if (compare) {
      for (const ref of compare.slice(1)) {
        if (ref === 'HEAD' || !/^v\d/.test(ref)) continue;
        assert.ok(
          releaseTags.includes(ref),
          `CHANGELOG.md compare link references ${ref}, which is not an existing tag`,
        );
      }
      continue;
    }
    const tagLink = line.match(/\/releases\/tag\/(v[^/\s)]+)/);
    if (tagLink) {
      assert.ok(
        releaseTags.includes(tagLink[1]),
        `CHANGELOG.md release link points at ${tagLink[1]}, which is not an existing tag`,
      );
    }
  }
});
