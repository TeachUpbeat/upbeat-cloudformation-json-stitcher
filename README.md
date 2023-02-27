# Upbeat CloudFormation JSON Stitcher

This utility scans the supplied directory for JSON files and builds a CloudFormation template with the logic described below.

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

The following command will combine files with paths that do not match the ":::" delimited regular expressions in the exclude list. This can be helpful if you only want to test certain resources in your stack.
```
node index.js --exclude "elastic-beanstalk:::rds:::Portal\\(?!Develop\\)" //this skips any files with elastic-beanstalk, rds, or Portal in their paths, with the exception of PortalDevelop, which would be included via the negative lookahead in the regex
```

The following command will include template version and description attributes on the generated template.
```
node index.js --format-version "2010-09-09" --description "my description here"
```

The following command will automatically bump a semver version at the specified JSON path with each stitch (we use this in concert with a "donothing" custom lambda resource to trigger builds in parent and all nested stacks when there's an update".
```
node index.js --semver "MyCustomResource.Properties.Version"
```
Note that the above mutates the source file before copying the template fragment to the output file.


For usage in a parent package, we'll typically add a script like that below to the package.json.
```
"scripts": {
    "stitch-regional-infrastructure": "node node_modules/upbeat-cloudformation-json-stitcher/index.js --description "Our Regional Infrastructure" --semver "Semver.Properties.Version" --source regional/templates --output-path regional/build --filename lower.template.json --exclude Portal\\(?!Develop\\):::SomeOtherFragmentToExclude.json"
    ...
}
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
For example, the following directory structure would generate the output below.
```
- s3
  -- MyS3Bucket.json
- r53
  -- domains
    --- MyR53Record.json

```

### Inputs ###

MyS3Bucket.json
```
{
  "Type": "AWS::S3::Bucket",
  "Properties": {
    "AccessControl": "Private",
    "BucketName": {
      "Fn::Sub": "upbeat-elastic-beanstalk-${AWS::Region}-${Stage}"
    },
    "OwnershipControls": {
      "Rules": [
        {
          "ObjectOwnership": "BucketOwnerEnforced"
        }
      ]
    }
  }
}
```

MyR53Record.json
```
{
  "Type": "AWS::Route53::RecordSet",
  "Properties": {
    "HostedZoneId": "some-zone-id",
    "Name": "some-source-url.com",
    "Type": "CNAME",
    "TTL": "60",
    "ResourceRecords": [
      "some-destination-url.com"
    ]
  }
}
```

### Output ###
```
{
	"Resources": {
		MyS3Bucket: {
		  "Type": "AWS::S3::Bucket",
		  "Properties": {
		    "AccessControl": "Private",
		    "BucketName": {
		      "Fn::Sub": "upbeat-elastic-beanstalk-${AWS::Region}-${Stage}"
		    },
		    "OwnershipControls": {
		      "Rules": [
		        {
		          "ObjectOwnership": "BucketOwnerEnforced"
		        }
		      ]
		    }
		  }			
		}
		MyR53Record: {
		  "Type": "AWS::Route53::RecordSet",
		  "Properties": {
		    "HostedZoneId": "some-zone-id",
		    "Name": "some-source-url.com",
		    "Type": "CNAME",
		    "TTL": "60",
		    "ResourceRecords": [
		      "some-destination-url.com"
		    ]
		  }
		}
	}
}
```