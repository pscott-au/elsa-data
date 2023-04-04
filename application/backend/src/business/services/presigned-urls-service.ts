import * as edgedb from "edgedb";
import { inject, injectAll, injectable } from "tsyringe";
import { ElsaSettings } from "../../config/elsa-settings";

export interface IPresignedUrlProvider {
  isEnabled: boolean;
  protocol: string;
  presign(
    releaseKey: string,
    bucket: string,
    key: string,
    auditId: string
  ): Promise<string>;
}

@injectable()
export class PresignedUrlsService {
  constructor(
    @inject("Database") protected readonly edgeDbClient: edgedb.Client,
    @inject("Settings") private readonly settings: ElsaSettings,
    @injectAll("IPresignedUrlProvider")
    private readonly presignedUrlsServices: IPresignedUrlProvider[]
  ) {}

  public get isEnabled(): boolean {
    return this.presignedUrlsServices.some((p) => p.isEnabled);
  }

  public async presign(
    releaseKey: string,
    protocol: string,
    bucket: string,
    key: string,
    auditId: string
  ): Promise<string> {
    for (const p of this.presignedUrlsServices)
      if (protocol === p.protocol)
        return p.presign(releaseKey, bucket, key, auditId);

    throw new Error(`Unhandled protocol ${protocol}`);
  }
}
