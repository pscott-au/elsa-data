import * as edgedb from "edgedb";
import { container } from "tsyringe";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { CloudTrailClient } from "@aws-sdk/client-cloudtrail";

export function bootstrapDependencyInjection() {
  container.register<edgedb.Client>("Database", {
    useFactory: () => edgedb.createClient(),
  });

  // whilst it is possible to create these AWS clients close to where they are needed - it then becomes
  // hard to manage any global configuration (not that we have any global config though yet!)
  // so anyhow - the preferred mechanism for sourcing a AWS service client is by registering
  // it here and DI it

  // the assumption here is that AWS_REGION is set by our environment and hence does not need to be
  // provided here
  // in all deployed AWS this is true
  // for local dev we should set AWS_REGION explicitly when setting shell credentials (aws-vault etc)
  const awsClientConfig = {};

  container.register<S3Client>("S3Client", {
    useFactory: () => new S3Client(awsClientConfig),
  });

  container.register<CloudTrailClient>("CloudTrailClient", {
    useFactory: () => new CloudTrailClient(awsClientConfig),
  });

  container.register<CloudFormationClient>("CloudFormationClient", {
    useFactory: () => new CloudFormationClient(awsClientConfig),
  });
}