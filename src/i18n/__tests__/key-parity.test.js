import en from "../locales/en.js";
import ko from "../locales/ko.js";
import es from "../locales/es.js";
import ar from "../locales/ar.js";
import tr from "../locales/tr.js";

function collectPaths(obj, prefix = "") {
  let paths = [];
  Object.keys(obj).forEach(key => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      paths = paths.concat(collectPaths(obj[key], path));
    } else {
      paths.push(path);
    }
  });
  return paths;
}

test("tr.js has exact key parity with en.js", () => {
  const enPaths = collectPaths(en).filter(p => !p.startsWith("meta."));
  const trPaths = collectPaths(tr).filter(p => !p.startsWith("meta."));
  const missingInTr = enPaths.filter(p => !trPaths.includes(p));
  const extraInTr = trPaths.filter(p => !enPaths.includes(p));
  if (missingInTr.length || extraInTr.length) {
    console.log("MISSING IN TR:", JSON.stringify(missingInTr, null, 2));
    console.log("EXTRA IN TR:", JSON.stringify(extraInTr, null, 2));
  }
  expect(missingInTr).toEqual([]);
  expect(extraInTr).toEqual([]);
});

test("all locales have key parity with en.js (sanity check on existing locales too)", () => {
  const enPaths = collectPaths(en).filter(p => !p.startsWith("meta.")).sort();
  [["ko", ko], ["es", es], ["ar", ar]].forEach(([name, dict]) => {
    const paths = collectPaths(dict).filter(p => !p.startsWith("meta.")).sort();
    expect({ locale: name, missing: enPaths.filter(p => !paths.includes(p)) }).toEqual({ locale: name, missing: [] });
  });
});
