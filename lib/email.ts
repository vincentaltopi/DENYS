import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "ssl0.ovh.net",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }
  return _transporter;
}

function getFromAddress(): string {
  return process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "";
}

function getBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

export async function sendProjectReadyEmail(params: {
  to: string;
  projectName: string;
  projectId: string;
}) {
  const { to, projectName, projectId } = params;
  const reviewUrl = `${getBaseUrl()}/projects/${projectId}/review`;

  try {
    await getTransporter().sendMail({
      from: getFromAddress(),
      to,
      subject: `Votre projet "${projectName}" est prêt`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #047857; margin: 0;">Denys</h2>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px;">
            <h3 style="color: #047857; margin-top: 0;">Traitement terminé</h3>
            <p style="color: #334155;">
              Le traitement de votre projet <strong>${projectName}</strong> est terminé.
              Vos résultats sont prêts à être consultés.
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${reviewUrl}"
                 style="display: inline-block; background: #047857; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500;">
                Consulter les résultats
              </a>
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
            Cet email a été envoyé automatiquement par Denys.
          </p>
        </div>
      `,
    });
    return { error: null };
  } catch (err) {
    console.error("[email] Failed to send project-ready email:", err);
    return { error: err };
  }
}

export async function sendProjectFailedEmail(params: {
  to: string;
  projectName: string;
  projectId: string;
  errorMessage?: string;
}) {
  const { to, projectName, projectId, errorMessage } = params;
  const projectsUrl = `${getBaseUrl()}/my-projects`;

  try {
    await getTransporter().sendMail({
      from: getFromAddress(),
      to,
      subject: `Erreur lors du traitement de "${projectName}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #047857; margin: 0;">Denys</h2>
          </div>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px;">
            <h3 style="color: #991b1b; margin-top: 0;">Échec du traitement</h3>
            <p style="color: #334155;">
              Le traitement de votre projet <strong>${projectName}</strong> a rencontré une erreur.
            </p>
            ${errorMessage ? `<p style="color: #64748b; font-size: 14px; background: #fff; border-radius: 6px; padding: 12px; border: 1px solid #e2e8f0;"><code>${errorMessage}</code></p>` : ""}
            <p style="color: #334155;">
              Vous pouvez réessayer en créant un nouveau projet ou contacter le support si le problème persiste.
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${projectsUrl}"
                 style="display: inline-block; background: #475569; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500;">
                Voir mes projets
              </a>
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
            Cet email a été envoyé automatiquement par Denys.
          </p>
        </div>
      `,
    });
    return { error: null };
  } catch (err) {
    console.error("[email] Failed to send project-failed email:", err);
    return { error: err };
  }
}
