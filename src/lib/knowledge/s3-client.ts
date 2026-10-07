import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

import type { ObjectBytesClient } from "./s3-storage";

export type AwsS3ClientOptions = {
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
};

/**
 * Client config for the AWS SDK.
 * Credentials are omitted so the SDK uses its default provider chain.
 * The returned object has no ACL and no presigner.
 */
export function awsS3ClientConfig(options: AwsS3ClientOptions): S3ClientConfig {
  const config: S3ClientConfig = { region: options.region };
  if (options.endpoint) config.endpoint = options.endpoint;
  if (options.forcePathStyle) config.forcePathStyle = true;
  return config;
}

/** Object put input. ACL, grants, and public URLs are intentionally absent. */
export function privatePutObjectInput(bucket: string, key: string, bytes: Buffer) {
  return {
    Bucket: bucket,
    Key: key,
    Body: bytes,
  };
}

class AwsSdkObjectClient implements ObjectBytesClient {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async putObject(key: string, bytes: Buffer) {
    await this.client.send(
      new PutObjectCommand(privatePutObjectInput(this.bucket, key, bytes)),
    );
  }

  async getObject(key: string) {
    const output = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!output.Body || typeof output.Body.transformToByteArray !== "function") {
      throw Object.assign(new Error("empty storage object"), { name: "EmptyStorageObject" });
    }
    return Buffer.from(await output.Body.transformToByteArray());
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async headObject(key: string) {
    await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export function createAwsObjectClient(options: AwsS3ClientOptions): {
  objects: ObjectBytesClient;
  close: () => void;
} {
  if (typeof window !== "undefined") {
    throw new Error("S3 storage is server-only");
  }
  const client = new S3Client(awsS3ClientConfig(options));
  return {
    objects: new AwsSdkObjectClient(client, options.bucket),
    close: () => client.destroy(),
  };
}
