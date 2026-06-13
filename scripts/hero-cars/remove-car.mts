import {
  activeRotation,
  assertSafeKey,
  exitWithError,
  getFlag,
  hasFlag,
  loadRotation,
  parseArgs,
  saveRotation,
} from "./lib.mts";

async function main(): Promise<void> {
  const args = parseArgs();
  const key = assertSafeKey(getFlag(args, "key") ?? args.positionals[0] ?? "");
  if (!key) throw new Error("Usage: tsx scripts/hero-cars/remove-car.mts --key <active-key> [--delete-entry]");

  const rotation = await loadRotation();
  const before = activeRotation(rotation).map((car) => car.key);
  const index = rotation.findIndex((car) => car.key === key);
  if (index < 0) throw new Error(`${key} is not present in rotation.json.`);

  if (hasFlag(args, "delete-entry")) {
    rotation.splice(index, 1);
    console.log(`Removed ${key} from rotation.json. Image files and metadata were not deleted.`);
  } else {
    rotation[index] = { ...rotation[index], status: "inactive" };
    console.log(`Deactivated ${key} in rotation.json. Image files and metadata were not deleted.`);
  }

  const after = activeRotation(rotation).map((car) => car.key);
  if (after.length === 0) throw new Error(`Refusing to save: removing ${key} would leave an empty active rotation.`);
  await saveRotation(rotation);

  console.log(`Before: ${before.join(", ")}`);
  console.log(`After:  ${after.join(", ")}`);
  console.log("Run validate-rotation.mts and browser QA to confirm stale localStorage indexes are safe.");
}

main().catch(exitWithError);
