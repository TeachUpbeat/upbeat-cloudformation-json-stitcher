const { promisify } = require('util');
const { resolve, basename, path, extname, relative } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const output = { Resources: {}};
const argv = require('minimist')(process.argv.slice(2));

const source = argv["source"] ?? "./";
const destination = (argv["output-path"] ?? ".").replace(/\/$/g,"");
const filename = argv["filename"] ?? "template.json";
const exclusions = (argv["exclude"] ?? "").split(":::").filter(s => s.length);
const format = argv["format-version"];
const description = argv["description"];

if(format) output["AWSTemplateFormatVersion"] = format;
if(description) output.Description = description;

async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = resolve(dir, subdir);
    return (await stat(res)).isDirectory() ? getFiles(res) : res;
  }));
  return files.reduce((a, f) => a.concat(f), []);
}

function buildTemplate(files) {
	console.log("Stitching...");
	files.forEach(f => {
		const excluded = extname(f) !== ".json" || exclusions.some((e) => f.match(new RegExp(e,"gim")));
		const config = ["Metadata","Parameters","Rules","Mappings","Conditions","Transform","Outputs"];
		const filename = basename(f).replace(/\.json$/i,"");
		if(excluded) return;
		
		const content = JSON.parse(fs.readFileSync(f, "utf8"));

		if(config.indexOf(filename) !== -1) {
			output[filename] = output[filename] ?? {};
			Object.assign(output[filename], content);
			console.log(relative(source,f) + " => " + filename);
		} else {
			output.Resources[filename] = content;
			console.log(relative(source,f) + " => " + `Resources:${filename}`);
		}
	});

	fs.writeFileSync(`${destination}/${filename}`, JSON.stringify(output, null, 2),"utf8");
	console.log(`Template complete: ${destination}/${filename}`);
}

getFiles(source)
  .then(files => buildTemplate(files))
  .catch(e => console.error(e));