const { promisify } = require('util');
const { resolve, basename, path, extname, relative } = require('path');
const fs = require('fs');
const semver = require('semver');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const output = { Resources: {}};
const argv = require('minimist')(process.argv.slice(2));

const source = argv["source"] ?? "./";
const destination = (argv["output-path"] ?? ".").replace(/\/$/g,"");
const filename = argv["filename"] ?? "template.json";
const exclusions = (argv["exclude"] ?? "").split(":::").filter(s => s.length);
const transform = argv["transform"] ?? null;
const format = argv["format-version"];
const description = argv["description"];
const semversion = argv["semver"];
const randstring = !!argv["rand"];



if(format) output["AWSTemplateFormatVersion"] = format;
if(description) output.Description = description;
if(transform) output.Transform = transform;

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
		const excluded = extname(f) !== ".json" || exclusions.some((e) => relative(source,f).match(new RegExp(e,"gm")));
		const config = ["Metadata","Parameters","Rules","Mappings","Conditions","Transform","Outputs"];
		const filename = basename(f).replace(/\.json$/i,"");
		if(excluded) return;
		let content
		
		try {
			 content = JSON.parse(fs.readFileSync(f, "utf8"));
			 content = applySemver(filename, content, f);
		} catch (e) {
			throw new Error(`JSON parsing error stitching: ${relative(source,f)}`);
		}
		

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

function applySemver(filename, content, filepath) {
	if(!semversion) return content;
	const semfile = semversion.split(".")[0];
	const path = semversion.split(".").slice(1);
	if(filename !== semfile) return content;
	const value = path.reduce((p,c)=>p&&p[c]||null, content);
	const bumped = randstring ? rand(32) : semver.inc(value, "patch");
	const updated = setProperty(content,path.join("."),bumped);
	fs.writeFileSync(filepath, JSON.stringify(updated, null, 2));
	return updated;
}

function setProperty(obj,path,value) {
	const [head, ...rest] = path.split('.')
  return {
      ...obj, [head]: rest.length ? setProperty(obj[head], rest.join('.'), value) : value
  }
}

function rand(length) {
    let result = '';
    const characters = '@#$%^&*()-_+=/?;:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

getFiles(source)
  .then(files => buildTemplate(files))
  .catch(e => console.error(e));