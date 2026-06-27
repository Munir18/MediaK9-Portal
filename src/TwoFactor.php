<?php
/**
 * TwoFactor.php — Email OTP based 2FA for MK9 Portal
 * OTP is stored hashed in the session (no DB table needed).
 * Expires after 10 minutes.
 */
class TwoFactor {
    private const OTP_TTL     = 600;  // 10 minutes in seconds
    private const OTP_PENDING = 'mk9_2fa_pending';

    /** Generate a 6-digit OTP, store hashed in session, send via email */
    public static function send(int $userId, string $email, string $name): bool {
        $otp    = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiry = time() + self::OTP_TTL;

        $_SESSION[self::OTP_PENDING] = [
            'user_id' => $userId,
            'email'   => $email,
            'name'    => $name,
            'hash'    => password_hash($otp, PASSWORD_BCRYPT),
            'expiry'  => $expiry,
            'attempts'=> 0,
        ];

        return Mailer::sendOTP($email, $name, $otp);
    }

    /** Verify submitted OTP against session. Returns true on success. */
    public static function verify(string $submittedOtp): bool {
        $pending = $_SESSION[self::OTP_PENDING] ?? null;
        if (!$pending) return false;

        // Expired
        if (time() > $pending['expiry']) {
            unset($_SESSION[self::OTP_PENDING]);
            return false;
        }

        // Too many attempts (max 5)
        if ($pending['attempts'] >= 5) {
            unset($_SESSION[self::OTP_PENDING]);
            return false;
        }

        $_SESSION[self::OTP_PENDING]['attempts']++;

        if (!password_verify(trim($submittedOtp), $pending['hash'])) {
            return false;
        }

        // Success — clear pending OTP and return user info
        unset($_SESSION[self::OTP_PENDING]);
        return true;
    }

    /** Get pending 2FA user info (used to finalize login after OTP verified) */
    public static function getPendingUser(): ?array {
        return $_SESSION[self::OTP_PENDING] ?? null;
    }

    /** Check if there is an active pending 2FA session */
    public static function hasPending(): bool {
        $p = $_SESSION[self::OTP_PENDING] ?? null;
        return $p && time() <= $p['expiry'];
    }

    /** Abort / clear a pending 2FA session */
    public static function clear(): void {
        unset($_SESSION[self::OTP_PENDING]);
    }

    /** Remaining seconds until expiry */
    public static function remainingSeconds(): int {
        $p = $_SESSION[self::OTP_PENDING] ?? null;
        if (!$p) return 0;
        return max(0, $p['expiry'] - time());
    }
}
