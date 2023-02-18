# Upbeat CloudFormation JSON Stitcher

This utility scans the supplied directory for JSON files and builds a CloudFormation template with the following logic described below.

## Usage
The following command will combine all files in the current directory into a template.json file also included in the current directory (not recommended).
```
node index.js
```

The following command will combine all files in the current directory into an output file at the specified location with the specified name.
```
node index.js --output-path "../some-other-directory" --filename "my-template.json"
```

The following command will combine all files in the specified directory into an output file at the specified location with the specified name.
```
node index.js --source "../some-other-location/cloud-formation/regional/templates" --output-path ".." --filename "my-template.json"
```

The following command will combine files with paths that do not match the ":::" delimited regular expressions in the exclude list. This can be helpful if you want only test certain resources in your stack.
```
node index.js --exclude "elastic-beanstalk:::rds:::^\d{4}-some-path-starting-with-four-numbers"
```

The following command will incldude template version and description attributes on the generated template.
```
node index.js --format-version "2010-09-09" --description "my description here"
```

## Configuration Mapping

Filenames that are found in the following list extend the like-named top level attributes in the template: 

```
Metadata.json
Parameters.json
Rules.json
Mappings.json
Conditions.json
Transform.json
Outputs.json
```

If multiple files for a given attribute are discovered in the recursive directory scan (e.g., multiple Parameters.json files), these will be combined into the final object output in the template.

The following attributes are populated only if specified in the supplied arguments:
```
AWSTemplateFormatVersion
Description
```
See examples above for reference.

## Resource Mapping
The filename (sans .json extension) is used as the resource name in the constructed template. (e.g., MyS3Bucket.json is mapped to Template.Resources.MyS3Bucket in the generated JSON template)

