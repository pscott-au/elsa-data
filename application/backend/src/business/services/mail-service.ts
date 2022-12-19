import { inject, injectable } from "tsyringe";
import { ElsaSettings } from "../../config/elsa-settings";
import { createTransport, Transporter } from "nodemailer";
import * as aws from "@aws-sdk/client-ses";
import Mail from "nodemailer/lib/mailer";

@injectable()
export class MailService {
  private transporter?: Transporter;

  constructor(
    @inject("Settings") private settings: ElsaSettings,
    @inject("SESClient") private ses: aws.SES
  ) {}

  /**
   * Setup the mail service.
   */
  public setup() {
    if (this.settings.mailer?.mode === "SES") {
      this.transporter = createTransport(
        {
          SES: { ses: this.ses, aws },
          maxConnections: this.settings.mailer.maxConnections,
          sendingRate: this.settings.mailer.sendingRate,
        },
        this.settings.mailer.defaults
      );
    } else if (this.settings.mailer?.mode === "SMTP") {
      this.transporter = createTransport(
        this.settings.mailer.options,
        this.settings.mailer.defaults
      );
    }

    this.transporter?.verify((error, _) => {
      if (error) {
        console.log(`Failed to setup mail server:\n  ${error}`);
      } else {
        console.log("Mail server ready");
      }
    });
  }

  /**
   * Send email.
   */
  public async sendMail(mail: Mail.Options): Promise<any> {
    return await this.transporter?.sendMail(mail);
  }
}