import dedent from "dedent";

const REPOSITORY = "michaltarasiuk/otel-tui";

const [version, checksumsPath] = process.argv.slice(2);
if (version === undefined || checksumsPath === undefined) {
  console.error("Usage: bun scripts/homebrew-formula.ts <version> <checksums.txt>");
  process.exit(1);
}

const checksums = new Map(
  (await Bun.file(checksumsPath).text())
    .trim()
    .split("\n")
    .map((line) => {
      const [sha256 = "", file = ""] = line.split(/\s+/);
      return [file, sha256];
    }),
);

function archive(platform: string, arch: string) {
  return `otel-tui-${platform}-${arch}.tar.gz`;
}

function url(platform: string, arch: string) {
  return `https://github.com/${REPOSITORY}/releases/download/v${version}/${archive(platform, arch)}`;
}

function sha256(platform: string, arch: string) {
  const checksum = checksums.get(archive(platform, arch));
  if (checksum === undefined) {
    throw new Error(`${checksumsPath} has no checksum for ${archive(platform, arch)}`);
  }
  return checksum;
}

console.log(dedent`
  class OtelTui < Formula
    desc "Terminal app for viewing OpenTelemetry traces, metrics, and logs"
    homepage "https://github.com/${REPOSITORY}"
    version "${version}"
    license "MIT"

    on_macos do
      on_arm do
        url "${url("darwin", "arm64")}"
        sha256 "${sha256("darwin", "arm64")}"
      end
      on_intel do
        url "${url("darwin", "x64")}"
        sha256 "${sha256("darwin", "x64")}"
      end
    end

    on_linux do
      on_arm do
        url "${url("linux", "arm64")}"
        sha256 "${sha256("linux", "arm64")}"
      end
      on_intel do
        url "${url("linux", "x64")}"
        sha256 "${sha256("linux", "x64")}"
      end
    end

    def install
      bin.install "otel-tui"
    end

    test do
      assert_predicate bin/"otel-tui", :executable?
    end
  end
`);
