<?php
class Mailer
{
    public static function send(string $to, string $subject, string $body): bool
    {
        $logDir = dirname(__DIR__) . '/uploads';
        if (!is_dir($logDir))
            @mkdir($logDir, 0755, true);
        $logFile = $logDir . '/mail_log.log';

        // Extract domain from APP_URL for From header domain matching to satisfy SPF/DMARC
        $urlParts = parse_url(APP_URL);
        $host = $urlParts['host'] ?? 'mediak9.com';
        $hostParts = explode('.', $host);
        $domain = (count($hostParts) >= 2)
            ? ($hostParts[count($hostParts) - 2] . '.' . $hostParts[count($hostParts) - 1])
            : $host;
        $fromEmail = 'noreply@' . $domain;

        // Build headers — From must match your Hostinger sender domain to prevent spam
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . MAIL_FROM_NAME . " <" . $fromEmail . ">\r\n";
        $headers .= "Reply-To: " . MAIL_FROM . "\r\n";

        $wrappedBody = self::wrap($subject, $body);

        // Attempt to send via PHP mail() setting envelope sender (-f) to pass SPF alignment
        $success = @mail($to, $subject, $wrappedBody, $headers, "-f" . $fromEmail);

        // Capture any last PHP mail error
        $lastError = error_get_last();
        $errMsg = $success ? 'OK' : ('FAILED' . ($lastError ? ' | ' . $lastError['message'] : ''));

        $logEntry = '[' . date('Y-m-d H:i:s') . "] To: {$to} | Subject: {$subject} | From: " . $fromEmail . " | Reply-To: " . MAIL_FROM . " | Status: {$errMsg}\n";
        @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

        return $success;
    }

    private static function wrap(string $subject, string $body): string
    {
        $portalUrl = APP_URL;
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . htmlspecialchars($subject) . '</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f6f8fa;
            color: #24292e;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: none;
            -ms-text-size-adjust: none;
        }
        .email-wrapper {
            width: 100%;
            background-color: #f6f8fa;
            padding: 24px 0;
        }
        .email-content {
            max-width: 580px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e1e4e8;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .email-header-accent {
            height: 4px;
            background-color: #ff5a1f;
        }
        .email-header {
            padding: 24px 32px;
            background-color: #ffffff;
            border-bottom: 1px solid #f0f2f5;
        }
        .email-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            color: #24292e;
        }
        .email-header h2 span {
            color: #ff5a1f;
        }
        .email-body {
            padding: 32px;
            font-size: 15px;
            line-height: 1.6;
            color: #24292e;
        }
        .email-body p {
            margin: 0 0 16px 0;
        }
        .email-body p:last-child {
            margin-bottom: 0;
        }
        .email-body strong {
            color: #000000;
        }
        .code {
            display: inline-block;
            padding: 8px 20px;
            background: #f1f8ff;
            border: 1px solid #c8e1ff;
            border-radius: 6px;
            color: #0366d6;
            font-weight: 700;
            font-size: 20px;
            letter-spacing: 0.05em;
            margin: 14px 0;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #ff5a1f;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            margin: 16px 0;
            text-align: center;
        }
        .email-footer {
            background-color: #fafbfc;
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e1e4e8;
            font-size: 12px;
            color: #586069;
        }
        .footer-nav {
            margin-bottom: 12px;
            line-height: 1.8;
        }
        .footer-nav a {
            color: #ff5a1f;
            text-decoration: none;
            font-weight: 500;
            white-space: nowrap;
        }
        .footer-divider {
            color: #d1d5da;
            margin: 0 8px;
        }
        .copyright {
            font-size: 11px;
            color: #6a737d;
            line-height: 1.5;
            margin-top: 12px;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-content">
            <div class="email-header-accent"></div>
            <div class="email-header">
                <h2>Media<span>K9</span> BDM Portal</h2>
            </div>
            <div class="email-body">
                ' . $body . '
            </div>
            <div class="email-footer">
                <div class="footer-nav">
                    <a href="https://mediak9.com" target="_blank">Website</a>
                    <span class="footer-divider">|</span>
                    <a href="' . $portalUrl . '" target="_blank">Portal</a>
                </div>
                <div class="footer-nav" style="margin-top: 10px;">
                    <a href="https://www.linkedin.com/company/media-k9/" target="_blank">LinkedIn</a>
                    <span class="footer-divider">|</span>
                    <a href="https://www.instagram.com/mediak9official/" target="_blank">Instagram</a>
                    <span class="footer-divider">|</span>
                    <a href="https://www.facebook.com/share/1HwTDLMvt3/" target="_blank">Facebook</a>
                    <span class="footer-divider">|</span>
                    <a href="https://www.tiktok.com/@media_k9" target="_blank">TikTok</a>
                    <span class="footer-divider">|</span>
                    <a href="https://www.youtube.com/@mediak9" target="_blank">YouTube</a>
                </div>
                <div class="copyright">
                    &copy; ' . date('Y') . ' MediaK9. All rights reserved.<br>
                    Office # 16, Green Plaza, G-9 Markaz, Islamabad, Pakistan.
                </div>
            </div>
        </div>
    </div>
</body>
</html>';
    }

    public static function bdmApproved(string $to, string $name, string $code): bool
    {
        $loginUrl = APP_URL . '/login';
        $body = "<p>Hi <strong>{$name}</strong>,</p>
        <p>Congratulations! Your BDM application has been <strong>approved</strong> by the MediaK9 team.</p>
        <p>Your unique BDM Code is:</p>
        <div class='code'>{$code}</div>
        <p>Share this code with businesses that want to work with MediaK9. When they apply using your code, the project will automatically be linked to your dashboard.</p>
        <p><a href='{$loginUrl}' class='btn'>Login to Your Dashboard &rarr;</a></p>
        <p>Welcome to the MediaK9 Campus Partnership Program!</p>";
        return self::send($to, 'Your BDM Application is Approved - ' . $code, $body);
    }

    public static function bdmRejected(string $to, string $name, string $notes): bool
    {
        $body = "<p>Hi <strong>{$name}</strong>,</p>
        <p>Thank you for your interest in the MediaK9 Campus Partnership Program.</p>
        <p>After reviewing your application, we are unable to approve it at this time.</p>"
            . ($notes ? "<p><strong>Reason:</strong> {$notes}</p>" : "")
            . "<p>If you believe this is an error or would like to reapply, please contact us at <a href='mailto:" . MAIL_FROM . "' style='color:#FF6B2B'>" . MAIL_FROM . "</a>.</p>";
        return self::send($to, 'Update on Your BDM Application - MediaK9', $body);
    }

    public static function clientApproved(string $to, string $orgName): bool
    {
        $body = "<p>Dear <strong>{$orgName}</strong>,</p>
        <p>Great news! Your partnership application with <strong>MediaK9</strong> has been approved.</p>
        <p>Your project has been created and your assigned BDM will be in touch with you shortly to get started.</p>
        <p>We look forward to working with you!</p>";
        return self::send($to, 'Your Application is Approved - MediaK9', $body);
    }

    public static function clientRejected(string $to, string $orgName, string $notes): bool
    {
        $body = "<p>Dear <strong>{$orgName}</strong>,</p>
        <p>Thank you for your interest in partnering with MediaK9.</p>
        <p>We have reviewed your application and are unable to proceed at this time.</p>"
            . ($notes ? "<p><strong>Reason:</strong> {$notes}</p>" : "")
            . "<p>Feel free to reach out to us at <a href='mailto:" . MAIL_FROM . "' style='color:#FF6B2B'>" . MAIL_FROM . "</a> for further information.</p>";
        return self::send($to, 'Update on Your Application - MediaK9', $body);
    }

    public static function passwordReset(string $to, string $name, string $resetUrl): bool
    {
        $body = "<p>Hi <strong>{$name}</strong>,</p>
        <p>We received a request to reset the password for your MediaK9 BDM Portal account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <p style='margin:24px 0;'><a href='{$resetUrl}' class='btn'>Reset My Password &rarr;</a></p>
        <p style='font-size:12px;color:#5C564E;'>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        <p style='font-size:12px;color:#5C564E;'>Or copy this link into your browser:<br><span style='color:#FF6B2B;word-break:break-all;'>{$resetUrl}</span></p>";
        return self::send($to, 'Reset Your Password - MediaK9 BDM Portal', $body);
    }

    public static function newBDMApplication(string $to, string $applicantName, string $applicantEmail): bool
    {
        $body = "<p>A new BDM application has been submitted and requires your review.</p>
        <p><strong>Applicant:</strong> {$applicantName}<br>
        <strong>Email:</strong> {$applicantEmail}</p>
        <p>Please log in to the admin panel to review and approve or reject the application.</p>
        <p><a href='" . APP_URL . "/admin' class='btn'>Open Admin Panel &rarr;</a></p>";
        return self::send($to, 'New BDM Application - MediaK9 Portal', $body);
    }

    public static function sendOTP(string $to, string $name, string $otp): bool
    {
        $body = "<p>Hi <strong>{$name}</strong>,</p>
        <p>A login attempt was made to your MediaK9 BDM Portal account. Use the code below to complete your sign-in.</p>
        <p>Your one-time verification code:</p>
        <div class='code' style='font-size:2rem;letter-spacing:.25em;'>{$otp}</div>
        <p style='font-size:13px;color:#9A938A;'>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style='font-size:12px;color:#5C564E;'>If you did not attempt to log in, your password may be compromised. Please change it immediately.</p>";
        return self::send($to, 'Your MK9 Portal Login Code: ' . $otp, $body);
    }

    public static function newTicket(string $to, string $bdmName, string $subject, string $category): bool
    {
        $adminUrl = APP_URL . '/admin';
        $body = "<p>A new support ticket has been submitted and requires your attention.</p>
        <p><strong>From:</strong> {$bdmName}<br>
        <strong>Subject:</strong> {$subject}<br>
        <strong>Category:</strong> " . ucfirst($category) . "</p>
        <p><a href='{$adminUrl}' class='btn'>View in Admin Panel &rarr;</a></p>";
        return self::send($to, 'New Support Ticket: ' . $subject, $body);
    }

    public static function ticketReply(string $to, string $recipientName, string $subject, string $replyMessage, bool $fromBdm = false, string $senderName = ''): bool
    {
        $portalUrl = $fromBdm ? (APP_URL . '/admin') : (APP_URL . '/dashboard');
        $from = $fromBdm ? $senderName : 'The MediaK9 Support Team';
        $body = "<p>Hi <strong>{$recipientName}</strong>,</p>
        <p>There is a new reply on your support ticket: <strong>{$subject}</strong></p>
        <p><strong>From:</strong> {$from}</p>
        <div style='background:rgba(255,255,255,.05);border-left:3px solid #E8541C;padding:16px 20px;margin:16px 0;border-radius:4px;font-size:14px;color:#F5EDE0;'>{$replyMessage}</div>
        <p><a href='{$portalUrl}' class='btn'>View Ticket &rarr;</a></p>";
        return self::send($to, 'New Reply on Ticket: ' . $subject, $body);
    }

    public static function ticketClosed(string $to, string $name, string $subject): bool
    {
        $body = "<p>Hi <strong>{$name}</strong>,</p>
        <p>Your support ticket has been marked as <strong>Closed</strong> by the MediaK9 team.</p>
        <p><strong>Subject:</strong> {$subject}</p>
        <p>If you need further assistance, feel free to open a new ticket from your dashboard.</p>
        <p><a href='" . APP_URL . "/dashboard' class='btn'>Go to Dashboard &rarr;</a></p>";
        return self::send($to, 'Your Ticket Has Been Closed - MediaK9', $body);
    }

    public static function sendWelcomeEmail(string $to, string $name): bool
    {
        $body = "<p>Dear <strong>{$name}</strong>,</p>

        <p>Congratulations!</p>

        <p>We are pleased to inform you that your application for the <strong>Media K9 Campus Partnership Program</strong> has been approved.</p>

        <p>Your official partnership card is currently being prepared and will be sent to your registered address soon.</p>

        <p>In the meantime, you can log in to your BDM dashboard to:</p>
        <ul style='margin:12px 0 12px 20px;line-height:1.8;color:#9A938A;'>
          <li>View your unique BDM referral code</li>
          <li>Share it with potential clients</li>
          <li>Track your referred clients and projects</li>
        </ul>

        <p>Please note that your partnership card and welcome kit may take <strong>7–10 business days</strong> to arrive. Make sure your address on file is correct.</p>

        <p>If you have any questions, feel free to reach out to our team at <a href='mailto:" . MAIL_FROM . "' style='color:#FF6B2B;'>" . MAIL_FROM . "</a>.</p>

        <p>Welcome to the MediaK9 family — we look forward to growing together!</p>

        <p>Warm regards,<br>
        <strong>The MediaK9 Team</strong></p>";

        return self::send($to, 'Application Approved – Media K9 Campus Partnership Program', $body);
    }

    public static function sendCustomEmail(string $to, string $name, string $subject, string $message): bool
    {
        $body = "<p>Dear <strong>{$name}</strong>,</p>" . nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));
        return self::send($to, $subject, $body);
    }
}

