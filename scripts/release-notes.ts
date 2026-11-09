const REPOSITORY = "michaltarasiuk/otel-tui";

const SECTIONS = [
  { type: "feat", heading: "Features" },
  { type: "fix", heading: "Fixes" },
];

const [tag] = process.argv.slice(2);
if (tag === undefined) {
  console.error("Usage: bun scripts/release-notes.ts <tag>");
  process.exit(1);
}

const previous = (
  await Bun.$`git describe --tags --abbrev=0 ${`${tag}^`}`.nothrow().quiet().text()
).trim();
const range = previous === "" ? tag : `${previous}..${tag}`;
const subjects = (await Bun.$`git log --reverse --format=%s ${range}`.text()).trim().split("\n");

const sections = SECTIONS.flatMap(({ type, heading }) => {
  const prefix = `${type}: `;
  const items = subjects
    .filter((subject) => subject.startsWith(prefix))
    .map((subject) => `- ${subject.slice(prefix.length)}`);
  return items.length === 0 ? [] : [`## ${heading}\n\n${items.join("\n")}`];
});

const changelog =
  previous === ""
    ? []
    : [`**Full Changelog**: https://github.com/${REPOSITORY}/compare/${previous}...${tag}`];

console.log([...sections, ...changelog].join("\n\n"));
