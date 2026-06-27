<?php
class BDMCode {
    public static function generate(): string {
        $max = (int) Database::scalar("SELECT COALESCE(MAX(counter), ?) FROM mk9_bdm_codes", [BDM_CODE_START - 1]);
        return BDM_CODE_PREFIX . ($max + 1);
    }

    public static function assign(int $userId): string {
        $code    = self::generate();
        $counter = (int) str_replace(BDM_CODE_PREFIX, '', $code);
        Database::insert('mk9_bdm_codes', [
            'bdm_user_id' => $userId,
            'code'        => $code,
            'counter'     => $counter,
            'status'      => 'active',
            'created_at'  => date('Y-m-d H:i:s'),
        ]);
        Database::update('mk9_bdm_profiles', ['bdm_code' => $code], ['user_id' => $userId]);
        return $code;
    }

    public static function validate(string $code): bool {
        $code = strtoupper(trim($code));
        // Normalize: strip prefix if present, then try both formats
        $bare = preg_replace('/^' . preg_quote(BDM_CODE_PREFIX, '/') . '/i', '', $code);
        $full = BDM_CODE_PREFIX . $bare;
        // Try full format first (e.g. MK9-101), then bare number (e.g. 101)
        return Database::row(
            "SELECT id FROM mk9_bdm_codes WHERE (code = ? OR code = ?) AND status = 'active'",
            [$full, $bare]
        ) !== null;
    }

    public static function getBdmUserIdByCode(string $code): ?int {
        $row = Database::row("SELECT bdm_user_id FROM mk9_bdm_codes WHERE code = ?", [strtoupper(trim($code))]);
        return $row ? (int) $row->bdm_user_id : null;
    }

    public static function getByUser(int $userId): ?string {
        $row = Database::row("SELECT code FROM mk9_bdm_codes WHERE bdm_user_id = ?", [$userId]);
        return $row?->code;
    }
}
