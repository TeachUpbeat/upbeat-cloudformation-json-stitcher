# Upbeat CloudFormation JSON Stitcher

This utility scans the supplied directory for JSON files and builds a CloudFormation template with the following logic described below.

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
See examples below for reference.

## Resource Mapping
The filename (sans .json extension) is used as the resource name in the constructed template. (e.g., MyS3Bucket.json is mapped to Template.Resources.MyS3Bucket in the generated JSON template)

